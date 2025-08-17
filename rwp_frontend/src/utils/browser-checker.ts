// src/utils/browser-checker.ts
// 职责：先做“内核主版本”检测；若版本不达标/无法识别，再用“特性检测（WASM + SSE）”兜底。
// 设计：保持对外主函数 checkBrowserCompatibility 不变（Boot.tsx 无需改）。
// 兼容：尽量使用基础 API；所有检测都包裹 try-catch，避免旧环境抛错。

export type BrowserEngine = 'chromium' | 'firefox' | 'safari' | 'unknown';

export interface BrowserCheckResult {
  ok: boolean;                  // 最终是否放行
  engine: BrowserEngine;        // 识别到的内核
  versionMajor: number | null;  // 主版本（不可得为 null）
  minRequired: number | null;   // 对应内核最低要求（unknown 时为 null）
  rawUA: string;                // 原始 UA

  // 新增的辅助信息（可选用，不影响现有调用）
  via?: 'version' | 'features' | 'none'; // 判定途径：版本/特性/均失败
  details?: {
    versionOk?: boolean;
    wasm?: boolean;
    sse?: boolean;
  };
}

/** 仅看主版本的最低线（你可按需调整） */
const MIN_VERSION: Record<Exclude<BrowserEngine, 'unknown'>, number> = {
  chromium: 70,
  firefox: 68,
  safari: 13,
};

export function detectEngineAndVersion(ua: string): {
  engine: BrowserEngine;
  versionMajor: number | null;
} {
  const u = ua || '';
  const isIOS = /\b(iPad|iPhone|iPod)\b/i.test(u);

  // iOS 上统一视作 WebKit（Safari 内核）
  if (isIOS || (/Safari\/\d+/i.test(u) && /Version\/(\d+)/i.test(u) && !/Chrome|Chromium|Edg/i.test(u))) {
    const m = u.match(/Version\/(\d+)/i);
    const major = m ? parseInt(m[1], 10) : null;
    return { engine: 'safari', versionMajor: Number.isFinite(major as number) ? major : null };
  }

  if (/Firefox\/\d+/i.test(u)) {
    const m = u.match(/Firefox\/(\d+)/i);
    const major = m ? parseInt(m[1], 10) : null;
    return { engine: 'firefox', versionMajor: Number.isFinite(major as number) ? major : null };
  }

  if (/Chrome\/\d+|Chromium\/\d+/i.test(u)) {
    const m = u.match(/Chrome\/(\d+)/i) || u.match(/Chromium\/(\d+)/i);
    const major = m ? parseInt(m[1], 10) : null;
    return { engine: 'chromium', versionMajor: Number.isFinite(major as number) ? major : null };
  }

  return { engine: 'unknown', versionMajor: null };
}

/** 轻量特性检测：WASM + SSE（全部同步，微小开销） */
function featuresSupported(): { wasm: boolean; sse: boolean } {
  let wasm = false;
  let sse = false;

  try {
    // WebAssembly 是否存在 + validate 一个最小模块（不编译，不运行）
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : (window as any);
    if (g && g.WebAssembly && typeof g.WebAssembly.validate === 'function') {
      // 最小 wasm 模块：\0asm + 版本 1
      const minimal = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
      wasm = g.WebAssembly.validate(minimal);
    }
  } catch {
    wasm = false;
  }

  try {
    sse = typeof (globalThis as any).EventSource !== 'undefined';
  } catch {
    try {
      sse = typeof (window as any).EventSource !== 'undefined';
    } catch {
      sse = false;
    }
  }

  return { wasm, sse };
}

/**
 * 对外主函数：先做版本判断，失败再做特性兜底。
 * - 版本满足：ok=true, via='version'
 * - 版本不满足/未知，但 (wasm && sse)：ok=true, via='features'
 * - 否则：ok=false, via='none'
 */
export function checkBrowserCompatibility(
  ua: string = (typeof navigator !== 'undefined' ? navigator.userAgent : '')
): BrowserCheckResult {
  const { engine, versionMajor } = detectEngineAndVersion(ua);

  // 先尝试“版本线”
  if (engine !== 'unknown' && versionMajor != null) {
    const minRequired = MIN_VERSION[engine];
    const versionOk = versionMajor >= minRequired;
    if (versionOk) {
      return {
        ok: true,
        engine,
        versionMajor,
        minRequired,
        rawUA: ua,
        via: 'version',
        details: { versionOk: true },
      };
    }

    // 版本不够 → 再做特性检测兜底
    const { wasm, sse } = featuresSupported();
    if (wasm && sse) {
      return {
        ok: true,
        engine,
        versionMajor,
        minRequired,
        rawUA: ua,
        via: 'features',
        details: { versionOk: false, wasm, sse },
      };
    }

    return {
      ok: false,
      engine,
      versionMajor,
      minRequired,
      rawUA: ua,
      via: 'none',
      details: { versionOk: false, ...(featuresSupported()) },
    };
  }

  // 无法识别内核/版本 → 直接走特性兜底
  const { wasm, sse } = featuresSupported();
  if (wasm && sse) {
    return {
      ok: true,
      engine: 'unknown',
      versionMajor: null,
      minRequired: null,
      rawUA: ua,
      via: 'features',
      details: { wasm, sse },
    };
  }

  return {
    ok: false,
    engine: 'unknown',
    versionMajor: null,
    minRequired: null,
    rawUA: ua,
    via: 'none',
    details: { wasm, sse },
  };
}
