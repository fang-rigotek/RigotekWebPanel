// src/bootstrap.tsx
// 职责：主应用入口（被 main.tsx 异步加载）
// - DEV 调试台与日志
// - 路由门禁：任何入口先走 Boot（直到 rwp_route_ready）
// - 统一过渡：旧页保留 0.25s，新页 0.25s 渐入（包含背景一起渐入）
// - 导出 mountApp(container) 给 main.tsx 调用

import { render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import Boot from '@/pages/Boot';
import Login from '@/pages/Login';
import App from '@/App';
import { devLog } from '@/utils/dev-tools';

import '@/styles/base.css';

/* ---------------- 路由与就绪 ---------------- */

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
  try {
    return sessionStorage.getItem('rwp_route_ready') === '1';
  } catch {
    return false;
  }
}

/* ---------------- 统一过渡容器 ----------------
 * 统一规则：
 * - 任意页面进入：前 250ms 进行 opacity 渐入（包含背景一起渐入，因为是整层容器在变透明）
 * - 路由切换：旧页面在下层静态保留 250ms，新页面在上层 250ms 渐入
 * - 初次挂载也执行一次 250ms 渐入
 */

const FADE_MS = 250;

function TransitionContainer({ node }: { node: preact.VNode }) {
  const [current, setCurrent] = useState(node);
  const [prev, setPrev] = useState<preact.VNode | null>(null);
  const [fadeKey, setFadeKey] = useState(0);
  const firstPaint = useRef(true);

  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      setFadeKey((k) => (k + 1) % 1000); // 首次渲染也渐入
      return;
    }
    // 切换：旧页保留，当前替换为新页，新页渐入；到时清旧页
    setPrev(current);
    setCurrent(node);
    setFadeKey((k) => (k + 1) % 1000);

    const t = setTimeout(() => setPrev(null), FADE_MS);
    return () => clearTimeout(t);
  }, [node]);

  return (
    <div
      /* 整个过渡容器本身不加 padding，避免参与 100dvh 计算；
         页面内部各自用 min-height:100dvh + padding（配合全局 border-box） */
      style={{
        position: 'relative',
        minHeight: '100dvh',
        isolation: 'isolate', // 让层叠上下文独立，避免外部影响
      }}
    >
      {/* 旧页在下：固定铺满，保留 250ms，不做透明度动画 */}
      {prev && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
          }}
        >
          {prev}
        </div>
      )}

      {/* 新页在上：每次进入都 250ms 渐入（包含背景） */}
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

      <style>
        {`
          @keyframes rwp-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

/* ---------------- 路由器（带就绪门禁） ---------------- */

function Router() {
  const [ready, setReady] = useState<boolean>(isRouteReady());
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    devLog('[bootstrap/router] mount {ready, route}:', ready, route);

    const onHash = () => {
      const r = parseHash();
      setRoute(r);
      const nowReady = isRouteReady();
      setReady(nowReady);
      devLog('[bootstrap/router] hashchange →', r, ' ready=', nowReady);
    };
    const onReady = () => {
      setReady(true);
      devLog('[bootstrap/router] rwp:ready event → ready=true');
    };

    window.addEventListener('hashchange', onHash);
    window.addEventListener('rwp:ready', onReady as EventListener);

    // 挂载后再读一次，避免早期漏写
    const now = isRouteReady();
    if (now !== ready) {
      setReady(now);
      devLog('[bootstrap/router] recheck ready after mount →', now);
    }
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('rwp:ready', onReady as EventListener);
      devLog('[bootstrap/router] unmount');
    };
  }, []);

  const view = useMemo(() => {
    if (!ready) {
      devLog('[bootstrap/router] render Boot (not ready)');
      return <Boot />;
    }
    switch (route) {
      case 'login':
        devLog('[bootstrap/router] render Login');
        return <Login />;
      case 'overview':
        devLog('[bootstrap/router] render App (overview)');
        return <App />;
      default:
        devLog('[bootstrap/router] render Boot (default)');
        return <Boot />;
    }
  }, [ready, route]);

  return <TransitionContainer node={view} />;
}

/* ---------------- 对外导出 ---------------- */

export function mountApp(container: HTMLElement) {
  devLog('[bootstrap] mountApp');
  render(<Router />, container);
}

export default mountApp;
