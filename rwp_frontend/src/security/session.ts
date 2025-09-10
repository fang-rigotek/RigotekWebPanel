// src/security/session.ts
import { db, CONTEXT_STORE } from "@/core/db";
import { toB64Url, fromB64Url, randomBytes } from "@/utils/crypto";


// === 你已有：加载时一次性判断是否安全连接（保留原样） ===
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

// ========== 内部工具（与 WebCrypto 强相关，仅此文件使用） ==========

// 从 IDB 获取或远端获取并缓存服务器公钥（ECDH / P-256 / SPKI）
async function getOrFetchServerPubkey(): Promise<CryptoKey> {
  let serverPubkey: CryptoKey | undefined;

  // 1) 先尝试本地 IDB（要求外部有 db & CONTEXT_STORE 常量）
  if (db) {
    serverPubkey = await db.get(CONTEXT_STORE.NAME, CONTEXT_STORE.KEY.SERVER_PUBKEY);
    if (serverPubkey) return serverPubkey;
  }

  // 2) 没有则从服务器获取（返回 { pubkey: base64url(SPKI) }）
  const resp = await fetch("/api/key-exchange");
  if (!resp.ok) throw new Error("Failed to fetch server public key");

  const { pubkey } = await resp.json();
  if (!pubkey || typeof pubkey !== "string") {
    throw new Error("Invalid server public key payload");
  }

  // 3) 导入为 CryptoKey（ECDH / P-256 / spki）
  const spkiDer = fromB64Url(pubkey).buffer;
  const imported = await crypto.subtle.importKey(
    "spki",
    spkiDer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  // 4) 写回 IDB，便于下次直接复用
  if (db) {
    await db.put(CONTEXT_STORE.NAME, imported, CONTEXT_STORE.KEY.SERVER_PUBKEY);
  }

  return imported;
}

// ====== 最小化会话加密状态（仅内存）======
let sessionAesKey: CryptoKey | null = null;

// ====== 最小化：建立会话密钥（ECDH→HKDF→AES-GCM）======
async function initSessionCrypto(): Promise<boolean> {
  // https/内网则不自建加密
  if (isConnSecure) return false;
  if (sessionAesKey) return true;

  // 1) 服务器 ECDH 公钥（IDB 优先，无则网络获取并缓存）——已在 getOrFetchServerPubkey 中实现
  const serverPub = await getOrFetchServerPubkey();

  // 2) 生成客户端临时 ECDH(P-256) 密钥对（为能导出公钥，这里直接写死 extractable: true）
  const clientEcdhKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits", "deriveKey"]
  );

  // 3) 最小化上行：仅发 客户端公钥(RAW) + 客户端随机数
  const raw = await crypto.subtle.exportKey("raw", clientEcdhKeyPair.publicKey);
  const clientPubRaw = new Uint8Array(raw);
  const cnonce = randomBytes(16);

  await fetch("/api/key-exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // 后端用 HttpOnly Cookie 识别会话
    body: JSON.stringify({
      client_pub: toB64Url(clientPubRaw),
      cnonce: toB64Url(cnonce), // 客户端一次性随机数
    }),
  }).then(r => {
    if (!r.ok) throw new Error("Key exchange init request failed");
  });

  // 4) 本地 ECDH 导出共享秘密（客户端私钥 × 服务器公钥）
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: serverPub },
    clientEcdhKeyPair.privateKey,
    256
  );

  // 5) HKDF-SHA256 → AES-GCM 会话密钥（最小化：salt 用随机，info 用短常量）
  const salt = randomBytes(32);
  const info = new TextEncoder().encode("kdf");
  const hkdfBaseKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
  sessionAesKey = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info },
    hkdfBaseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return true;
}

// 放在文件顶部：单例 Promise，用于跟踪一次性的会话密钥初始化
let sessionInitPromise: Promise<boolean> | null = null;

// 提供一个轻量入口：外部或别处调用它即可触发/复用初始化
function ensureSessionCryptoInit(): Promise<boolean> {
  // 已有初始化在进行/完成 → 直接复用
  if (sessionInitPromise) return sessionInitPromise;

  // 首次触发初始化（调用你已有的 initSessionCrypto）
  sessionInitPromise = initSessionCrypto()
    .catch((err) => {
      // 失败时清空，便于下次重试
      sessionInitPromise = null;
      throw err;
    });

  return sessionInitPromise;
}

// ====== 最小化：加密消息（输出可发送 JSON，仅含 iv/ct）======
export async function encryptMessageToJson(plaintext: string | Uint8Array) {
  // 确保会话密钥已初始化（并发场景只会初始化一次）
  await ensureSessionCryptoInit();

  if (!sessionAesKey) throw new Error("Session key not established");

  const pt = typeof plaintext === "string" ? new TextEncoder().encode(plaintext) : plaintext;
  const iv = randomBytes(12); // GCM 12 字节 IV

  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    sessionAesKey,
    pt
  );

  return {
    iv: toB64Url(iv),
    ct: toB64Url(ctBuf), // 已包含 GCM 的 authTag
  };
}
