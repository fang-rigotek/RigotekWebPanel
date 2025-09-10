// src/utils/crypto.ts

// base64url 编码（去掉 =，替换 +/ 为 -_）
export function toB64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// base64url 解码为字节
export function fromB64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// 安全随机字节（IV/nonce/salt）
export function randomBytes(len: number): Uint8Array {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a;
}
