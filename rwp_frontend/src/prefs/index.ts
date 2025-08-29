// src/prefs/index.ts
// 启动阶段用到的基础偏好类型与常量（仅定义，不含读写逻辑）

import type { Lang } from '../i18n';

/** 主题类型（仅启动阶段使用） */
export type Theme = 'light' | 'dark';

/** 启动阶段的基础偏好（用于快速决定主题与语言） */
export interface BootPrefs {
  theme?: Theme;
  lang?: Lang;
}

/** 本地存储键：启动阶段基础偏好 */
export const BOOT_PREFS_KEY = 'rwp_boot_prefs';
