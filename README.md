# Rigotek Panel

Rigotek Panel is a modern, lightweight, and security-oriented web panel, designed to run smoothly on low-end servers with very limited resources, even with **512MB RAM and a single CPU core**.  

It prioritizes practical results by actively adopting new technologies (such as WebAssembly); follows the principle of minimal programming by dropping legacy environment compatibility to avoid redundant code; prefers lightweight dependencies (such as Preact) and enables only the necessary *features* to reduce overhead; and emphasizes security design by encrypting sessions with ECDH key exchange even when HTTPS is not enabled (not recommended), minimizing the risk of plaintext transmission.  

## ✨ Features

🚀 **Rust Backend**  
- Developed in Rust, avoiding common memory safety issues found in traditional C/C++.  
- Supports **Linux hosts** (recent LTS releases of the **Debian** and **RHEL** families).  

🎨 **TypeScript Frontend**  
- Entirely developed in TypeScript, with compute-intensive logic accelerated by WebAssembly modules compiled from Rust.  
- Compatible with modern browsers supporting **ECMAScript 2022** and **WebAssembly**.  
