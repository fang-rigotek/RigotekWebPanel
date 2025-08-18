// src/main.tsx
import { render } from 'preact';
import '@/styles/base.css';
import { LoadingLoop } from '../rigotek-web-ui/icons';
import { initMobileConsole, devLog } from './utils/dev-tools';
initMobileConsole();

const ICON_SIZE = 24;

function Splash() {
  return (
    <div
      id="rwp-splash"                   // ← 用于后续在就绪后移除 Splash
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
          id="rwp-splash-icon"
            style={{
              display: 'inline-flex',
              width: `${ICON_SIZE}px`,
              height: `${ICON_SIZE}px`,
            }}
          >
            <LoadingLoop size={ICON_SIZE} />
          </span>
          <span
id="rwp-splash-text" 
 style={{ whiteSpace: 'normal' }}>Loading…</span>
        </div>
      </div>
    </div>
  );
}

const mountNode = document.getElementById('app') as HTMLElement;
render(<Splash />, mountNode);
devLog('[main] splash rendered, loading bootstrap…');

import('./bootstrap')
  .then((mod) => {
    devLog('[main] bootstrap loaded');
    if (typeof mod.mountApp === 'function') mod.mountApp(mountNode);
    else if (typeof mod.default === 'function') (mod.default as (el: HTMLElement) => void)(mountNode);
    else if (import.meta.env.DEV) console.warn('[main] bootstrap has no mount function');
  })
  .catch((err) => { if (import.meta.env.DEV) console.error('[main] bootstrap load failed:', err); });
