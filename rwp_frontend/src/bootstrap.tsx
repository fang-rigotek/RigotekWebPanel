// rwp_frontend/src/bootstrap.tsx
// 应用引导入口

import { render } from 'preact';
import { getItem } from './utils/storage';
import { ensureStylesheet } from './utils/resource-loader';
import LoadingLoop from './components/icons/LoadingLoop';

// ---- 第一步：尝试读取缓存的主题设置 ----
(function applyThemeFromCache() {
  const res = getItem<'light' | 'dark'>('theme');
  if (res.ok && res.value) {
    document.body.setAttribute('data-theme', res.value);
  }
})();

// ---- 第二步：加载状态页样式并渲染 Splash ----
async function initSplash() {
  try {
    await ensureStylesheet('/styles/status-page.css');
  } catch (err) {
    console.error('[bootstrap] failed to load status-page.css:', err);
  }

  function Splash() {
    return (
      <div class="status-page">
        <div class="status-content">
          <LoadingLoop />
          <span>Loading...</span>
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

  render(<Splash />, mountNode);
}

initSplash();

// ---- 第三步：后续逻辑待补充 ----
