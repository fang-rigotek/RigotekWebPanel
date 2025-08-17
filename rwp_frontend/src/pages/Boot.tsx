// src/pages/Boot.tsx
// 任何入口都先经过这里；先“最快显示 Loading…”，再决策。
// 开发期：每一步都会 devLog 打点（生产环境自动静默）。

import { useEffect, useRef, useState } from 'preact/hooks';
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

function getHashPath(): string {
  return location.hash.replace(/^#/, '');
}

/** 文案变化时生成新 key，用于重播 250ms 平移动画 */
function useNudgeKey(value: string) {
  const [key, setKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setKey((k) => (k + 1) % 1000);
    }
  }, [value]);
  return key;
}

export default function Boot() {
  const [phase, setPhase] = useState<BootPhase>('loading');
  const text = TEXTS[phase];
  const nudgeKey = useNudgeKey(text);

  useEffect(() => {
    const initialPath = getHashPath();
    devLog('[boot] start, initialPath=', initialPath || '(empty)');

    if (readCompatPassed()) {
      devLog('[boot] compat cache: HIT → skip checks, try auto login');
      attemptAutoLogin().then((ok) => {
        devLog('[boot] auto login result:', ok ? 'SUCCESS' : 'FAIL');
        if (ok) {
          const dest = decideAfterAuth(initialPath);
          devLog('[boot] navigate after auth →', dest);
          go(dest);
        } else {
          devLog('[boot] navigate → login');
          go('login');
        }
      });
      return;
    }

    devLog('[boot] compat cache: MISS → show checking & run detection');
    setPhase('checking');

    const result = checkBrowserCompatibility();
    devLog('[boot] check result:', {
      ok: result.ok,
      via: (result as any).via,
      engine: result.engine,
      version: result.versionMajor,
      details: (result as any).details,
    });

    if (!result.ok) {
      devLog('[boot] OUTDATED → stay on boot, show warning');
      setPhase('outdated');
      return;
    }

    const wrote = writeCompatPassed();
    devLog('[boot] compat cache write:', wrote ? 'OK' : 'FAILED (private mode?)');

    devLog('[boot] navigate → login (no auto login on first pass)');
    go('login');
  }, []);

  const isAlert = phase === 'outdated';

  return (
    <div
      style={{
        backgroundColor: '#000',
        color: '#fff',
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            lineHeight: 1.4,
            fontSize: '18px',
            position: 'relative',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'left',
          }}
        >
          <span
            class={`nudge-${nudgeKey}`}
            style={{
              display: 'inline-flex',
              width: `${ICON_SIZE}px`,
              height: `${ICON_SIZE}px`,
            }}
          >
            {isAlert ? <AlertCircle size={ICON_SIZE} /> : <LoadingLoop size={ICON_SIZE} />}
          </span>

          <span style={{ whiteSpace: 'normal' }}>{text}</span>
        </div>
      </div>

      <style>
        {`
          [class^="nudge-"] {
            animation: boot-nudge 250ms ease;
          }
          @keyframes boot-nudge {
            from { transform: translateX(-6px); }
            to   { transform: translateX(0); }
          }
        `}
      </style>
    </div>
  );
}

/* ---------- 本地存取（带日志） ---------- */
function readCompatPassed(): boolean {
  try {
    const ok = typeof localStorage !== 'undefined' && localStorage.getItem(COMPAT_KEY) === '1';
    return ok;
  } catch (e) {
    devLog('[boot] read compat cache error:', e);
    return false;
  }
}
function writeCompatPassed(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(COMPAT_KEY, '1');
    return true;
  } catch (e) {
    devLog('[boot] write compat cache error:', e);
    return false;
  }
}

/* ---------- 导航 + 就绪信号（带日志） ---------- */
type Dest = 'login' | 'overview' | string;

function go(dest: Dest) {
  // 1) 先导航
  location.hash = `#${dest}`;
  devLog('[boot] set hash →', `#${dest}`);

  // 2) 再尝试写就绪标志
  let wrote = true;
  try {
    sessionStorage.setItem('rwp_route_ready', '1');
  } catch (e) {
    wrote = false;
    devLog('[boot] write ready flag error (sessionStorage):', e);
  }
  devLog('[boot] ready flag write:', wrote ? 'OK' : 'FAILED');

  // 3) 派发事件（无论写入是否成功）
  try {
    window.dispatchEvent(new Event('rwp:ready'));
    devLog('[boot] dispatch rwp:ready');
  } catch (e) {
    devLog('[boot] dispatch rwp:ready error:', e);
  }
}

/* ---------- 登录后目的地决策 ---------- */
function decideAfterAuth(initialPath: string): Dest {
  if (!initialPath || initialPath === 'login') return 'overview';
  if (!isValidRoute(initialPath)) return 'overview';
  return initialPath;
}
function isValidRoute(path: string): boolean {
  // 目前仅 overview 合法；后续按需补充
  const valid = new Set(['overview']);
  return valid.has(path);
}

/* ---------- 自动登录占位（带日志） ---------- */
function attemptAutoLogin(): Promise<boolean> {
  return new Promise((resolve) => {
    let ok = false;
    try {
      ok = typeof localStorage !== 'undefined' && localStorage.getItem(AUTH_KEY) != null;
    } catch (e) {
      devLog('[boot] read auth cache error:', e);
      ok = false;
    }
    setTimeout(() => resolve(ok), 300);
  });
}
