<#
文件：win-enable-autostart.ps1
用途：注册“用户登录时”静默后台启动 Vite（计划任务）
特性：
- 使用 corepack pnpm dev（单一方案）
- 在项目目录 devtools\.generated\ 下生成 launch-dev.ps1
- 启动脚本不再写日志，只后台隐藏运行
- 登录触发，RunLevel=Limited，LogonType=Interactive
- 无限运行时长 (ExecutionTimeLimit=0)
- 注册时自动提权
#>

param([string]$TaskName = 'RigotekWebPanel-Dev')

$ErrorActionPreference = 'Stop'

# ==== 本地化输出工具 ====
function Write-Localized {
    param([string]$en,[string]$zhCN,[string]$zhTW)
    switch -Wildcard ($PSUICulture) {
        'zh-CN' { Write-Host $zhCN; break }
        'zh-TW' { Write-Host $zhTW; break }
        'zh-HK' { Write-Host $zhTW; break }
        default { Write-Host $en; break }
    }
}

# ==== 路径推导 ====
$scriptDir   = Split-Path -Parent $PSCommandPath   # devtools
$projectRoot = Split-Path -Parent $scriptDir       # RigotekWebPanel
$frontendDir = Join-Path $projectRoot 'rwp_frontend'
$genDir      = Join-Path $scriptDir '.generated'
$launcher    = Join-Path $genDir 'launch-dev.ps1'

if (-not (Test-Path $frontendDir)) { throw "Frontend directory not found: $frontendDir" }
New-Item -ItemType Directory -Force -Path $genDir | Out-Null

Write-Localized `
  "Registering autostart (background, unlimited): $TaskName`nFrontend: $frontendDir`nLauncher: $launcher" `
  "注册开机自启（后台、无限时）：$TaskName`n前端：$frontendDir`n启动脚本：$launcher" `
  "註冊開機自啟（背景、無限時）：$TaskName`n前端：$frontendDir`n啟動腳本：$launcher"

# ==== 提权 ====
function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Invoke-WithElevation {
    if (Test-IsAdmin) { return }
    Write-Localized "Requesting elevation (UAC) ..." "需要管理员权限，正在请求 UAC ..." "需要系統管理員權限，正在請求 UAC ..."
    $startArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File', $PSCommandPath,'-TaskName',$TaskName)
    Start-Process 'powershell.exe' -Verb RunAs -ArgumentList $startArgs | Out-Null
    exit
}

# ==== 生成启动脚本 ====
function New-LauncherScript {
    $content = @"
`$ErrorActionPreference = 'Stop'
Set-Location "$frontendDir"
Start-Process 'corepack' -ArgumentList 'pnpm','dev' -WorkingDirectory "$frontendDir" -WindowStyle Hidden
"@
    $content | Set-Content -Encoding UTF8 -Path $launcher
    return $launcher
}

# ==== 注册任务 ====
function Register-DevAutostartTask {
    $userId = if (![string]::IsNullOrWhiteSpace($env:USERDOMAIN)) { "$($env:USERDOMAIN)\$($env:USERNAME)" } else { $env:USERNAME }

    $null = New-LauncherScript

    $exe     = 'powershell.exe'
    $argLine = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
    $action  = New-ScheduledTaskAction -Execute $exe -Argument $argLine

    $trigger   = New-ScheduledTaskTrigger -AtLogOn
    $principal = New-ScheduledTaskPrincipal -UserId $userId -RunLevel Limited -LogonType Interactive
    $settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit 0

    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null

    Write-Localized "✅ Autostart registered." "✅ 已注册。" "✅ 已註冊。"
}

Invoke-WithElevation
Register-DevAutostartTask
