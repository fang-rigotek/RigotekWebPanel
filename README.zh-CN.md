# 良构面板

良构面板 (Rigotek Panel) 是一个现代化、轻量级、注重安全性的 Web 面板，旨在以极低资源占用流畅运行，即便部署在 **512MB 内存、1 核 CPU** 的低配服务器上。  

实际效果优先，积极采用新技术（如 WebAssembly）；最小化编程，舍弃对老旧环境的兼容以避免冗余代码；在依赖层面优先采用轻量化实现（如 Preact），并仅启用必要 *features*，以降低资源占用；注重安全设计，即使未启用 HTTPS（不推荐），也通过 ECDH 密钥交换等机制对会话加密，减少明文传输的风险。  

## ✨ 特点

🚀 **Rust 后端**  
- 使用 Rust 开发，避免传统 C/C++ 常见的内存安全问题。  
- 适配 **Linux 主机**（较新的「Debian 系」与「RHEL 系」发行版）。  

🎨 **TypeScript 前端**  
- 整体以 TypeScript 开发，部分计算密集型逻辑通过 Rust 编译的 WebAssembly 模块加速。  
- 适配支持 **ECMAScript 2022 与 WebAssembly** 的现代浏览器。  
