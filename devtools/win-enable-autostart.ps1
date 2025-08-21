<#
文件：win-enable-autostart.ps1
用途：注册“用户登录时”自动、静默后台启动 Vite（Task Scheduler）
说明：
- 基于脚本自身位置推导前端目录
- 使用 -WindowStyle Hidden 静默运行，不保留窗口
- 如需在未登录时也运行，建议改用服务管理器（如 NSSM/PM2）—但开发环境通常仅需登录会话
#>

$ErrorActionPreference = 'Stop'

$scriptDir   = Split-Path -Parent $PSCommandPath
$projectRoot = Split-Path -Parent $scriptDir
$frontendDir = Join-Path $projectRoot 'rwp_frontend'
if (-not (Test-Path $frontendDir)) { throw "未找到前端目录：$frontendDir" }

$taskName = 'RigotekWebPanel-Dev'
Write-Host "Registering task (silent): $taskName"
Write-Host "FrontendDir: $frontendDir"

# 任务动作：隐藏窗口运行 PowerShell，切到前端目录并执行 pnpm dev
# 注意：-WindowStyle Hidden 会隐藏 PowerShell 窗口；要停止请在任务管理器中结束 Node/Vite 进程或注销/重启
$psCmd = "Set-Location `'$frontendDir`'; pnpm dev"
$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$psCmd`""

# 触发器：用户登录时
$trigger = New-ScheduledTaskTrigger -AtLogOn

# 以当前用户、最小权限运行
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel LeastPrivilege -LogonType InteractiveToken

# 已存在则替换
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal

Write-Host "✅ 已添加【静默】开机自启任务（登录即后台启动）。"
