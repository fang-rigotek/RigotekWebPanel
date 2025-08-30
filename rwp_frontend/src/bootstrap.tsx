// rwp_frontend/src/bootstrap.tsx
// 应用引导入口

import { render } from 'preact';
import { localStorageUsable, COMPAT_CACHE_KEY } from './env';
import { BOOT_PREFS_KEY, type BootPrefs } from './prefs';
import { DEFAULT_LANG, isSupportedLang, matchLangPrefix, type Lang } from './i18n';
import { loadPageStylesheet } from './style/loader';
import { isSupportedTheme } from './style/theme';
import LoadingLoop from './components/icons/LoadingLoop';

/** 从 localStorage 读取启动偏好（主题/语言） */
function readBootPrefs(): BootPrefs {
  if (!localStorageUsable) return {};
  try {
    const raw = localStorage.getItem(BOOT_PREFS_KEY);
    return raw ? (JSON.parse(raw) as BootPrefs) : {};
  } catch {
    return {};
  }
}

/** 应用主题：仅在缓存为受支持主题时强制覆盖 */
function applyTheme(prefs: BootPrefs): void {
  if (prefs.theme && isSupportedTheme(prefs.theme)) {
    document.body.setAttribute('data-theme', prefs.theme);
  }
}

/**
 * 选择语言：缓存优先，其次浏览器语言（仅支持列表内/前缀可映射），最后默认
 */
export function selectLang(prefs: BootPrefs): Lang {
  // 1) 缓存优先
  if (prefs.lang && isSupportedLang(prefs.lang)) {
    return prefs.lang;
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

/** 应用 <html lang>：英文保持默认“en”，其它语言显式设置 */
function applyHtmlLang(lang: Lang): void {
  if (lang !== 'en-US') document.documentElement.lang = lang;
}

/** 懒加载本页 i18n 文案（语言保证合法） */
async function loadI18nBootstrap(lang: Lang): Promise<Record<string, string>> {
  const mod = await import(`./i18n/${lang}/bootstrap.ts`);
  return (mod.default as Record<string, string>) ?? {};
}

/** 渲染 Loading 状态页（同步，仅加载 Loading 图标） */
function renderLoadingSplash(text: string): void {
  const Splash = () => (
    <div class="status-page">
      <div class="status-content">
        <LoadingLoop />
        <span>{text}</span>
      </div>
    </div>
  );
  render(<Splash />, document.getElementById('root')!);
}

/** 渲染 Alert 状态页（按需动态加载 Alert 图标） */
async function renderAlertSplash(text: string): Promise<void> {
  const { default: AlertCircle } = await import('./components/icons/AlertCircle');
  const Splash = () => (
    <div class="status-page">
      <div class="status-content">
        <AlertCircle />
        <span>{text}</span>
      </div>
    </div>
  );
  render(<Splash />, document.getElementById('root')!);
}

/** 浏览器兼容检测 */
async function checkCompatibility(): Promise<boolean> {
  if (localStorageUsable) {
    try {
      const cached = localStorage.getItem(COMPAT_CACHE_KEY);
      if (cached === 'true') return true;
    } catch {
      /* ignore */
    }
  }
  const { isBrowserCompatible } = await import('./utils/browser-compat');
  return await isBrowserCompatible();
}

// ===== 启动引导（Step 1~7）=====
(async function bootstrap() {
  const prefs = readBootPrefs();
  applyTheme(prefs);

  const lang = selectLang(prefs);
  applyHtmlLang(lang);

  try {
    await loadPageStylesheet('/styles/status-page.css');
  } catch (err) {
    console.error('[bootstrap] failed to load status-page.css:', err);
  }

  const i18n = await loadI18nBootstrap(lang);
  renderLoadingSplash(i18n.loading);

  const compatOk = await checkCompatibility();
  if (!compatOk) {
    await renderAlertSplash(i18n.browserTooOld);
    return;
  }

  // Step 8+：交棒至统一门禁（保持当前 Loading 直至新页面准备好）
  const { startAuthGate } = await import('./authGate');
  startAuthGate(document.getElementById('root')!, lang);
})();
