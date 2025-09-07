// src/utils/crypto.ts

import { db, CONTEXT_STORE } from '../core/db';

export function toBase64Url(bytes: Uint8Array): string {
    try {
        const b64 = btoa(String.fromCharCode(...bytes));
        return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (err) {
        console.error("toBase64Url error:", err);
        return "";
    }
}

export function makeRandomSeed(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
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