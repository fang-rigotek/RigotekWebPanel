// rwp_frontend/src/bootstrap.tsx
// 应用引导入口
import { render } from 'preact';
import { context } from './context';
import { initDB, db, genUserKey, PREFS_STORE, CONTEXT_STORE } from './core/db';
import { initI18n, loadI18nPkg, commonI18n, i18nPkg, type Lang } from './i18n';
import { applyTheme, type Theme } from './style/theme';
import { type Icon } from './components';
import { loadWasm, getWasm } from './core/wasm';
import { iconLoadingLoop, iconAlertCircle } from './components/icons/common';


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

/** 渲染状态页 */
async function renderSplash(
  text: string,
  IconComponent?: Icon,
  paragraph?: string,
): Promise<void> {
  const Splash = () => (
    <div className="status-page">
      <div className="status-content">
        <div className="status-header">
          {IconComponent && (
            <div className="status-icon">
              <IconComponent className="icon" />
            </div>
          )}
          <div className="status-title">
            <h5>{text}</h5>
          </div>
        </div>
        {paragraph && (
          <div className="status-paragraph">
            <p>{paragraph}</p>
          </div>
        )}
      </div>
    </div>
  );
  render(<Splash />, document.getElementById("root")!);
  const delay = new Promise(r => setTimeout(r, 500));
  await delay;
}

/** 局部刷新状态页 */
async function updateSplash({
  text,
  IconComponent,
  paragraph,
}: {
  text?: string;
  IconComponent?: Icon;
  paragraph?: string;
}): Promise<void> {
  const root = document.getElementById("root")!;
  const statusContent = root.querySelector(".status-content") as HTMLElement;
  const statusHeader = root.querySelector(".status-header") as HTMLElement;

  // 以 header 的位置作为基准，解决垂直居中时看不到位移的问题
  const firstHeaderTop = statusHeader.getBoundingClientRect().top;

  // —— 更新标题 —— //
  if (text !== undefined) {
    const h5 = root.querySelector(".status-title h5") as HTMLHeadingElement;
    h5.textContent = text;
  }

  // —— 更新/插入图标 —— //
  if (IconComponent !== undefined) {
    let iconContainer = root.querySelector(".status-icon") as HTMLElement | null;
    if (!iconContainer) {
      iconContainer = document.createElement("div");
      iconContainer.className = "status-icon";
      statusHeader.insertBefore(iconContainer, statusHeader.firstChild);
    }
    iconContainer.innerHTML = "";
    render(<IconComponent className="icon" />, iconContainer);
  }

  // —— 更新/插入段落（首次插入时做渐入） —— //
  if (paragraph !== undefined) {
    let paragraphContainer = root.querySelector(".status-paragraph") as HTMLElement | null;
    const isNew = !paragraphContainer;

    if (!paragraphContainer) {
      paragraphContainer = document.createElement("div");
      paragraphContainer.className = "status-paragraph";
      statusContent.appendChild(paragraphContainer);

      // 渐入准备：初始无动画地设为透明
      paragraphContainer.style.transition = "none";
      paragraphContainer.style.opacity = "0";
    }

    let p = paragraphContainer.querySelector("p") as HTMLParagraphElement | null;
    if (!p) {
      p = document.createElement("p");
      paragraphContainer.appendChild(p);
    }
    p.textContent = paragraph;

    if (isNew) {
      // 让初始透明状态生效
      void paragraphContainer.offsetHeight;
      // 恢复到使用样式表中的 transition，并启动渐入
      paragraphContainer.style.transition = "";
      paragraphContainer.style.opacity = "1";
    }
  }

  // —— 纵向位移动画：用 header 的位移差平移整个 status-content —— //
  const lastHeaderTop = statusHeader.getBoundingClientRect().top;
  const dy = firstHeaderTop - lastHeaderTop;

  if (Math.abs(dy) > 0.5) {
    const prevInlineTransition = statusContent.style.transition;
    statusContent.style.transition = "none";
    statusContent.style.transform = `translateY(${dy}px)`;
    void statusContent.offsetHeight;
    requestAnimationFrame(() => {
      statusContent.style.transition = prevInlineTransition || ""; // 使用全局的 transition: all 0.5s ease
      statusContent.style.transform = "translateY(0)";
    });
  }
  const delay = new Promise(r => setTimeout(r, 500));
  await delay;
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
  const dbPromise = initDB();

  await dbPromise;
  const prefs = await readBootPrefs();

  const themePromise = applyTheme(prefs.theme);

  const loadingPromise = (async () => {
    await themePromise;

    await renderSplash(
      'Loading...',
      iconLoadingLoop,
    );
  })();

  const i18nPromise = initI18n(prefs.lang);

  loadWasm('rwp_engine')
  const compatOk = await isBrowserCompatible();
  await i18nPromise;

  if (!compatOk) {
    await loadI18nPkg('notifications');
    await loadingPromise;
    await updateSplash({
      text: i18nPkg.notifications.browserOutdated,
      IconComponent: iconAlertCircle,
      paragraph: i18nPkg.notifications.wasm2Req
    });
    return false;
  }

  await loadingPromise;
  return true;
}
