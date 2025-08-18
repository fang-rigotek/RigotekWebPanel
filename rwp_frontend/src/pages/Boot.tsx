// src/pages/Boot.tsx
// 设计：Boot 自己不绘制任何 UI（return null）。
// - 有缓存：静默尝试自动登录，保持 Splash 上的“Loading…”不变 → 导航
// - 无缓存：把 Splash 文案切到 “Checking browser compatibility…”，图标仍为 Loading；
//           检测不过 → 把 Splash 图标替换为 AlertCircle，文字改成“Your browser version is outdated.”；
//           检测通过 → 记录缓存并导航登录页。
// - 每次文字切换时，让 Icon 容器做 250ms 的轻微平移动画（和你之前一致）。
//
// 实现方式：通过 #rwp-splash-icon / #rwp-splash-text 直接修改 DOM；
//           图标使用 Preact render() 渲染到图标容器中（LoadingLoop / AlertCircle）。

import { useEffect } from 'preact/hooks';
import { render } from 'preact';
import { checkBrowserCompatibility } from '@/utils/browser-checker';
import { LoadingLoop, AlertCircle } from '../../rigotek-web-ui/icons';
import { devLog } from '@/utils/dev-tools';

type BootPhase = 'loading' | 'checking' | 'outdated';

const TEXTS: Record<BootPhase, string> = {
  loading: 'Loading…',
  checking: 'Checking browser compatibility…',
  outdated: 'Your browser version is outdated.',
};

const ICON_SIZE = 24;
const COMPAT_KEY = 'rwp_browser_ok';
const AUTH_KEY = 'rwp_auth';

// —— DOM 工具：拿到 Splash 的两个节点
function getSplashIconEl(): HTMLElement | null {
  return document.getElementById('rwp-splash-icon') as HTMLElement | null;
}
function getSplashTextEl(): HTMLElement | null {
  return document.getElementById('rwp-splash-text') as HTMLElement | null;
}

// —— nudge 动画：对图标容器做 250ms 轻微平移
function ensureNudgeKeyframesOnce() {
  // 注入一次关键帧
  const id = 'rwp-nudge-style';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @keyframes rwp-boot-nudge { from { transform: translateX(-6px); } to { transform: translateX(0); } }
  `;
  document.head.appendChild(style);
}

function playNudgeOnceOn(el: HTMLElement | null) {
  if (!el) return;
  // 通过重置 animation 触发一次
  el.style.animation = 'none';
  // 强制回流
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetHeight;
  el.style.animation = 'rwp-boot-nudge 250ms ease';
}

// —— 替换 Splash 的文字
function setSplashText(text: string) {
  const el = getSplashTextEl();
  if (!el) return;
  el.textContent = text;
  // 让图标容器做 nudge，缓解居中跳动
  playNudgeOnceOn(getSplashIconEl());
}

// —— 替换 Splash 的图标（使用 Preact 直接渲染到容器）
function setSplashIcon(kind: 'loading' | 'alert') {
  const el = getSplashIconEl();
  if (!el) return;
  if (kind === 'loading') {
    render(<LoadingLoop size={ICON_SIZE} />, el);
  } else {
    render(<AlertCircle size={ICON_SIZE} />, el);
  }
  playNudgeOnceOn(el);
}

// —— 读写缓存（兼容无痕）
function readCompatPassed(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(COMPAT_KEY) === '1';
  } catch {
    return false;
  }
}
function writeCompatPassed(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(COMPAT_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

// —— 导航与就绪事件
type Dest = 'login' | 'overview' | string;
function go(dest: Dest) {
  // 先改 hash
  location.hash = `#${dest}`;
  // 写就绪标志（允许失败）
  try { sessionStorage.setItem('rwp_route_ready', '1'); } catch {}
  // 派发就绪事件
  try { window.dispatchEvent(new Event('rwp:ready')); } catch {}
}

function getInitialPath(): string {
  return location.hash.replace(/^#/, '');
}

function decideAfterAuth(initialPath: string): Dest {
  if (!initialPath || initialPath === 'login') return 'overview';
  if (!new Set(['overview']).has(initialPath)) return 'overview';
  return initialPath;
}

function attemptAutoLogin(): Promise<boolean> {
  return new Promise((resolve) => {
    let ok = false;
    try {
      ok = typeof localStorage !== 'undefined' && localStorage.getItem(AUTH_KEY) != null;
    } catch {
      ok = false;
    }
    setTimeout(() => resolve(ok), 300);
  });
}

export default function Boot() {
  useEffect(() => {
    ensureNudgeKeyframesOnce();

    const initialPath = getInitialPath();
    devLog('[boot] start, initialPath=', initialPath || '(empty)');

    // 有兼容缓存：保持 Splash 的“Loading…”，静默尝试自动登录
    if (readCompatPassed()) {
      devLog('[boot] compat cache: HIT → try auto login (keep Splash)');
      attemptAutoLogin().then((ok) => {
        devLog('[boot] auto login:', ok ? 'SUCCESS' : 'FAIL');
        if (ok) go(decideAfterAuth(initialPath));
        else go('login');
      });
      return;
    }

    // 无缓存：把 Splash 文案切到 Checking（图标仍保持 loading）
    devLog('[boot] compat cache: MISS → set Splash to "Checking…" and run detection');
    setSplashText(TEXTS.checking);
    setSplashIcon('loading');

    const result = checkBrowserCompatibility();
    devLog('[boot] check result:', { ok: result.ok, via: (result as any).via, engine: result.engine, version: result.versionMajor });

    if (!result.ok) {
      // 不通过：图标改成 alert，文字改成过期提示；停留本页
      devLog('[boot] OUTDATED → replace Splash icon/text to alert + message');
      setSplashIcon('alert');
      setSplashText(TEXTS.outdated);
      return;
    }

    // 通过：尝试写入标记（失败也继续导航），然后进入登录页
    const wrote = writeCompatPassed();
    devLog('[boot] compat cache write:', wrote ? 'OK' : 'FAILED (private mode?)');
    go('login');
  }, []);

  // Boot 自己不渲染任何 UI，完全复用 main.tsx 的 Splash
  return null;
}
