// rwp_frontend/src/bootstrap.tsx
// 应用引导入口

import { render } from 'preact';
import { LoadingLoop, AlertCircle } from './components/icons';
import { getItem, setItem } from './utils/storage';
import { ensureStylesheet } from './utils/resource-loader';
import { isSupportedLang, DEFAULT_LANG } from './i18n';

type Theme = 'light' | 'dark';
interface UserPrefs { theme?: Theme; lang?: string }

const PREFS_KEY = 'rwp_prefs';
const COMPAT_CACHE_KEY = 'rwp_compat_ok';

/** 检测 localStorage 是否可用（导出供后续复用） */
function detectLocalStorageUsable(): boolean {
  try {
    const k = '__rwp_ls_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch { return false }
}
export const localStorageUsable = detectLocalStorageUsable();

/** 读取用户偏好（主题+语言共用一个 key，读取失败返回空对象） */
function readUserPrefs(): UserPrefs {
  if (!localStorageUsable) return {};
  const res = getItem<UserPrefs>(PREFS_KEY);
  return (res.ok && res.value && typeof res.value === 'object') ? res.value : {};
}

/** 应用主题：缓存优先，否则跟随系统；不写回缓存 */
function applyTheme(prefs: UserPrefs): Theme {
  const cached = prefs.theme;
  const theme: Theme = (cached === 'light' || cached === 'dark')
    ? cached
    : (matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.body.setAttribute('data-theme', theme);
  return theme;
}

/** 选择语言：缓存优先；否则 zh→zh-CN，其它→en-US（仅用字符串，运行时校验） */
function selectLang(prefs: UserPrefs): string {
  const cached = prefs.lang;
  if (cached && isSupportedLang(cached)) return cached;
  const nav = (navigator.language || navigator.languages?.[0] || '').toLowerCase();
  return nav.startsWith('zh') ? 'zh-CN' : DEFAULT_LANG;
}

/** 应用 <html lang>：英文保持默认“en”，其它语言显式设置 */
function applyHtmlLang(lang: string): void {
  if (lang !== 'en-US') document.documentElement.lang = lang;
}

/** 懒加载本页 i18n 文案（失败则回退 en-US，再失败用硬编码） */
async function loadI18nBootstrap(lang: string): Promise<Record<string, string>> {
  try {
    const mod = await import(`./i18n/${lang}/bootstrap.ts`);
    return (mod.default as Record<string, string>) ?? {};
  } catch {
    if (lang !== 'en-US') {
      try {
        const mod = await import(`./i18n/en-US/bootstrap.ts`);
        return (mod.default as Record<string, string>) ?? {};
      } catch { /* fallthrough */ }
    }
    return { loading: 'Loading...', browserTooOld: 'Your browser version is too old' };
  }
}

/** 渲染简单状态页（loading/alert + 文案） */
function renderSplash(icon: 'loading' | 'alert', text: string): void {
  const Icon = icon === 'loading' ? LoadingLoop : AlertCircle;
  const Splash = () => (
    <div class="status-page">
      <div class="status-content">
        <Icon />
        <span>{text}</span>
      </div>
    </div>
  );
  render(<Splash />, document.getElementById('root')!);
}

/** 浏览器兼容检测：仅成功时写入缓存，失败不缓存 */
async function checkCompatibilityWithCache(): Promise<boolean> {
  if (localStorageUsable) {
    const cached = getItem<boolean>(COMPAT_CACHE_KEY);
    if (cached.ok && cached.value === true) return true;
  }
  const { isBrowserCompatible } = await import('./utils/browser-compat');
  const ok = await isBrowserCompatible();
  if (ok && localStorageUsable) setItem(COMPAT_CACHE_KEY, true);
  return ok;
}

// ===== 启动引导（Step 1~7） =====
(async function bootstrap() {
  const prefs = readUserPrefs();
  applyTheme(prefs);

  const lang = selectLang(prefs);
  applyHtmlLang(lang);

  try { await ensureStylesheet('/styles/status-page.css') }
  catch (err) { console.error('[bootstrap] failed to load status-page.css:', err) }

  const i18n = await loadI18nBootstrap(lang);
  renderSplash('loading', i18n.loading || 'Loading...');

  const compatOk = await checkCompatibilityWithCache();
  if (!compatOk) { renderSplash('alert', i18n.browserTooOld || 'Your browser version is too old'); return }

  // Step 8+：交棒到登录门禁（保持当前 Loading 在屏上，直到新页面准备好）
  const { startAuthGate } = await import('./auth/Gate');
  startAuthGate(document.getElementById('root')!, lang);
})();
