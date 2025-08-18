// src/main.tsx（仅展示变更的样式块，其他内容保持为你当前版本）
function Splash() {
  return (
    <div
      id="rwp-splash"
      style={{
        backgroundColor: 'var(--bg)',  // ← 改
        color: 'var(--fg)',            // ← 改
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
            style={{ display: 'inline-flex', width: '24px', height: '24px' }}
          >
            <LoadingLoop size={24} />
          </span>
          <span id="rwp-splash-text" style={{ whiteSpace: 'normal' }}>
            Loading…
          </span>
        </div>
      </div>
    </div>
  );
}
