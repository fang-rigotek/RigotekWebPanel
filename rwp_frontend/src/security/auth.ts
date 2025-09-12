import { getDeviceSeed, toB64Url } from "@/utils/crypto";

export interface UserToken {
  token: string;
  expiresAt: number;
}

export interface DeviceToken {
  token: string;
  expiresAt: number;
}

declare const APP_ID: string;
declare const APP_VERSION: string;

/** 生成设备指纹（最小可用集 + WebCrypto SHA-256 -> base64url） */
export async function genDeviceFingerprint(): Promise<string> {
  try {
    const deviceSeed = await getDeviceSeed();
    if (!deviceSeed) return "";

    // 采集最小可用集（带兜底，做必要的分桶/截断）
    let primaryLanguage = "na";
    let timeZone = "na";
    try {
      primaryLanguage = navigator.language ?? "na";
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "na";
    } catch (e) {
      console.error("fingerprint: language/timeZone error:", e);
    }

    let sw = -1, sh = -1, colorDepth = -1, dpr = 1;
    try {
      sw = Number.isFinite(screen?.width) ? screen.width : -1;
      sh = Number.isFinite(screen?.height) ? screen.height : -1;
      colorDepth = Number.isFinite(screen?.colorDepth) ? screen.colorDepth : -1;
      const dprRaw = typeof window.devicePixelRatio === "number" ? window.devicePixelRatio : 1;
      dpr = Math.round(dprRaw * 100) / 100; // 保留 2 位
    } catch (e) {
      console.error("fingerprint: screen/dpr error:", e);
    }

    let cores = 0, memBucket = "≤4", touchBucket = "0";
    try {
      const hc = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 0;
      cores = Math.min(hc, 16); // 截断 ≤16

      const dm = (navigator as any).deviceMemory;
      const mem = typeof dm === "number" ? dm : 0;
      memBucket = mem <= 4 ? "≤4" : mem <= 8 ? "6–8" : mem <= 16 ? "12–16" : ">16";

      const mtp = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;
      touchBucket = mtp === 0 ? "0" : (mtp === 1 ? "1" : "2+");
    } catch (e) {
      console.error("fingerprint: hardware/touch error:", e);
    }

    // 固定顺序串联（k=v 按行拼接）
    const canonical = [
      `appId=${APP_ID}`,
      `appVersion=${APP_VERSION}`,
      `seed=${deviceSeed}`,
      `lang=${primaryLanguage}`,
      `tz=${timeZone}`,
      `sw=${sw}`,
      `sh=${sh}`,
      `cd=${colorDepth}`,
      `dpr=${dpr}`,
      `hc=${cores}`,
      `mem=${memBucket}`,
      `touch=${touchBucket}`,
    ].join("\n");

    // WebCrypto SHA-256
    if (!("crypto" in window) || !("subtle" in crypto)) {
      console.error("genDeviceFingerprint error: WebCrypto SubtleCrypto unavailable");
      return "";
    }
    const data = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest("SHA-256", data);

    // 输出 base64url
    return toB64Url(new Uint8Array(digest));
  } catch (err) {
    console.error("genDeviceFingerprint error:", err);
    return "";
  }
}