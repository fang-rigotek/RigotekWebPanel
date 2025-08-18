// src/utils/dev-tools.ts
// 职责：开发期工具（移动端调试台 + 统一开发日志）
// 更新点：改进“移动端检测”策略，兼容 iPadOS 13+ 桌面UA（Macintosh + 多触点）

/** 开发期统一日志（生产静默） */
export function devLog(...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  try {
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log('[RWP]', ...args);
    }
  } catch {
    /* ignore */
  }
}

/** 安全获取 UA / 平台信息 */
function getEnv() {
  let ua = '';
  let platform = '';
  let maxTouchPoints = 0;
  try {
    ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    platform = typeof navigator !== 'undefined' ? (navigator as any).platform || '' : '';
    maxTouchPoints = typeof navigator !== 'undefined' ? (navigator as any).maxTouchPoints || 0 : 0;
  } catch {
    /* ignore */
  }
  return { ua, platform, maxTouchPoints };
}

/**
 * 判断是否为“移动端/类移动端”环境（用于决定是否启用 eruda）
 * - 传统 UA 关键字：Mobile / Android / iPhone / iPod / iPad / IEMobile / BlackBerry / Opera Mini
 * - iPadOS 13+ 桌面模式：UA 伪装成 "Macintosh"；用 (platform === 'MacIntel' && maxTouchPoints > 1) 区分
 */
function isMobileLike(): boolean {
  const { ua, platform, maxTouchPoints } = getEnv();

  // 1) 明确的移动端关键字
  if (/\b(Mobile|Android|iPhone|iPod|iPad|IEMobile|BlackBerry|Opera Mini)\b/i.test(ua)) {
    return true;
  }

  // 2) iPadOS 13+ 桌面模式：平台为 MacIntel，但支持多触点
  //    参考：Safari/iPadOS 将 UA 伪装为桌面 Safari；使用触控点数量识别
  if (/Mac/i.test(platform) && maxTouchPoints > 1) {
    return true;
  }

  return false;
}

/**
 * 初始化移动端调试台（eruda）
 * - 仅 DEV + 移动端/类移动端 才会尝试加载
 * - 动态导入，失败静默
 * - 避免重复初始化
 */
export function initMobileConsole(): void {
  if (!import.meta.env.DEV) return;

  const mobile = isMobileLike();
  devLog('[dev-tools] mobileLike =', mobile);

  if (!mobile) return;

  const schedule =
    (window as any).requestIdleCallback ||
    ((cb: Function) => setTimeout(() => cb(), 0));

  schedule(async () => {
    try {
      // 已存在实例则跳过
      const w = window as any;
      if (w.eruda && typeof w.eruda.get === 'function') {
        devLog('[dev-tools] eruda already present');
        return;
      }

      const mod = await import('eruda');
      const eruda = (mod as any).default || mod;

      if (!(eruda as any)._isInit) {
        eruda.init();                 // 打开控制台
        (eruda as any)._isInit = true;
        devLog('[dev-tools] eruda initialized');
      } else {
        devLog('[dev-tools] eruda already initialized (flag)');
      }
    } catch (err) {
      devLog('[dev-tools] eruda load failed:', err);
    }
  });
}
