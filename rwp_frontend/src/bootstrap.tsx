// rwp_frontend/src/bootstrap.tsx
// 应用引导入口

import { context } from '@/context';
import { initDB, db, genUserKey, PREFS_STORE, CONTEXT_STORE } from '@/core/db';
import { applyTheme, type Theme } from '@/style/theme';
import { iconLoadingLoop, iconAlertCircle } from '@/components/icons/common';
import { renderStatusPage, updateStatusPage } from '@/pages/status-page';
import { initI18n, loadI18nPkg, i18nPkg, type Lang } from '@/i18n';
import { loadWasm, getWasm } from '@/core/wasm';
import { initSessionCrypto } from '@/security/session';

type BootPrefs = {
  theme?: Theme;
  lang?: Lang;
};

// 读取用户偏好缓存
async function readBootPrefs(): Promise<BootPrefs> {
  if (!db) return {};
  try {
    const tx = db.transaction([CONTEXT_STORE.NAME, PREFS_STORE.NAME], "readonly");
    const contextStore = tx.objectStore(CONTEXT_STORE.NAME);

    const uid = (await contextStore.get(CONTEXT_STORE.KEY.LAST_LOGIN_UID)) as string | undefined;
    if (!uid) {
      await tx.done;
      return {};
    }
    context.setLastLogin(uid);

    const prefsStore = tx.objectStore(PREFS_STORE.NAME);
    const [theme, lang] = await Promise.all([
      prefsStore.get(genUserKey(uid, PREFS_STORE.KEY.THEME)),
      prefsStore.get(genUserKey(uid, PREFS_STORE.KEY.LANG)),
    ]);

    await tx.done;
    return {
      theme: theme as Theme | undefined,
      lang: lang as Lang | undefined,
    };
  } catch (err) {
    console.error("Failed to read boot prefs:", err);
    return {};
  }
}

/** wasm模块兼容检测 */
async function isBrowserCompatible(): Promise<boolean> {
  if (
    db &&
    await db.get(CONTEXT_STORE.NAME, CONTEXT_STORE.KEY.COMPAT).catch(e => {
      console.error("Compatibility read failed:", e);
    })
  ) {
    return true;
  }

  try {
    const engine = await getWasm("rwp_engine");
    const result = engine.check_wasm_feature();

    if (db) {
      try {
        await db.put(CONTEXT_STORE.NAME, result, CONTEXT_STORE.KEY.COMPAT);
      } catch (err) {
        console.warn("Failed to persist compat check:", err);
      }
    }

    return result;
  } catch (e) {
    console.error("WASM feature check failed:", e);
    return false;
  }
}


// ===== 启动引导函数 =====
export async function bootstrap(): Promise<boolean> {
  await initDB();

  const prefs = await readBootPrefs();
  await applyTheme(prefs.theme);

  context.setUiRenderPromise(
    renderStatusPage('Loading...', iconLoadingLoop)
  )
  const i18nPromise = initI18n(prefs.lang);

  loadWasm('rwp_engine')
  const compatOk = await isBrowserCompatible();
  await i18nPromise;

  if (!compatOk) {
    await loadI18nPkg('notifications');
    context.setUiRenderPromise(
      updateStatusPage({
        text: i18nPkg.notifications.browserOutdated,
        IconComponent: iconAlertCircle,
        paragraph: i18nPkg.notifications.wasm2Req
      })
    )
    return false;
  }

  initSessionCrypto()
  return true;
}
