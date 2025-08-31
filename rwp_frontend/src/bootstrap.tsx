// rwp_frontend/src/bootstrap.tsx
// 应用引导入口

import { render } from 'preact';
import { localStorageUsable, COMPAT_CACHE_KEY } from './runtime/env';
import { loadWasm } from './runtime/wasm';
import { readBootPrefs } from './prefs';
import { initI18n, loadI18nPkg, commonI18n, i18nPkg } from './i18n';
import { applyTheme } from './style/theme';
import LoadingLoop from './components/icons/LoadingLoop';

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

  const i18nPromise = initI18n(prefs.lang);
  applyTheme(prefs.theme)

  await i18nPromise;
  renderLoadingSplash(commonI18n.loading);

  loadWasm('rwp_engine')
  const compatOk = await checkCompatibility();
  if (!compatOk) {
    await loadI18nPkg('notifications');
    await renderAlertSplash(i18nPkg.notifications.browserTooOld);
    return;
  }

  // Step 8+：交棒至统一门禁（保持当前 Loading 直至新页面准备好）
  const { startAuthGate } = await import('./authGate');
  startAuthGate(document.getElementById('root')!);
})();
