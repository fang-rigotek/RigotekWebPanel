// src/App.tsx
// 职责：面板首页的占位组件（核心功能页的根）。
// 说明：当前只做最小占位，后续模块/路由/局部刷新都会在这里挂载。

export default function App() {
  return (
    <main
      // 单容器居中，减少不必要层级和重排
      style={{
        minHeight: '100dvh',  // 占满视口高度，便于垂直居中
        display: 'grid',
        placeItems: 'center',
        padding: '24px',      // 24 = 6 * 4
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '18px',   // 18 = 6 * 3
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        面板首页
      </h1>
    </main>
  );
}
