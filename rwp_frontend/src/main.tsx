// src/main.tsx
import { render } from 'preact';
import './styles/base.css';                 // ← 相对路径，避免别名失效
import { LoadingLoop } from '../rigotek-web-ui/icons';
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

const mountNode = document.getElementById('app') as HTMLElement;

try {
  render(<Splash />, mountNode);
} catch (e) {
  // 避免完全静默
  console.error('[main] render splash failed:', e);
}

import('./bootstrap')
  .then((mod) => {
    const mount = (mod as any).mountApp || (mod as any).default;
    if (typeof mount === 'function') {
      mount(mountNode);
    } else {
      console.warn('[main] bootstrap loaded but no mount function');
    }
  })
  .catch((err) => {
    // 失败时仍然保留 Splash，至少不会白屏
    console.error('[main] failed to load bootstrap:', err);
  });
