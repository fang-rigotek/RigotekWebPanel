// src/pages/Boot.tsx
import { useEffect } from 'preact/hooks';
import { render } from 'preact';
import { checkBrowserCompatibility } from '../utils/browser-checker';   // ← 相对路径
import { LoadingLoop, AlertCircle } from '../../rigotek-web-ui/icons';
import { devLog } from '../utils/dev-tools';                             // ← 相对路径

type BootPhase = 'loading' | 'checking' | 'outdated';
const TEXTS: Record<BootPhase, string> = {
  loading: 'Loading…',
  checking: 'Checking browser compatibility…',
  outdated: 'Your browser version is outdated.',
};

const ICON_SIZE = 24;
const COMPAT_KEY = 'rwp_browser_ok';
const AUTH_KEY = 'rwp_auth';

function getIconEl(): HTMLElement | null { return document.getElementById('rwp-splash-icon'); }
function getTextEl(): HTMLElement | null { return document.getElementById('rwp-splash-text'); }

function ensureNudgeKeyframesOnce() {
  const id = 'rwp-nudge-style';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = '@keyframes rwp-boot-nudge{from{transform:translateX(-6px)}to{transform:translateX(0)}}';
  document.head.appendChild(style);
}
function nudgeIcon() {
  const el = getIconEl();
  if (!el) return;
  el.style.animation = 'none';
  // 强制回流
  // @ts-ignore
  el.offsetHeight;
  el.style.animation = 'rwp-boot-nudge 250ms ease';
}
function setText(text: string) {
  const el = getTextEl();
  if (!el) return;
  el.textContent = text;
  nudgeIcon();
}
function setIcon(kind: 'loading' | 'alert') {
  const el = getIconEl();
  if (!el) return;
  if (kind === 'loading') render(<LoadingLoop size={ICON_SIZE} />, el);
  else render(<AlertCircle size={ICON_SIZE} />, el);
  nudgeIcon();
}

function readCompatPassed(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(COMPAT_KEY) === '1'; } catch { return false; }
}
function writeCompatPassed(): boolean {
  try { if (typeof localStorage === 'undefined') return false; localStorage.setItem(COMPAT_KEY, '1'); return true; } catch { return false; }
}

type Dest = 'login' | 'overview' | string;
function go(dest: Dest) {
  location.hash = `#${dest}`;
  try { sessionStorage.setItem('rwp_route_ready', '1'); } catch {}
  try { window.dispatchEvent(new Event('rwp:ready')); } catch {}
}

function initialPath(): string { return location.hash.replace(/^#/, ''); }
function decideAfterAuth(path: string): Dest {
  if (!path || path === 'login') return 'overview';
  return new Set(['overview']).has(path) ? path : 'overview';
}
function attemptAutoLogin(): Promise<boolean> {
  return new Promise((resolve) => {
    let ok = false;
    try { ok = typeof localStorage !== 'undefined' && localStorage.getItem(AUTH_KEY) != null; } catch { ok = false; }
    setTimeout(() => resolve(ok), 300);
  });
}

export default function Boot() {
  useEffect(() => {
    ensureNudgeKeyframesOnce();

    const init = initialPath();
    devLog('[boot] start, initPath=', init || '(empty)');

    if (readCompatPassed()) {
      devLog('[boot] compat cache HIT → auto login (keep splash)');
      attemptAutoLogin().then((ok) => {
        devLog('[boot] auto login:', ok ? 'SUCCESS' : 'FAIL');
        if (ok) go(decideAfterAuth(init));
        else go('login');
      });
      return;
    }

    devLog('[boot] compat cache MISS → checking…');
    setText(TEXTS.checking);
    setIcon('loading');

    const result = checkBrowserCompatibility();
    devLog('[boot] check result:', { ok: result.ok, via: (result as any).via, engine: result.engine, version: result.versionMajor });

    if (!result.ok) {
      devLog('[boot] OUTDATED → show warning on splash');
      setIcon('alert');
      setText(TEXTS.outdated);
      return;
    }

    const wrote = writeCompatPassed();
    devLog('[boot] compat cache write:', wrote ? 'OK' : 'FAILED');
    go('login');
  }, []);

  // 关键：Boot 自己不渲染任何 UI，只操作 Splash DOM
  return null;
}
