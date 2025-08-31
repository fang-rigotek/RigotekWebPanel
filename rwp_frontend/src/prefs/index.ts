// src/prefs/index.ts

import { localStorageUsable } from '../runtime/env';
import type { Lang } from '../i18n';
import type { Theme } from '../style/theme';

// 本地存储键
const BOOT_PREFS_KEY = 'rwp_boot_prefs';

export interface BootPrefs {
  theme?: Theme;
  lang?: Lang;
}

// 从 localStorage 读取启动偏好（主题/语言
export function readBootPrefs(): BootPrefs {
  if (!localStorageUsable) return {};
  try {
    const raw = localStorage.getItem(BOOT_PREFS_KEY);
    return raw ? (JSON.parse(raw) as BootPrefs) : {};
  } catch {
    return {};
  }
}