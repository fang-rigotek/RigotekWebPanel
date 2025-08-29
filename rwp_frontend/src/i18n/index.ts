// src/i18n/index.ts

/** 当前支持的语言列表 */
export const SUPPORTED_LANGS = ['zh-CN', 'en-US'] as const;

/** 支持的语言类型 */
export type Lang = typeof SUPPORTED_LANGS[number];

/** 默认语言 */
export const DEFAULT_LANG: Lang = 'en-US';

/** 判断给定值是否为受支持的语言 */
export function isSupportedLang(lang: string): lang is Lang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}
