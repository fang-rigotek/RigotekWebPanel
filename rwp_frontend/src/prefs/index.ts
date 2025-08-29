// src/prefs/index.ts
import type { Lang } from '../i18n';

/** 当前支持的主题列表（同时用于生成类型） */
export const SUPPORTED_THEMES = ['light', 'dark'] as const;

/** 主题类型（自动从 SUPPORTED_THEMES 推导） */
export type Theme = typeof SUPPORTED_THEMES[number];

/** 判断是否为支持的主题 */
export function isSupportedTheme(theme: string): theme is Theme {
  return (SUPPORTED_THEMES as readonly string[]).includes(theme);
}

/** 启动阶段的基础偏好（用于快速决定主题与语言） */
export interface BootPrefs {
  theme?: Theme;
  lang?: Lang;
}

/** 本地存储键：启动阶段基础偏好 */
export const BOOT_PREFS_KEY = 'rwp_boot_prefs';
