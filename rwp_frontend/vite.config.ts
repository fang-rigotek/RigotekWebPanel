// vite.config.ts
// 作用：Vite 配置文件
// 本次更新：增加开发服务器配置 server.host / server.port / server.allowedHosts

import { defineConfig } from 'vite'; // Vite 的类型安全配置方法
import preact from '@preact/preset-vite'; // 让 Vite 正确识别并优化 Preact/JSX/TSX
import { fileURLToPath, URL } from 'node:url'; // Node 内置模块，用于跨平台路径解析

export default defineConfig({
  plugins: [preact()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)), // 路径别名：@ → src
    },
  },

  server: {
    host: '127.0.0.1', // 开发服务器绑定的地址
    port: 5173,        // 开发服务器端口
    allowedHosts: [
      'betadevelop.com', // 允许通过 betadevelop.com 访问
      'localhost'        // 保留 localhost 以便本机调试
    ]
  }
});
