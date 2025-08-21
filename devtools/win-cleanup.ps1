<#
文件：win-cleanup.ps1
用途：清理前端依赖（node_modules、pnpm 缓存）；可选卸载 Node（参数 -UninstallNode）
说明：使用核准动词；仅依赖脚本自身路径推导
#>

param(
  [switch]$UninstallNode  # 传入 -UninstallNode 时，将尝试卸载 Node LTS（需要管理员）
)

$ErrorActionPreference = 'Stop'

$scriptDir   = Split-Path -Parent $PSCommandPath
$projectRoot = Split-Path -Parent $scriptDir
$frontendDir = Join-Path $projectRoot 'rwp_frontend'
if (-not (Test-Path $frontendDir)) { throw "未找到前端目录：$frontendDir" }

Write-Host "FrontendDir: $frontendDir"

function Remove-Dependencies {
  if (Test-Path (Join-Path $frontendDir 'node_modules')) {
    Write-Host "Removing node_modules..."
    Remove-Item -Recurse -Force (Join-Path $frontendDir 'node_modules')
  } else {
    Write-Host "node_modules 不存在，跳过。"
  }

  # 清理 pnpm store（无需知道具体路径，交给 pnpm）
  try {
    Write-Host "Cleaning pnpm store..."
    Push-Location $frontendDir
    pnpm store prune
    Pop-Location
  } catch {
    Write-Warning "pnpm 清理失败（可能未安装 pnpm）：$($_.Exception.Message)"
  }
}

function Uninstall-NodeIfRequested {
  if (-not $UninstallNode) { return }
  Write-Host "将卸载 Node.js LTS..."
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p  = New-Object Security.Principal.WindowsPrincipal($id)
  $isAdmin = $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Host "需要管理员权限卸载 Node.js，正在以管理员身份重启本脚本..."
    Start-Process powershell.exe -Verb RunAs -ArgumentList @(
      "-NoProfile","-ExecutionPolicy","Bypass",
      "-File","`"$PSCommandPath`"","-UninstallNode"
    )
    exit
  }

  # 卸载 Node LTS
  winget uninstall -e --id OpenJS.NodeJS.LTS
}

Remove-Dependencies
Uninstall-NodeIfRequested

Write-Host "✅ 清理完成。"
