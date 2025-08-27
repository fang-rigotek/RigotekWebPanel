// src/bootstrap.tsx
import { render } from 'preact';
import './styles/base.css';                 // ← 相对路径，避免别名失效
import { LoadingLoop } from './components/icons';
import { initMobileConsole } from './utils/dev-tools';

initMobileConsole();

const ICON_SIZE = 24;

function Splash() {
  return (
    <div
      id="rwp-splash"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--fg)',
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
            id="rwp-splash-icon"
            style={{ display: 'inline-flex', width: `${ICON_SIZE}px`, height: `${ICON_SIZE}px` }}
          >
            <LoadingLoop size={ICON_SIZE} />
          </span>
          <span id="rwp-splash-text" style={{ whiteSpace: 'normal' }}>
            Loading…
          </span>
        </div>
      </div>
    </div>
  );
}

const mountNode =
  (document.getElementById('root') as HTMLElement | null) ??
  (() => {
    const el = document.createElement('div');
    el.id = 'root';
    document.body.appendChild(el);
    return el;
  })();

try {
  render(<Splash />, mountNode);
} catch (e) {
  console.error('[bootstrap] render splash failed:', e);
}

import('./main')
  .then((mod) => {
    const mount = (mod as any).mountApp || (mod as any).default;
    if (typeof mount === 'function') {
      mount(mountNode);
    } else {
      console.warn('[bootstrap] main loaded but no mount function');
    }
  })
  .catch((err) => {
    console.error('[bootstrap] failed to load main:', err);
    // 失败时保留 Splash；也可以考虑跳转 /errors/offline.html（后续再加）
  });
