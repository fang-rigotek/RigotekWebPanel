// src/prefs/index.ts
import type { Lang } from '../i18n';
import type { Theme } from '../style/theme';

/** 启动阶段的基础偏好（用于快速决定主题与语言） */
export interface BootPrefs {
  theme?: Theme;
  lang?: Lang;
}

/** 本地存储键：启动阶段基础偏好 */
export const BOOT_PREFS_KEY = 'rwp_boot_prefs';
