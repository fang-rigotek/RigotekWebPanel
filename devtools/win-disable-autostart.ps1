<#
文件：win-disable-autostart.ps1
用途：移除“Vite 开机自启”计划任务
特性：
- 自动本地化输出：简体/繁体/英文
- 自动提权（删除计划任务通常需要管理员）
- 幂等：不存在则提示已移除
参数：
- -TaskName  要移除的任务名（默认：RigotekWebPanel-Dev）
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

# ==== 提权工具 ====
function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-WithElevation {
    if (Test-IsAdmin) { return }
    Write-Localized "Requesting elevation (UAC) ..." "需要管理员权限，正在请求 UAC ..." "需要系統管理員權限，正在請求 UAC ..."
    $startArgs = @(
        '-NoProfile','-ExecutionPolicy','Bypass',
        '-File',"`"$PSCommandPath`"",
        '-TaskName',"`"$TaskName`""
    )
    Start-Process powershell.exe -Verb RunAs -ArgumentList $startArgs | Out-Null
    exit
}

# ==== 移除任务 ====
function Unregister-DevAutostartTask {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Localized "✅ Removed task: $TaskName" "✅ 已移除任务：$TaskName" "✅ 已移除任務：$TaskName"
    } else {
        Write-Localized "ℹ️ Task not found: $TaskName (already removed)" "ℹ️ 未找到任务：$TaskName（可能已移除）" "ℹ️ 未找到任務：$TaskName（可能已移除）"
    }
}

# ==== 主流程 ====
Invoke-WithElevation
Unregister-DevAutostartTask
