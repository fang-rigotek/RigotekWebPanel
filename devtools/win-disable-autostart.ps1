<#
文件：win-disable-autostart.ps1
用途：移除 Vite 前端开机自启计划任务，并清理生成的启动脚本
#>

param([string]$TaskName = 'RigotekWebPanel-Dev')

$ErrorActionPreference = 'Stop'

function Write-Localized {
    param([string]$en,[string]$zhCN,[string]$zhTW)
    switch -Wildcard ($PSUICulture) {
        'zh-CN' { Write-Host $zhCN; break }
        'zh-TW' { Write-Host $zhTW; break }
        'zh-HK' { Write-Host $zhTW; break }
        default { Write-Host $en; break }
    }
}

function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Invoke-WithElevation {
    if (Test-IsAdmin) { return }
    Write-Localized "Requesting elevation (UAC) ..." "需要管理员权限，正在请求 UAC ..." "需要系統管理員權限，正在請求 UAC ..."
    $startArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$PSCommandPath,'-TaskName',$TaskName)
    Start-Process 'powershell.exe' -Verb RunAs -ArgumentList $startArgs | Out-Null
    exit
}

function Unregister-DevAutostartTask {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Localized "✅ Removed task: $TaskName" "✅ 已移除任务：$TaskName" "✅ 已移除任務：$TaskName"
    } else {
        Write-Localized "ℹ️ Task not found: $TaskName" "ℹ️ 未找到任务：$TaskName" "ℹ️ 未找到任務：$TaskName"
    }

    $scriptDir = Split-Path -Parent $PSCommandPath
    $genDir    = Join-Path $scriptDir '.generated'
    if (Test-Path $genDir) {
        Remove-Item -Recurse -Force $genDir
        Write-Localized "🧹 Removed generated dir: $genDir" "🧹 已删除生成目录：$genDir" "🧹 已刪除生成目錄：$genDir"
    }
}

Invoke-WithElevation
Unregister-DevAutostartTask
