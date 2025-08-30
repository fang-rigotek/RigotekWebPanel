// src/env/index.ts

/** 检测 localStorage 是否可用 */
function detectLocalStorageUsable(): boolean {
  try {
    const k = '__rwp_ls_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** 全局复用的能力快照 */
export const localStorageUsable = detectLocalStorageUsable();

/** 兼容性检测缓存 Key */
export const COMPAT_CACHE_KEY = 'rwp_compat_ok';