# Development Environment Maintenance Scripts

## Windows

Run the following commands in the `devtools/` directory with **PowerShell as Administrator**.

### 1. Setup Development Environment

Install Node.js (LTS), enable pnpm, and install dependencies according to the lockfile:

```powershell
powershell -ExecutionPolicy Bypass -File .\win-setup.ps1
```

After installation, you can enter the frontend directory and run:

```powershell
cd ..\rwp_frontend
pnpm dev
```

---

### 2. Enable Autostart

Register a scheduled task that starts the Vite development server **silently in the background** on user login:

```powershell
powershell -ExecutionPolicy Bypass -File .\win-enable-autostart.ps1
```

---

### 3. Disable Autostart

Remove the scheduled task created earlier:

```powershell
powershell -ExecutionPolicy Bypass -File .\win-disable-autostart.ps1

# Check whether the task exists:
schtasks /Query /TN "RigotekWebPanel-Dev"
```

---

### 4. Cleanup Development Environment

Remove `node_modules` and pnpm cache (optionally uninstall Node.js):

```powershell
# Only cleanup dependencies
powershell -ExecutionPolicy Bypass -File .\win-cleanup.ps1

# Cleanup dependencies + uninstall Node.js
powershell -ExecutionPolicy Bypass -File .\win-cleanup.ps1 -UninstallNode
```
