// src/main.tsx（头部导入）
import { render } from 'preact';
import type { VNode } from 'preact';        // ✅ 正确引入类型
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import Boot from './runtime/boot-controller';
import Login from './pages/Login';
import App from './App';
// import { devLog } from './utils/dev-tools'; // ❌ 未使用可先移除，减少告警
import './styles/base.css';                  // 暂时保留，见“可选优化 1”

type Route = 'boot' | 'login' | 'overview';

function parseHash(): Route {
  const h = location.hash.replace(/^#/, '');
  switch (h) {
    case 'login': return 'login';
    case 'overview': return 'overview';
    default: return 'boot';
  }
}
function isRouteReady(): boolean {
  try { return sessionStorage.getItem('rwp_route_ready') === '1'; } catch { return false; }
}

/* 统一过渡：新页 0.25s 渐入；旧页 0.25s 后卸载 */
const FADE_MS = 250;

function TransitionContainer({ node }: { node: preact.VNode }) {
  const [current, setCurrent] = useState(node);
  const [prev, setPrev] = useState<preact.VNode | null>(null);
  const [fadeKey, setFadeKey] = useState(0);
  const firstPaint = useRef(true);

  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      setFadeKey((k) => (k + 1) % 1000);
      return;
    }
    setPrev(current);
    setCurrent(node);
    setFadeKey((k) => (k + 1) % 1000);
    const t = setTimeout(() => setPrev(null), FADE_MS);
    return () => clearTimeout(t);
  }, [node]);

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', isolation: 'isolate' }}>
      {prev && <div style={{ position: 'absolute', inset: 0 }}>{prev}</div>}
      <div
        key={fadeKey}
        style={{ position: 'relative', opacity: 0, animation: `rwp-fade-in ${FADE_MS}ms ease forwards` }}
      >
        {current}
      </div>
      <style>{`@keyframes rwp-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}

function Router() {
  const [ready, setReady] = useState<boolean>(isRouteReady());
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); setReady(isRouteReady()); };
    const onReady = () => setReady(true);

    window.addEventListener('hashchange', onHash);
    window.addEventListener('rwp:ready', onReady as EventListener);

    setReady(isRouteReady()); // 挂载后再读一次，防早期漏写
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('rwp:ready', onReady as EventListener);
    };
  }, []);

  const view = useMemo(() => {
    if (!ready) return <Boot />; // Boot 不绘 UI，只改 Splash 的图标/文字
    switch (route) {
      case 'login': return <Login />;
      case 'overview': return <App />;
      default: return <Boot />;
    }
  }, [ready, route]);

  return <TransitionContainer node={view} />;
}

export function mountApp(container: HTMLElement) {
  // 离屏预渲染：让 Boot 的副作用运行，直接修改 main 的 Splash
  const offscreen = document.createElement('div');
  try {
    render(<Router />, offscreen);
  } catch (e) {
    console.error('[bootstrap] offscreen render error:', e);
  }

  const onReady = () => {
    // 移除 Splash
    const splash = document.getElementById('rwp-splash');
    if (splash && splash.parentElement) splash.parentElement.removeChild(splash);
    // 真正接管挂载点
    render(<Router />, container);
    window.removeEventListener('rwp:ready', onReady as EventListener);
  };
  window.addEventListener('rwp:ready', onReady as EventListener);

  // 双通道兜底：若事件已发出也能接管
  if (isRouteReady()) onReady();
  else setTimeout(() => { if (isRouteReady()) onReady(); }, 0);
}

export default mountApp;
