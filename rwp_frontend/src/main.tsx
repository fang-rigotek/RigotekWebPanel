// src/main.tsx
// 目标：首屏尽快呈现“黑底 + 图标 + Loading…”的 Splash；并且在开发阶段尽早加载移动端控制台。
// 说明：这里不做任何业务逻辑；随后异步加载 bootstrap.tsx 接管渲染。

import { render } from 'preact';
import '@/styles/base.css';
import { LoadingLoop } from '../rigotek-web-ui/icons';

// 开发期工具：尽早初始化移动端调试台（生产会被摇树裁剪；内部已做移动 UA 判断与重复初始化保护）
import { initMobileConsole, devLog } from './utils/dev-tools';
initMobileConsole();

const ICON_SIZE = 24;

function Splash() {
  return (
    <div
      style={{
        backgroundColor: '#000',
        color: '#fff',
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        boxSizing: 'border-box', // 避免 100dvh + padding 外溢
      }}
    >
      {/* 保持与 Boot 完全相同的 DOM 层级与样式 */}
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
            style={{
              display: 'inline-flex',
              width: `${ICON_SIZE}px`,
              height: `${ICON_SIZE}px`,
            }}
          >
            <LoadingLoop size={ICON_SIZE} />
          </span>
          <span style={{ whiteSpace: 'normal' }}>Loading…</span>
        </div>
      </div>
    </div>
  );
}

const mountNode = document.getElementById('app') as HTMLElement;

// 1) 先渲染极简 Splash（样式与 Boot 一致）
render(<Splash />, mountNode);
devLog('[main] splash rendered, loading bootstrap…');

// 2) 再异步加载“主应用入口”（bootstrap.tsx）
import('./bootstrap')
  .then((mod) => {
    devLog('[main] bootstrap loaded');
    if (typeof mod.mountApp === 'function') {
      mod.mountApp(mountNode);
    } else if (typeof mod.default === 'function') {
      (mod.default as (el: HTMLElement) => void)(mountNode);
    } else if (import.meta.env.DEV) {
      console.warn('[main] bootstrap module loaded but no mountApp/default function found');
    }
  })
  .catch((err) => {
    // 加载失败：保持 Splash，避免白屏
    if (import.meta.env.DEV) {
      console.error('[main] failed to load bootstrap:', err);
    }
  });
