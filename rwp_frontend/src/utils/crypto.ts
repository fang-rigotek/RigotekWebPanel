// src/utils/crypto.ts

import { CONTEXT_STORE, db } from "@/core/db";

// base64url 编码（去掉 =，替换 +/ 为 -_）
export function toB64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// base64url 解码为 ArrayBuffer
export function fromB64Url(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

// 安全随机字节（IV/nonce/salt）
export function randomBytes(len: number): ArrayBuffer {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a.buffer;
}

function makeRandomSeed(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return toB64Url(bytes);
}

export async function getDeviceSeed(): Promise<string> {
  try {
    // 如果 db 不存在，直接生成随机种子（不存储）
    if (!db) {
      return makeRandomSeed();
    }

    // 有 db，则走读写流程
    const tx = db.transaction(CONTEXT_STORE.NAME, "readwrite");
    const store = tx.objectStore(CONTEXT_STORE.NAME);

    let seed = await store.get(CONTEXT_STORE.KEY.DEVICE_SEED) as string | undefined;
    if (seed) {
      await tx.done;
      return seed;
    }

    // 没有则生成 + 存入
    seed = makeRandomSeed();
    await store.put(seed, CONTEXT_STORE.KEY.DEVICE_SEED);
    await tx.done;
    return seed;
  } catch (err) {
    console.error("getDeviceSeed error:", err);
    // 兜底：至少生成一个临时随机值返回（不存储）
    return makeRandomSeed();
  }
}