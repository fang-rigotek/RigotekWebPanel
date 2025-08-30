// rwp_frontend/src/utils/browser-compat.ts
// 检测浏览器是否兼容当前前端应用（先版本检查，再按需加载 wasm 做特征兜底）
import { localStorageUsable, COMPAT_CACHE_KEY } from '../env';

/**
 * 获取浏览器的类型和版本号（检测顺序：Chrome → Safari → Firefox）
 */
function getBrowserInfo(): { name: string; version: number } {
  const ua = navigator.userAgent;

  // Chrome / Edge (Chromium 内核)
  const chromeMatch = ua.match(/Chrome\/(\d+(\.\d+)?)/);
  if (chromeMatch) {
    return { name: "Chrome", version: parseFloat(chromeMatch[1]) };
  }

  // Safari
  const safariMatch = ua.match(/Version\/(\d+(\.\d+)?)/);
  if (safariMatch && /Safari/.test(ua)) {
    return { name: "Safari", version: parseFloat(safariMatch[1]) };
  }

  // Firefox
  const firefoxMatch = ua.match(/Firefox\/(\d+(\.\d+)?)/);
  if (firefoxMatch) {
    return { name: "Firefox", version: parseFloat(firefoxMatch[1]) };
  }

  return { name: "Unknown", version: 0 };
}

/**
 * 检查浏览器版本是否满足最低要求（Chrome/Edge ≥91，Safari ≥16.4，Firefox ≥89）
 */
function isVersionSupported(): boolean {
  const { name, version } = getBrowserInfo();

  if (name === "Chrome") return version >= 91;
  if (name === "Safari") return version >= 16.4;
  if (name === "Firefox") return version >= 89;

  return false;
}

/**
 * 按需加载 wasm 并做特征检测兜底（仅在版本不满足时才下载 wasm）
 */
async function wasmFallbackCheck(): Promise<boolean> {
  try {
    const mod = await import("@wasm/wasm_feature_check/pkg");
    await mod.default(); // init()
    return mod.check_wasm_feature();
  } catch (e) {
    console.error("WASM feature check failed:", e);
    return false;
  }
}

/**
 * 外部调用入口：检测浏览器是否兼容前端应用（先版本，失败再 wasm 兜底）
 * 成功会负责把结果写入缓存（true），失败不写入。
 */
export async function isBrowserCompatible(): Promise<boolean> {
  if (isVersionSupported()) {
    if (localStorageUsable) {
      try {
        localStorage.setItem(COMPAT_CACHE_KEY, 'true');
      } catch {
        /* ignore */
      }
    }
    return true;
  }

  const ok = await wasmFallbackCheck();
  if (ok && localStorageUsable) {
    try {
      localStorage.setItem(COMPAT_CACHE_KEY, 'true');
    } catch {
      /* ignore */
    }
  }
  return ok;
}
