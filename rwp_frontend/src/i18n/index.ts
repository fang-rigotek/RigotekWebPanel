// src/i18n/index.ts

/** 当前支持的语言列表 */
const SUPPORTED_LANGS = ['zh-CN', 'en-US'] as const;

/** 支持的语言类型 */
export type Lang = typeof SUPPORTED_LANGS[number];

/** 默认语言 */
const DEFAULT_LANG: Lang = 'en-US';

/** 判断给定值是否为受支持的语言 */
export function isSupportedLang(lang: string): lang is Lang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

/** 根据前缀匹配 */
export function matchLangPrefix(lang: string): Lang | null {
  const base = lang.toLowerCase().split('-')[0];
  for (const supported of SUPPORTED_LANGS) {
    if (supported.toLowerCase().startsWith(base)) {
      return supported;
    }
  }
  return null;
}

/**
 * 选择语言：缓存优先，其次浏览器语言（仅支持列表内/前缀可映射），最后默认
 */
export function selectLang(lang: Lang | undefined): Lang {
  // 1) 缓存优先
  if (lang && isSupportedLang(lang)) {
    return lang;
  }

  // 2) 浏览器语言次之（SSR 环境无 navigator 时跳过）
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || ''];

    for (const raw of langs) {
      if (!raw) continue;

      // 2.1 精确匹配（完整代码，如 "zh-CN" / "en-US"）
      if (isSupportedLang(raw)) {
        return raw as Lang;
      }

      // 2.2 前缀匹配映射（如 "zh-TW" → "zh-CN", "en-GB" → "en-US"）
      const fallback = matchLangPrefix(raw);
      if (fallback) {
        return fallback;
      }
    }
  }

  // 3) 兜底默认
  return DEFAULT_LANG;
}
