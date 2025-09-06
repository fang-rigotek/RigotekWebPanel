// src/authGate.tsx
// 登录门禁逻辑骨架

import { UserToken, DeviceToken, context } from './context';
import { db, genUserKey, USER_STORE, CONTEXT_STORE } from './core/db';

interface AutoLoginData {
  userId: string;
  userToken: string;
  deviceId?: string;
  deviceToken?: string;
  deviceFingerprint?: string;
}

function toBase64Url(bytes: Uint8Array): string {
  try {
    const b64 = btoa(String.fromCharCode(...bytes));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (err) {
    console.error("toBase64Url error:", err);
    return "";
  }
}


function makeRandomSeed(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function getDeviceSeed(): Promise<string> {
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

declare const APP_ID: string;
declare const APP_VERSION: string;

/** 生成设备指纹（最小可用集 + WebCrypto SHA-256 -> base64url） */
export async function genDeviceFingerprint(): Promise<string> {
  try {
    const deviceSeed = await getDeviceSeed();
    if (!deviceSeed) return "";

    // 采集最小可用集（带兜底，做必要的分桶/截断）
    let primaryLanguage = "na";
    let timeZone = "na";
    try {
      primaryLanguage = navigator.language ?? "na";
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "na";
    } catch (e) {
      console.error("fingerprint: language/timeZone error:", e);
    }

    let sw = -1, sh = -1, colorDepth = -1, dpr = 1;
    try {
      sw = Number.isFinite(screen?.width) ? screen.width : -1;
      sh = Number.isFinite(screen?.height) ? screen.height : -1;
      colorDepth = Number.isFinite(screen?.colorDepth) ? screen.colorDepth : -1;
      const dprRaw = typeof window.devicePixelRatio === "number" ? window.devicePixelRatio : 1;
      dpr = Math.round(dprRaw * 100) / 100; // 保留 2 位
    } catch (e) {
      console.error("fingerprint: screen/dpr error:", e);
    }

    let cores = 0, memBucket = "≤4", touchBucket = "0";
    try {
      const hc = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 0;
      cores = Math.min(hc, 16); // 截断 ≤16

      const dm = (navigator as any).deviceMemory;
      const mem = typeof dm === "number" ? dm : 0;
      memBucket = mem <= 4 ? "≤4" : mem <= 8 ? "6–8" : mem <= 16 ? "12–16" : ">16";

      const mtp = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;
      touchBucket = mtp === 0 ? "0" : (mtp === 1 ? "1" : "2+");
    } catch (e) {
      console.error("fingerprint: hardware/touch error:", e);
    }

    // 固定顺序串联（k=v 按行拼接）
    const canonical = [
      `appId=${APP_ID}`,
      `appVersion=${APP_VERSION}`,
      `seed=${deviceSeed}`,
      `lang=${primaryLanguage}`,
      `tz=${timeZone}`,
      `sw=${sw}`,
      `sh=${sh}`,
      `cd=${colorDepth}`,
      `dpr=${dpr}`,
      `hc=${cores}`,
      `mem=${memBucket}`,
      `touch=${touchBucket}`,
    ].join("\n");

    // WebCrypto SHA-256
    if (!("crypto" in window) || !("subtle" in crypto)) {
      console.error("genDeviceFingerprint error: WebCrypto SubtleCrypto unavailable");
      return "";
    }
    const data = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest("SHA-256", data);

    // 输出 base64url
    return toBase64Url(new Uint8Array(digest));
  } catch (err) {
    console.error("genDeviceFingerprint error:", err);
    return "";
  }
}


async function loadAutoLoginData(): Promise<AutoLoginData | false> {
  try {
    if (!db) return false;
    if (!context.lastLogin) return false;

    const tx = db.transaction([USER_STORE.NAME, CONTEXT_STORE.NAME], "readwrite");

    // 读取用户令牌
    const usersStore = tx.objectStore(USER_STORE.NAME);
    const userTokenKey = genUserKey(context.lastLogin, USER_STORE.KEY.USER_TOKEN);
    const userToken = await usersStore.get(userTokenKey) as UserToken | undefined;

    if (!userToken) {
      await tx.done;
      return false;
    }

    if (Date.now() >= userToken.expiresAt) {
      await usersStore.delete(userTokenKey);
      await tx.done;
      return false;
    }

    // 读取设备信息
    const contextStore = tx.objectStore(CONTEXT_STORE.NAME);
    const deviceId = await contextStore.get(CONTEXT_STORE.KEY.DEVICE_ID) as string | undefined;

    let deviceToken: DeviceToken | undefined = undefined;
    if (deviceId) {
      deviceToken = await contextStore.get(CONTEXT_STORE.KEY.DEVICE_TOKEN) as DeviceToken | undefined;
      if (deviceToken && Date.now() >= deviceToken.expiresAt) {
        await contextStore.delete(CONTEXT_STORE.KEY.DEVICE_TOKEN);
        deviceToken = undefined;
      }
    }

    await tx.done;

    let deviceFingerprint: string | undefined;
    if (!deviceId || !deviceToken) {
      deviceFingerprint = await genDeviceFingerprint();
    }

    return {
      userId: context.lastLogin,
      userToken: userToken.token,
      deviceId,
      deviceToken: deviceToken?.token,
      deviceFingerprint,
    };
  } catch (err) {
    console.error("loadAutoLoginData error:", err);
    return false;
  }
}

function cleanData<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") {
      (result as any)[k] = v;
    }
  }
  return result;
}


async function autoLogin(): Promise<boolean> {
  if (!context.isSecure) return false;

  const data = await loadAutoLoginData();
  if (!data) return false;

  try {
    const resp = await fetch("/auth/auto-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanData(data)),
    });
    
    if (!resp.ok) {
      console.error("autoLogin failed:", resp.status, resp.statusText);
      return false;
    }

    const result = await resp.json();
    // TODO: 根据后端返回的 result 做进一步处理（比如更新 context、缓存新的 token）
    console.log("autoLogin success:", result);

    return true;
  } catch (err) {
    console.error("autoLogin error:", err);
    return false;
  }
}

export async function ensureLoggedIn() {

}