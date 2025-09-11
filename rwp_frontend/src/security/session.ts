// src/security/session.ts
import { db, CONTEXT_STORE } from "@/core/db";
import { toB64Url, fromB64Url, randomBytes } from "@/utils/crypto";

// === 加载时一次性判断是否安全连接（保留原样） ===
export const isConnSecure = ((): boolean => {
  // 1) https 一票通过
  if (window.location.protocol === "https:") return true;

  const host = window.location.hostname.toLowerCase();

  // 2) 回环地址
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;

  // 3) IPv4 内网地址（顺序：192 → 172 → 10）
  const parts = host.split(".");
  if (parts.length === 4) {
    const [a, b] = parts.map(x => Number(x));
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 10) return true;
  }

  // 4) IPv6 ULA fc00::/7 (fcxx:... or fdxx:...)
  if (host.startsWith("fc") || host.startsWith("fd")) return true;

  // 5) IPv6 链路本地 fe80::/10 (fe8x/fe9x/feax/febx)
  if (
    host.startsWith("fe8") ||
    host.startsWith("fe9") ||
    host.startsWith("fea") ||
    host.startsWith("feb")
  ) {
    return true;
  }

  // 其它一律不安全
  return false;
})();

let sessionAesKey: CryptoKey | null = null;
let sessionInitPromise: Promise<void> | null = null;

// 从 IDB 读取服务器公钥；没有就走网络获取并导入；有 IDB 才写回缓存
async function getServerPubkey(): Promise<CryptoKey> {
  // 1) 尝试 IDB 缓存
  if (db) {
    const cached: CryptoKey | undefined = await db.get(
      CONTEXT_STORE.NAME,
      CONTEXT_STORE.KEY.SERVER_PUBKEY
    );
    if (cached) return cached;
  }

  // 2) 网络获取（约定返回 { pubkey: base64url(SPKI) }）
  const resp = await fetch("/api/public-key");
  if (!resp.ok) throw new Error("Failed to fetch server public key");

  const { pubkey } = await resp.json();
  if (typeof pubkey !== "string" || !pubkey) {
    throw new Error("Invalid server public key payload");
  }

  // 3) 导入为 CryptoKey
  const spkiDer: ArrayBuffer = fromB64Url(pubkey);
  const imported = await crypto.subtle.importKey(
    "spki",
    spkiDer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  // 4) 有 IDB 才写回缓存
  if (db) {
    await db.put(CONTEXT_STORE.NAME, imported, CONTEXT_STORE.KEY.SERVER_PUBKEY);
  }

  return imported;
}

// 真正做 ECDH + HKDF → 派生 AES 会话密钥
async function deriveSessionKey(): Promise<void> {
  if (sessionAesKey) return;

  const serverPubkey = await getServerPubkey();
  const clientKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits", "deriveKey"]
  );

  // 导出客户端公钥，上行到服务器
  const raw = await crypto.subtle.exportKey("raw", clientKeyPair.publicKey);
  await fetch("/api/key-exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_pub: toB64Url(raw),
      cnonce: toB64Url(randomBytes(16)), 
    }),
  });

  // derive shared secret → AES key
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: serverPubkey },
    clientKeyPair.privateKey,
    256
  );
  const hkdfBaseKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
  sessionAesKey = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: randomBytes(32), info: new TextEncoder().encode("session") },
    hkdfBaseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// 外部调用入口
export function initSessionCrypto(): Promise<void> {
  if (isConnSecure) return Promise.resolve();
  if (!sessionInitPromise) {
    sessionInitPromise = deriveSessionKey().catch(err => {
      sessionInitPromise = null;
      throw err;
    });
  }
  return sessionInitPromise;
}

// 加密消息 → JSON
export async function encryptMessageToJson(plaintext: string | Uint8Array) {
  await initSessionCrypto();
  if (!sessionAesKey) throw new Error("Session key not ready");

  // 1) 统一把明文转成 ArrayBuffer
  const ptBuf: ArrayBuffer =
    typeof plaintext === "string"
      ? new TextEncoder().encode(plaintext).buffer   // 字符串 → Uint8Array → ArrayBuffer
      : plaintext.slice().buffer;                    // 传入的是 Uint8Array 时，用 slice() 拿干净的 ArrayBuffer

  // 2) IV 建议配合你把 randomBytes 改成返回 ArrayBuffer（若它已是 ArrayBuffer，这里无需改）
  const iv = randomBytes(12); // ArrayBuffer（推荐 randomBytes 返回 ArrayBuffer）

  // 3) 调用 encrypt：传入 ArrayBuffer，TS 就不会报错
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    sessionAesKey,
    ptBuf
  );

  // 4) 返回时，toB64Url 支持 ArrayBuffer 或 Uint8Array，直接用即可
  return {
    iv: toB64Url(iv),
    ct: toB64Url(ctBuf),
  };

}
