// src/authGate.tsx
// 登录门禁逻辑骨架

import { context } from './context';
import { db, genUserKey, USER_STORE, CONTEXT_STORE } from './core/db';
import { DeviceToken, genDeviceFingerprint, UserToken } from '@/security/auth'
import { decryptMessageFromJson, EncryptedMessage, encryptMessageToJson, initSessionCrypto, isConnSecure, setIsConnSecure } from './security/session';

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

// 只保留键值对中有数据的值
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
  CONNECTION_INSECURE = 1 << 8, // 服务器判定连接不安全

  // 预留位：1 << 9 ~ 1 << 14
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

enum LoginMsgType {
  AUTO = 1,           // 自动登录（明文）
  AUTO_ENCRYPTED = 2, // 自动登录（加密）
  MANUAL = 3,         // 手动登录（明文）
  MANUAL_ENCRYPTED = 4, // 手动登录（加密）
}

interface LoginRequestMsg {
  type: LoginMsgType;
  msg: LoginData | EncryptedMessage;
  timestamp: number;   // 客户端发起时间 (Unix 时间戳)
}

// 判别联合：响应消息
type LoginResponseMsg =
  | { type: LoginMsgType.AUTO; msg: LoginResponse }
  | { type: LoginMsgType.AUTO_ENCRYPTED; msg: EncryptedMessage };

// 小工具：位标志判断
const hasFlag = (code: number, flag: number) => (code & flag) !== 0;

// 小工具：安全 JSON 解析
function safeParseJSON<T>(text: string): T | null {
  try { return JSON.parse(text) as T; } catch { return null; }
}

// 构造请求（封装 isConnSecure 分支）
async function buildLoginRequestMsg(data: LoginData): Promise<LoginRequestMsg> {
  const timestamp = Date.now();
  if (isConnSecure) {
    return { type: LoginMsgType.AUTO, msg: data, timestamp };
  }
  return {
    type: LoginMsgType.AUTO_ENCRYPTED,
    msg: await encryptMessageToJson(JSON.stringify(cleanData(data))),
    timestamp,
  };
}

// 解包响应（封装解密 + 解析）
async function decodeLoginResponseMsg(respMsg: LoginResponseMsg): Promise<LoginResponse> {
  switch (respMsg.type) {
    case LoginMsgType.AUTO:
      return respMsg.msg;
    case LoginMsgType.AUTO_ENCRYPTED: {
      const plaintext = await decryptMessageFromJson(respMsg.msg);
      const parsed = safeParseJSON<LoginResponse>(plaintext);
      if (!parsed) throw new Error("Invalid JSON in encrypted response");
      return parsed;
    }
  }
}

async function autoLogin(_retried = false): Promise<boolean> {
  // 这里你变更为要求 db 存在才进行自动登录；如果希望「即使没有 db 也能登录成功」，
  // 可以把这一行挪到写入设备信息前的分支里。
  if (!db) return false;

  const data = await loadAutoLoginData();
  if (!data) return false;

  try {
    // 10 秒超时，避免网络悬挂
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const loginRequest = await buildLoginRequestMsg(data);

    const resp = await fetch("/auth/auto-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // credentials: "include", // 若用 Cookie 会话，别忘加上
      signal: controller.signal,
      body: JSON.stringify(loginRequest),
    });

    clearTimeout(timer);

    if (!resp.ok) {
      console.error("autoLogin failed:", resp.status, resp.statusText);
      loginStatus = LoginStatusFlags.NETWORK_ERROR;
      return false;
    }

    // 防御：确保是 JSON
    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.error("autoLogin invalid content-type:", contentType);
      loginStatus = LoginStatusFlags.NETWORK_ERROR;
      return false;
    }

    const respMsg: LoginResponseMsg = await resp.json();
    const result = await decodeLoginResponseMsg(respMsg);

    // 记录状态码
    loginStatus = result.code;

    if (hasFlag(result.code, LoginStatusFlags.SUCCESS)) {
      // 写回本地（你此处已确保 db 存在）
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

    // 设备 token 失效：清一次重试一次
    if (hasFlag(result.code, LoginStatusFlags.DEVICE_TOKEN_INVALID) && !_retried) {
      await db.delete(CONTEXT_STORE.NAME, CONTEXT_STORE.KEY.DEVICE_TOKEN);
      return autoLogin(true);
    }

    // 服务器判定连接不安全：降级到加密重试一次
    if (hasFlag(result.code, LoginStatusFlags.CONNECTION_INSECURE) && !_retried) {
      setIsConnSecure(false);
      await initSessionCrypto();
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