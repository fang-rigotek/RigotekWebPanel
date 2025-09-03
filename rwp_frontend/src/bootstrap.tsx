// rwp_frontend/src/bootstrap.tsx
// 应用引导入口

import { render } from 'preact';
import { initDB, db, userStorageKey, STORE_PREFS, PREFS_KEY, STORE_STATES, STATES_KEY } from './core/db';
import { loadWasm } from './core/wasm';
import { initI18n, loadI18nPkg, commonI18n, i18nPkg, type Lang } from './i18n';
import { applyTheme, type Theme } from './style/theme';
import { loadIcon, type Icon } from './components';

type BootPrefs = {
  theme?: Theme;
  lang?: Lang;
};

// 读取用户偏好缓存
async function readBootPrefs(): Promise<BootPrefs> {
  if (!db) return {};

  const tx = db.transaction([STORE_STATES, STORE_PREFS], "readonly");
  const statesStore = tx.objectStore(STORE_STATES);
  const prefsStore = tx.objectStore(STORE_PREFS);

  // 1) 必须有最后登录用户 id
  const uid = (await statesStore.get(STATES_KEY.LAST_LOGIN_UID)) as string | undefined;
  if (!uid) {
    await tx.done;
    return {};
  }

  // 2) 用组合 key 查 prefs
  const [theme, lang] = await Promise.all([
    prefsStore.get(userStorageKey(uid, PREFS_KEY.THEME)),
    prefsStore.get(userStorageKey(uid, PREFS_KEY.LANG)),
  ]);

  await tx.done;
  return {
    theme: theme as Theme | undefined,
    lang: lang as Lang | undefined,
  };
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
  const cached = db && await db.get(STORE_STATES, STATES_KEY.COMPAT);
  if (cached === true) return true;

  const { isBrowserCompatible } = await import("./utils/browser-compat");
  const compat = await isBrowserCompatible();

  if (compat && db) {
    await db.put(STORE_STATES, true, STATES_KEY.COMPAT);
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
