// rwp_frontend/vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@wasm': fileURLToPath(new URL('./wasm', import.meta.url)), //
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    allowedHosts: ['betadevelop.com', 'localhost'],
  },
});
