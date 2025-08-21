<#
文件：win-enable-autostart.ps1
用途：注册“用户登录时”自动、静默后台启动 Vite 开发服务器（Windows 任务计划程序）
特性：
- 相对路径定位 rwp_frontend；隐藏窗口运行（-WindowStyle Hidden）
- 自检并在**注册阶段**自动提权（管理员），避免“拒绝访问”
- 任务本身以当前用户、RunLevel=Limited、LogonType=Interactive 运行（开发环境推荐）
- 同名任务存在则自动替换
可选参数：
- -TaskName  指定任务名（默认：RigotekWebPanel-Dev）
- -Command   指定启动命令（默认：pnpm dev）
#>

param(
  [string]$TaskName = 'RigotekWebPanel-Dev',
  [string]$Command  = 'pnpm dev'
)

$ErrorActionPreference = 'Stop'

# === 路径推导（仅依赖脚本自身位置） ===
$scriptDir   = Split-Path -Parent $PSCommandPath          # devtools 目录
$projectRoot = Split-Path -Parent $scriptDir              # RigotekWebPanel 根目录
$frontendDir = Join-Path $projectRoot 'rwp_frontend'      # 前端目录
if (-not (Test-Path $frontendDir)) { throw "未找到前端目录：$frontendDir" }

Write-Host "将注册静默自启任务：$TaskName"
Write-Host "前端目录：$frontendDir"
Write-Host "执行命令：$Command"

# -------------------------
# 函数：Test-IsAdmin
# 作用：检测当前 PowerShell 是否以管理员身份运行
# 返回：$true / $false
# -------------------------
function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p  = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# -------------------------
# 函数：Invoke-WithElevation
# 作用：若当前非管理员，则以管理员身份重新启动本脚本，并传递原有参数（-TaskName/-Command）
# 说明：仅用于“注册任务”阶段需要管理员权限；任务实际运行仍是普通权限
# -------------------------
function Invoke-WithElevation {
  if (Test-IsAdmin) { return }

  Write-Host "需要管理员权限来注册计划任务，正在请求 UAC ..."
  $args = @(
    '-NoProfile','-ExecutionPolicy','Bypass',
    '-File', "`"$PSCommandPath`"",
    '-TaskName', "`"$TaskName`"",
    '-Command',  "`"$Command`""
  )
  Start-Process powershell.exe -Verb RunAs -ArgumentList $args | Out-Null
  exit
}

# -------------------------
# 函数：Register-DevAutostartTask
# 作用：
#   - 创建“用户登录时”触发的计划任务；
#   - 隐藏窗口运行 PowerShell：Set-Location 到前端目录后执行 $Command；
#   - 以当前用户、RunLevel=Limited、LogonType=Interactive 运行。
# -------------------------
function Register-DevAutostartTask {
  # 组装用户标识（某些系统偏好 DOMAIN\Username）
  $userId = if (![string]::IsNullOrWhiteSpace($env:USERDOMAIN)) {
    "$($env:USERDOMAIN)\$($env:USERNAME)"
  } else {
    $env:USERNAME
  }

  # 确保 ScheduledTasks 模块可用
  if (-not (Get-Module -ListAvailable -Name ScheduledTasks)) {
    throw "未找到 ScheduledTasks 模块。请在支持任务计划程序的 Windows 环境运行。"
  }

  # 1) 动作：隐藏窗口执行 powershell.exe
  $exe   = 'powershell.exe'
  $psCmd = "Set-Location `'$frontendDir`'; $Command"
  $action = New-ScheduledTaskAction `
    -Execute $exe `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$psCmd`""

  # 2) 触发器：用户登录
  $trigger = New-ScheduledTaskTrigger -AtLogOn

  # 3) 主体：当前用户 + RunLevel Limited + LogonType Interactive
  $principal = New-ScheduledTaskPrincipal -UserId $userId -RunLevel Limited -LogonType Interactive

  # 4) 已存在则移除再注册
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal | Out-Null
}

# --- 主执行流程 ---
Invoke-WithElevation
Register-DevAutostartTask

Write-Host "✅ 已添加【静默】开机自启任务：$TaskName（登录即后台启动）。"
Write-Host "提示：如需立即测试，可运行：Start-ScheduledTask -TaskName `"$TaskName`""
Write-Host "     停止方式：任务管理器结束 Node/Vite 进程、注销/重启，或运行 win-disable-autostart.ps1 移除任务。"
