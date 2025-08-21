<#
文件：win-disable-autostart.ps1
用途：移除已注册的开机自启任务
#>

$ErrorActionPreference = 'Stop'
$taskName = 'RigotekWebPanel-Dev'

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "✅ 已移除开机自启任务：$taskName"
} else {
  Write-Host "未找到任务：$taskName（可能已移除）"
}
