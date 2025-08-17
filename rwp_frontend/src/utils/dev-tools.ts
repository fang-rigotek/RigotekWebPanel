// src/utils/dev-tools.ts
// 职责：开发期工具（移动端调试台 + 统一开发日志）
// 设计：
// - 仅在 import.meta.env.DEV 为 true 时生效；生产环境直接 no-op，Vite 会摇树裁剪。
// - eruda 采用动态导入（import('eruda')），避免进入生产构建。
// - 移动端 UA 才尝试加载 eruda，且在浏览器空闲时机再初始化，降低首屏干扰。

/** 简单的移动端 UA 判断（足够用于启/不启 eruda 的分支） */
function isMobileUA(ua: string): boolean {
  return /Mobile|Android|iP(ad|hone|od)|IEMobile|BlackBerry|Opera Mini/i.test(ua);
}

/** 安全获取 UA（SSR/旧环境容错） */
function getUA(): string {
  try {
    return typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  } catch {
    return '';
  }
}

/**
 * 初始化移动端调试台（eruda）
 * - 仅 DEV + 移动端 UA 才会尝试加载；
 * - 采用 requestIdleCallback（有则用，无则 setTimeout）在空闲时加载，避免阻塞首屏；
 * - 任何报错都被吞掉，不影响正常页面。
 */
export function initMobileConsole(): void {
  if (!import.meta.env.DEV) return;

  const ua = getUA();
  if (!isMobileUA(ua)) {
    // 桌面端不启用移动调试台
    return;
  }

  const schedule =
    (window as any).requestIdleCallback ||
    ((cb: Function) => setTimeout(() => cb(), 0));

  schedule(async () => {
    try {
      // 动态导入（仅 DEV 时走到这里）
      const mod = await import('eruda');
      // 若已存在就复用
      const eruda = (mod as any).default || mod;
      if (!(eruda as any)._isInit) {
        eruda.init();
        (eruda as any)._isInit = true; // 标记，避免重复 init
      }
      devLog('[dev-tools] eruda initialized');
    } catch (err) {
      // 加载失败不影响业务
      // 仍然用 devLog 输出（在 DEV 下可见）
      devLog('[dev-tools] eruda load failed:', err);
    }
  });
}

/**
 * 开发期统一日志
 * - 生产环境静默（不输出）
 * - 用统一前缀便于过滤
 */
export function devLog(...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  try {
    // 避免 console 在极端环境不存在导致异常
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log('[RWP]', ...args);
    }
  } catch {
    // 忽略任何日志异常
  }
}
