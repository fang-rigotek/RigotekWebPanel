# 开发环境维护脚本

## Windows 使用说明

在 `devtools/` 目录下使用 PowerShell 执行以下命令即可。  
（如遇权限问题，尝试加上 `-ExecutionPolicy Bypass` 参数）

### 1. 配置开发环境
安装 Node.js (LTS)、启用 pnpm，并按锁文件安装依赖：

```powershell
powershell -ExecutionPolicy Bypass -File .\win-setup.ps1
```

执行完成后，你就可以进入前端目录运行：

```powershell
cd ..\rwp_frontend
pnpm dev
```

---

### 2. 卸载开发环境

清理 `node_modules` 和 pnpm 缓存（可选卸载 Node.js）：

```powershell
# 只清理依赖
powershell -ExecutionPolicy Bypass -File .\win-cleanup.ps1

# 清理依赖 + 卸载 Node.js
powershell -ExecutionPolicy Bypass -File .\win-cleanup.ps1 -UninstallNode
```

---

### 3. 添加开机自启

注册一个计划任务，在用户登录时 **静默后台** 启动 Vite 开发服务：

```powershell
powershell -ExecutionPolicy Bypass -File .\win-enable-autostart.ps1
```

---

### 4. 移除开机自启

删除前面注册的计划任务：

```powershell
powershell -ExecutionPolicy Bypass -File .\win-disable-autostart.ps1
```