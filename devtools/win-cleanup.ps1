<#
文件：win-cleanup.ps1
用途：清理当前项目的前端开发环境
功能：
- 删除 node_modules
- 清理 pnpm 缓存
- 可选：卸载 Node.js LTS（传入 -UninstallNode）
说明：
- 仅依赖脚本自身位置推导 rwp_frontend，不写死盘符
- 避免使用 else，降低解析歧义风险
#>

param(
  [switch]$UninstallNode  # 传入 -UninstallNode 时会卸载 Node.js LTS
)

$ErrorActionPreference = 'Stop'

# === 路径推导（基于脚本自身位置） ===
$scriptDir   = Split-Path -Parent $PSCommandPath      # devtools
$projectRoot = Split-Path -Parent $scriptDir          # RigotekWebPanel
$frontendDir = Join-Path $projectRoot 'rwp_frontend'  # 前端目录
if (-not (Test-Path $frontendDir)) { throw "未找到前端目录：$frontendDir" }

Write-Host "FrontendDir: $frontendDir"

# -------------------------
# 函数：Remove-Dependencies
# 作用：
#   - 若存在 node_modules 则删除
#   - 无论是否存在 pnpm 都尝试清理 pnpm store（失败会给出警告）
# -------------------------
function Remove-Dependencies {
  $modulesPath = Join-Path $frontendDir 'node_modules'

  if (Test-Path $modulesPath) {
    Write-Host "正在删除 node_modules..."
    Remove-Item -Recurse -Force $modulesPath
  }

  if (-not (Test-Path $modulesPath)) {
    Write-Host "node_modules 不存在（或已删除），跳过删除步骤。"
  }

  try {
    Write-Host "正在清理 pnpm store..."
    Push-Location $frontendDir
    pnpm store prune
    Pop-Location
  } catch {
    Write-Warning "清理 pnpm 缓存失败（可能未安装 pnpm）：$($_.Exception.Message)"
  }
}

# -------------------------
# 函数：Uninstall-NodeIfRequested
# 作用：
#   - 若传入 -UninstallNode 参数，则卸载 Node.js LTS
#   - 若非管理员，自动以管理员身份重启本脚本并继续
# -------------------------
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

  winget uninstall -e --id OpenJS.NodeJS.LTS
}

# --- 主执行流程 ---
Remove-Dependencies
Uninstall-NodeIfRequested

Write-Host "`n✅ 清理完成。"
