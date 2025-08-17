// src/pages/Login.tsx
// 职责：登录页占位。页面正中显示“登录页”，用于早期路由与跳转联调。
// 说明：不引入第三方库；样式极简，遵守 6 的倍数尺寸习惯（仅做选择，不在全局定义变量）。

export default function Login() {
  return (
    <main
      // 使用单元素居中，避免额外容器，降低内存与重排成本
      style={{
        minHeight: '100dvh',       // 占满视口高度，便于垂直居中
        display: 'grid',           // grid + placeItems 居中
        placeItems: 'center',
        padding: '24px',           // 24 = 6 * 4
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '18px',        // 18 = 6 * 3
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        登录页
      </h1>
    </main>
  );
}
