// rwp_frontend/src/bootstrap.tsx
// 应用引导入口

import { render } from 'preact';
import { localStorageUsable, COMPAT_CACHE_KEY } from './env';
import { readBootPrefs } from './prefs';
import { selectLang, type Lang } from './i18n';
import { isSupportedTheme } from './style/theme';
import LoadingLoop from './components/icons/LoadingLoop';

/** 按需加载本页 i18n 文案 */
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

  /** 应用主题：仅在缓存为受支持主题时覆盖 */
  if (prefs.theme && isSupportedTheme(prefs.theme)) {
    document.body.setAttribute('data-theme', prefs.theme);
  }

  const lang = selectLang(prefs.lang);
  if (lang !== 'en-US') document.documentElement.lang = lang;

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
