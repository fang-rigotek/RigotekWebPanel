// rwp_frontend/src/bootstrap.tsx
// 应用引导入口

import { render } from 'preact';
import { localStorageUsable, COMPAT_CACHE_KEY } from './runtime/env';
import { loadWasm } from './runtime/wasm';
import { readBootPrefs } from './prefs';
import { initI18n, loadI18nPkg, commonI18n, i18nPkg } from './i18n';
import { applyTheme } from './style/theme';
import { loadIcon, type Icon } from './components';

/** 渲染状态页 */
async function renderSplash(IconComponent: Icon, text: string): Promise<void> {
  const Splash = () => (
    <div class="status-page">
      <div class="status-content">
        <IconComponent />
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

// ===== 启动引导函数 =====
export async function bootstrap(): Promise<boolean> {
  const prefs = readBootPrefs();
  const i18nPromise = initI18n(prefs.lang);
  const themePromise = applyTheme(prefs.theme);
  const iconPromise = loadIcon('LoadingLoop');

  const loadingPromise = (async () => {
    await i18nPromise;
    await themePromise;
    await renderSplash(
      await iconPromise,
      commonI18n.loading
    );
  })();

  const compatOk = await checkCompatibility();
  if (!compatOk) {
    await loadI18nPkg('notifications');
    await renderSplash(await loadIcon('AlertCircle'), i18nPkg.notifications.browserTooOld);
    return false;
  }

  loadWasm('rwp_engine')
  await loadingPromise;
  return true;
}
