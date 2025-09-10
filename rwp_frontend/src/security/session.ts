export const isConnSecure = (() : boolean => {
  // 1) https 一票通过
  if (window.location.protocol === "https:") return true;

  const host = window.location.hostname.toLowerCase();

  // 2) 回环地址
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;

  // 3) IPv4 内网地址（顺序：192 → 172 → 10）
  const parts = host.split(".");
  if (parts.length === 4) {
    const [a, b] = parts.map(x => Number(x));
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 10) return true;
  }

  // 4) IPv6 ULA fc00::/7 (fcxx:... or fdxx:...)
  if (host.startsWith("fc") || host.startsWith("fd")) return true;

  // 5) IPv6 链路本地 fe80::/10 (fe8x/fe9x/feax/febx)
  if (
    host.startsWith("fe8") ||
    host.startsWith("fe9") ||
    host.startsWith("fea") ||
    host.startsWith("feb")
  ) {
    return true;
  }

  // 其它一律不安全
  return false;
})()

