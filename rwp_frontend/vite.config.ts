// rwp_frontend/vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@wasm': fileURLToPath(new URL('./wasm', import.meta.url)), // ✅ 新增
    },
    // 如果你的 wasm 包是 workspace 的符号链接，偶尔需要这行：
    // preserveSymlinks: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    allowedHosts: ['betadevelop.com', 'localhost'],
  },
});
