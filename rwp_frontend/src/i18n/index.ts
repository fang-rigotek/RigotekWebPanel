// src/i18n/index.ts

/** 当前支持的语言列表 */
const SUPPORTED_LANGS = ['zh-CN', 'en-US'] as const;
export type Lang = typeof SUPPORTED_LANGS[number];

const DEFAULT_LANG: Lang = 'en-US';
export let currentLang: Lang = DEFAULT_LANG;
export let commonI18n: Record<string, string> = {};
export let i18nPkg: Record<string, Record<string, string>> = {};

/** 判断给定值是否为受支持的语言 */
function isSupportedLang(lang: string): lang is Lang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

/** 根据前缀匹配 */
function matchLangPrefix(lang: string): Lang | null {
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
 * 说明：不再返回值，直接修改全局 currentLang
 */
function selectLang(lang: Lang | undefined): void {
  // 1) 缓存优先
  if (lang && isSupportedLang(lang)) {
    currentLang = lang;
    return;
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
        currentLang = raw as Lang;
        return;
      }

      // 2.2 前缀匹配映射（如 "zh-TW" → "zh-CN", "en-GB" → "en-US"）
      const fallback = matchLangPrefix(raw);
      if (fallback) {
        currentLang = fallback;
        return;
      }
    }
  }
}

/**
 * 初始化加载：按给定语言加载 common，并设置全局 currentLang
 * 用法参考：
 *   selectLang(prefs.lang); // 或直接 initI18n(prefs.lang)
 *   await initI18n(prefs.lang);
 */
export async function initI18n(lang: Lang | undefined) {
  selectLang(lang);

  if (currentLang !== DEFAULT_LANG) {
    document.documentElement.lang = currentLang;
  }

  const mod = await import(`./${currentLang}/common`);
  commonI18n = mod.default;
}


/**
 * 按需懒加载：基于当前语言加载指定包（如 'notifications'）
 *   await loadI18nPkg('notifications');
 */
export async function loadI18nPkg(pkg: string): Promise<void> {
  if (i18nPkg[pkg]) {
    return;
  }
  const mod = await import(`./${currentLang}/${pkg}`);
  i18nPkg[pkg] = mod.default;
}
/**
 * 卸载已加载的语言包（从缓存中移除，不影响 common）
 */
export function unloadI18nPkg(pkg: string) {
  if (i18nPkg[pkg]) {
    delete i18nPkg[pkg];
  }
}