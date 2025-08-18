// src/bootstrap.tsx
// 职责：主应用入口（被 main.tsx 异步加载）
// - 不创建覆盖层：先在“离屏容器”预渲染 Router，让 Boot 逻辑运行并修改 main 的 Splash
// - 收到 Boot 的 'rwp:ready'（或同步检测到 ready 标志）后，移除 Splash，再把 Router 真正渲到挂载点
// - 统一过渡：旧页保留 0.25s，新页 0.25s 渐入后卸载

import { render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import Boot from '@/pages/Boot';
import Login from '@/pages/Login';
import App from '@/App';
import { devLog } from '@/utils/dev-tools';

import '@/styles/base.css';

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

/* ---------------- 统一过渡容器 ---------------- */
const FADE_MS = 250;

function TransitionContainer({ node }: { node: preact.VNode }) {
  const [current, setCurrent] = useState(node);
  const [prev, setPrev] = useState<preact.VNode | null>(null);
  const [fadeKey, setFadeKey] = useState(0);
  const firstPaint = useRef(true);

  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      setFadeKey((k) => (k + 1) % 1000); // 首次挂载也渐入
      return;
    }
    setPrev(current);
    setCurrent(node);
    setFadeKey((k) => (k + 1) % 1000);
    const t = setTimeout(() => setPrev(null), FADE_MS); // 0.25s 后卸载旧页
    return () => clearTimeout(t);
  }, [node]);

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', isolation: 'isolate' }}>
      {prev && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {prev}
        </div>
      )}
      <div
        key={fadeKey}
        style={{
          position: 'relative',
          opacity: 0,
          animation: `rwp-fade-in ${FADE_MS}ms ease forwards`,
        }}
      >
        {current}
      </div>
      <style>{`@keyframes rwp-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}

/* ---------------- 路由器（带就绪门禁） ---------------- */
function Router() {
  const [ready, setReady] = useState<boolean>(isRouteReady());
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); setReady(isRouteReady()); };
    const onReady = () => setReady(true);

    window.addEventListener('hashchange', onHash);
    window.addEventListener('rwp:ready', onReady as EventListener);

    // 挂载后再读一次，避免早期漏写
    setReady(isRouteReady());

    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('rwp:ready', onReady as EventListener);
    };
  }, []);

  const view = useMemo(() => {
    if (!ready) return <Boot />; // Boot 不绘 UI，直接操作 main 的 Splash
    switch (route) {
      case 'login':    return <Login />;
      case 'overview': return <App />;
      default:         return <Boot />;
    }
  }, [ready, route]);

  return <TransitionContainer node={view} />;
}

/* ---------------- 对外导出：无覆盖层 & 防竞态就绪 ---------------- */
export function mountApp(container: HTMLElement) {
  // 1) 先在“离屏容器”预渲染 Router，让 Boot 的副作用先跑起来
  const offscreen = document.createElement('div');
  render(<Router />, offscreen);

  // 2) 定义就绪处理：移除 Splash，真正接管挂载点
  const onReady = () => {
    const splash = document.getElementById('rwp-splash');
    if (splash && splash.parentElement) {
      splash.parentElement.removeChild(splash);
    }
    // 把 Router 真正渲染到页面
    render(<Router />, container);
    window.removeEventListener('rwp:ready', onReady as EventListener);
  };

  // 3) 监听自定义就绪事件
  window.addEventListener('rwp:ready', onReady as EventListener);

  // 4) ✅ 双通道兜底：若事件在监听前已经发出，也能及时接管
  if (isRouteReady()) {
    // 同步命中：立即接管
    onReady();
  } else {
    // 再放一个微任务兜底（极端快路径）
    setTimeout(() => {
      if (isRouteReady()) onReady();
    }, 0);
  }
}

export default mountApp;
