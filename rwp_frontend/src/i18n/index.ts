// src/i18n/index.ts

/** 当前支持的语言列表 */
export const SUPPORTED_LANGS = ['zh-CN', 'en-US'] as const;

/** 默认语言 */
export const DEFAULT_LANG = 'en-US';

/** 判断给定值是否为受支持的语言 */
export function isSupportedLang(lang: string): boolean {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}
