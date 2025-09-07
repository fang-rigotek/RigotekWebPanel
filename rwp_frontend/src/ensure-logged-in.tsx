// src/authGate.tsx
// 登录门禁逻辑骨架

import { UserToken, DeviceToken, context } from './context';
import { db, genUserKey, USER_STORE, CONTEXT_STORE } from './core/db';
import { toBase64Url, getDeviceSeed } from './utils/crypto';

declare const APP_ID: string;
declare const APP_VERSION: string;

/** 生成设备指纹（最小可用集 + WebCrypto SHA-256 -> base64url） */
async function genDeviceFingerprint(): Promise<string> {
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

export interface LoginData {
  // 自动登录用（任选其一组）
  userId?: string;
  userToken?: string;

  // 手动登录用（任选其一组）
  username?: string;
  password?: string;

  // 公共复用
  deviceId?: string;
  deviceToken?: string;
  deviceFingerprint?: string;
}

async function loadAutoLoginData(): Promise<LoginData | false> {
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

enum LoginStatusFlags {
  SUCCESS = 1 << 0, // 登录成功
  USER_ID_NOT_FOUND = 1 << 1, // 用户ID不存在（自动登录场景）
  USERNAME_NOT_FOUND = 1 << 2, // 用户名不存在（手动登录场景）
  PASSWORD_INCORRECT = 1 << 3, // 密码错误（手动登录场景）
  USER_TOKEN_INVALID = 1 << 4, // 用户TOKEN无效（自动登录场景）
  DEVICE_TOKEN_INVALID = 1 << 5, // 设备TOKEN无效（自动登录场景）
  LOGIN_ATTEMPTS_EXCEEDED = 1 << 6, // 超出当日登录失败次数限制
  IP_CHANGED = 1 << 7, // 用户IP地址发生变化（自动登录场景）

  // 预留位：1 << 8 ~ 1 << 14
  NETWORK_ERROR = 1 << 14, // 网络/HTTP 错误
  CLIENT_ERROR = 1 << 15, // 前端程序错误
}

interface LoginResponse {
  code: LoginStatusFlags; //登录结果
  user?: {
    id?: string; // 自动登录时通过id登录，无需返回id
    name?: string;  // 手动登录时通过用户名登录，无需返回用户名
    token?: UserToken; // 自动登录时通过token登录，无需返回Token
  };
  deviceId?: string; // 发送新deviceFingerprint时才返回
  deviceToken?: DeviceToken; // 发送新deviceFingerprint时才返回
}

let loginStatus: LoginStatusFlags | undefined;

async function autoLogin(_retried = false): Promise<boolean> {
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
      loginStatus = LoginStatusFlags.NETWORK_ERROR;
      return false;
    }

    const result: LoginResponse = await resp.json();
    loginStatus = result.code; // 无论成功失败都先记录

    if ((result.code & LoginStatusFlags.SUCCESS) !== 0) {
      if (!db) return true;

      const tx = db.transaction([CONTEXT_STORE.NAME], "readwrite");
      const store = tx.objectStore(CONTEXT_STORE.NAME);

      if (result.deviceId) {
        await store.put(result.deviceId, CONTEXT_STORE.KEY.DEVICE_ID);
      }
      if (result.deviceToken) {
        await store.put(result.deviceToken, CONTEXT_STORE.KEY.DEVICE_TOKEN);
      }

      await tx.done;
      return true;
    }

    if (
      ((result.code & LoginStatusFlags.DEVICE_TOKEN_INVALID) !== 0) &&
      db &&
      !_retried
    ) {
      await db.delete(CONTEXT_STORE.NAME, CONTEXT_STORE.KEY.DEVICE_TOKEN);
      return autoLogin(true);
    }

    return false;

  } catch (err) {
    console.error("autoLogin error:", err);
    loginStatus = LoginStatusFlags.CLIENT_ERROR;
    return false;
  }
}

async function manualLogin() {
  // 加载初始登录页

  // 开始循环
  // 等待用户点登录按钮后发LoginData
  // 登录成功则结束循环
  // 登录失败则根据失败原因，局部刷新提示语。
  // .. 下一次循环等待用户点登录按钮后发LoginData
}

export async function ensureLoggedIn(): Promise<void> {
  if (await autoLogin()) return;
  await manualLogin();
}