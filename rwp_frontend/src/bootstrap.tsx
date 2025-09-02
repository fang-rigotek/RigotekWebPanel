// rwp_frontend/src/bootstrap.tsx
// 应用引导入口

import { render } from 'preact';
import { initDB, db, STORE_PREFS, PREFS_THEME, PREFS_LANG, STORE_STATES, STATES_COMPAT } from './runtime/db';
import { loadWasm } from './runtime/wasm';
import { initI18n, loadI18nPkg, commonI18n, i18nPkg, type Lang } from './i18n';
import { applyTheme, type Theme } from './style/theme';
import { loadIcon, type Icon } from './components';

type BootPrefs = {
  theme?: Theme;
  lang?: Lang;
};

// 读取用户偏好缓存
export async function readBootPrefs(): Promise<BootPrefs> {
  if (!db) return {};

  const [theme, lang] = await Promise.all([
    db.get(STORE_PREFS, PREFS_THEME),
    db.get(STORE_PREFS, PREFS_LANG),
  ]);

  return { theme: theme as Theme | undefined, lang: lang as Lang | undefined };
}

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
  const cached = db && await db.get(STORE_STATES, STATES_COMPAT);
  if (cached === true) return true;

  const { isBrowserCompatible } = await import("./utils/browser-compat");
  const compat = await isBrowserCompatible();

  if (compat && db) {
    await db.put(STORE_STATES, true, STATES_COMPAT);
  }
  return compat;
}


// ===== 启动引导函数 =====
export async function bootstrap(): Promise<boolean> {
  const dbPromise = initDB();
  const iconPromise = loadIcon('LoadingLoop');

  await dbPromise;
  const prefs = await readBootPrefs();
  const i18nPromise = initI18n(prefs.lang);
  const themePromise = applyTheme(prefs.theme);

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
