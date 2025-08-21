<#
文件：win-disable-autostart.ps1
用途：移除“Vite 开发服务器开机自启”的计划任务
特性：
- 自动检测管理员权限，不足时自动以管理员重启（UAC）
- 仅按任务名移除；默认任务名与启用脚本一致（RigotekWebPanel-Dev）
- 不依赖固定盘符或父目录；此脚本只负责删除计划任务
可选参数：
- -TaskName  指定要移除的任务名（默认：RigotekWebPanel-Dev）
#>

param(
  [string]$TaskName = 'RigotekWebPanel-Dev'
)

$ErrorActionPreference = 'Stop'

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
# 作用：若当前非管理员，则以管理员身份重新启动本脚本，并传递原有参数（-TaskName）
# 说明：删除计划任务通常需要管理员权限；此步骤仅用于“移除阶段”的提权
# -------------------------
function Invoke-WithElevation {
  if (Test-IsAdmin) { return }

  Write-Host "需要管理员权限移除计划任务，正在请求 UAC ..."
  $startArgs = @(
    '-NoProfile','-ExecutionPolicy','Bypass',
    '-File', "`"$PSCommandPath`"",
    '-TaskName', "`"$TaskName`""
  )
  Start-Process powershell.exe -Verb RunAs -ArgumentList $startArgs | Out-Null
  exit
}

# -------------------------
# 函数：Unregister-DevAutostartTask
# 作用：
#   - 查找名为 $TaskName 的计划任务；
#   - 若找到则无确认地移除；
#   - 若未找到则提示已不存在（幂等设计）
# -------------------------
function Unregister-DevAutostartTask {
  # 确保 ScheduledTasks 模块可用
  if (-not (Get-Module -ListAvailable -Name ScheduledTasks)) {
    throw "未找到 ScheduledTasks 模块。请在支持任务计划程序的 Windows 环境运行。"
  }

  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "✅ 已移除开机自启任务：$TaskName"
  } else {
    Write-Host "ℹ️ 未找到任务：$TaskName（可能已移除）"
  }
}

# --- 主执行流程 ---
Invoke-WithElevation
Unregister-DevAutostartTask
