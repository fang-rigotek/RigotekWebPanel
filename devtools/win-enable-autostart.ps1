<#
文件：win-enable-autostart.ps1
用途：注册“用户登录时”静默后台启动 Vite（计划任务）
特性：
- 自动本地化输出：简体/繁体/英文
- 相对路径定位 rwp_frontend
- 隐藏窗口运行（-WindowStyle Hidden）
- 注册阶段自动提权（避免“拒绝访问”）
- 以当前用户、RunLevel=Limited、LogonType=Interactive 运行
- 不显式立即启动；仅在登录时触发
参数：
- -TaskName  任务名（默认：RigotekWebPanel-Dev）
- -Command   启动命令（默认：pnpm dev）
#>

param(
  [string]$TaskName = 'RigotekWebPanel-Dev',
  [string]$Command  = 'pnpm dev'
)

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
$scriptDir   = Split-Path -Parent $PSCommandPath
$projectRoot = Split-Path -Parent $scriptDir
$frontendDir = Join-Path $projectRoot 'rwp_frontend'
if (-not (Test-Path $frontendDir)) { throw "Frontend directory not found: $frontendDir" }

Write-Localized `
  "Registering silent autostart: $TaskName`nFrontend: $frontendDir`nCommand: $Command" `
  "注册静默开机自启任务：$TaskName`n前端目录：$frontendDir`n执行命令：$Command" `
  "註冊靜默開機自啟任務：$TaskName`n前端目錄：$frontendDir`n執行指令：$Command"

# ==== 提权工具 ====
function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-WithElevation {
    if (Test-IsAdmin) { return }
    Write-Localized "Requesting elevation (UAC) ..." "需要管理员权限，正在请求 UAC ..." "需要系統管理員權限，正在請求 UAC ..."

    # 使用数组传参，避免复杂转义与引号问题
    $startArgs = @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass',
        '-File', $PSCommandPath,
        '-TaskName', $TaskName,
        '-Command',  $Command
    )
    Start-Process 'powershell.exe' -Verb RunAs -ArgumentList $startArgs | Out-Null
    exit
}

# ==== 注册任务 ====
function Register-DevAutostartTask {
    # 当前用户（DOMAIN\Username 形式）
    $userId = if (![string]::IsNullOrWhiteSpace($env:USERDOMAIN)) {
        "$($env:USERDOMAIN)\$($env:USERNAME)"
    } else {
        $env:USERNAME
    }

    # 动作：隐藏窗口执行 PowerShell，cd 到前端目录后运行命令
    $exe   = 'powershell.exe'
    $psCmd = "Set-Location `'$frontendDir`'; $Command"
    $action = New-ScheduledTaskAction -Execute $exe -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$psCmd`""

    # 触发器：用户登录
    $trigger   = New-ScheduledTaskTrigger -AtLogOn
    # 主体：Limited + Interactive（与您环境的枚举值匹配）
    $principal = New-ScheduledTaskPrincipal -UserId $userId -RunLevel Limited -LogonType Interactive

    # 已存在则先移除再注册
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal | Out-Null
}

# ==== 主流程 ====
Invoke-WithElevation
Register-DevAutostartTask

Write-Localized `
  "✅ Autostart registered. It will run silently on next logon. Check: schtasks /Query /TN `"$TaskName`"" `
  "✅ 已注册。将在下次登录时后台静默启动。检查：schtasks /Query /TN `"$TaskName`"" `
  "✅ 已註冊。將在下次登入時後台靜默啟動。檢查：schtasks /Query /TN `"$TaskName`""
