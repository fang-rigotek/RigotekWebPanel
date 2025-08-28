// rwp_frontend/src/utils/browser-compat.ts
// 检测浏览器是否兼容当前前端应用（版本检查 + wasm 特征检测兜底）

import init, { check_wasm_feature } from "@wasm/wasm_feature_check/pkg/wasm_feature_check.js";

/**
 * 获取浏览器的类型和版本号
 */
function getBrowserInfo(): { name: string; version: number } {
  const ua = navigator.userAgent;

  if (/Chrome/.test(ua)) {
    const match = ua.match(/Chrome\/(\d+(\.\d+)?)/);
    return { name: "Chrome", version: match ? parseFloat(match[1]) : 0 };
  }

  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    const match = ua.match(/Version\/(\d+(\.\d+)?)/);
    return { name: "Safari", version: match ? parseFloat(match[1]) : 0 };
  }

  if (/Firefox/.test(ua)) {
    const match = ua.match(/Firefox\/(\d+(\.\d+)?)/);
    return { name: "Firefox", version: match ? parseFloat(match[1]) : 0 };
  }

  return { name: "Unknown", version: 0 };
}

/**
 * 检查浏览器版本是否满足最低要求
 */
function isVersionSupported(): boolean {
  const { name, version } = getBrowserInfo();

  if (name === "Chrome") return version >= 91;
  if (name === "Safari") return version >= 16.4;
  if (name === "Firefox") return version >= 89;

  return false;
}

/**
 * 调用 wasm 模块做特征检测兜底
 */
async function wasmFallbackCheck(): Promise<boolean> {
  try {
    await init();
    return check_wasm_feature();
  } catch (e) {
    console.error("wasm feature check failed:", e);
    return false;
  }
}

/**
 * 外部调用入口：检测浏览器是否兼容前端应用
 */
export async function isBrowserCompatible(): Promise<boolean> {
  if (isVersionSupported()) {
    return true;
  }
  return await wasmFallbackCheck();
}
