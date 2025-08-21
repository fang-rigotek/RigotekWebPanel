<#
文件：win-cleanup.ps1
用途：清理前端开发环境
特性：
- 自动本地化输出：简体/繁体/英文
- 删除 node_modules、清理 pnpm 缓存
- 可选：-UninstallNode 卸载 Node.js LTS（需要时自动提权）
#>

param([switch]$UninstallNode)

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

Write-Localized "FrontendDir: $frontendDir" "前端目录：$frontendDir" "前端目錄：$frontendDir"

# ==== 函数 ====
function Remove-Dependencies {
<#
作用：删除 node_modules 并清理 pnpm store
#>
    $modulesPath = Join-Path $frontendDir 'node_modules'
    if (Test-Path $modulesPath) {
        Write-Localized "Removing node_modules..." "正在删除 node_modules..." "正在刪除 node_modules..."
        Remove-Item -Recurse -Force $modulesPath
    }
    if (-not (Test-Path $modulesPath)) {
        Write-Localized "node_modules not found (or removed), skip." "node_modules 不存在（或已删除），跳过。" "node_modules 不存在（或已刪除），略過。"
    }

    try {
        Write-Localized "Pruning pnpm store..." "清理 pnpm 缓存..." "清理 pnpm 快取..."
        Push-Location $frontendDir
        pnpm store prune
        Pop-Location
    } catch {
        Write-Localized `
          "Failed to prune pnpm store (pnpm missing?): $($_.Exception.Message)" `
          "清理 pnpm 缓存失败（可能未安装 pnpm）：$($_.Exception.Message)" `
          "清理 pnpm 快取失敗（可能未安裝 pnpm）：$($_.Exception.Message)"
    }
}

function Test-IsAdmin {
<#
作用：检测当前 PowerShell 是否以管理员身份运行
#>
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Uninstall-NodeIfRequested {
<#
作用：当传入 -UninstallNode 时，卸载 Node.js LTS；需要时自动提权
#>
    if (-not $UninstallNode) { return }

    Write-Localized "Uninstalling Node.js LTS..." "将卸载 Node.js LTS..." "將移除 Node.js LTS..."

    if (-not (Test-IsAdmin)) {
        Write-Localized "Elevation required, restarting as Administrator..." "需要管理员权限，正在以管理员身份重启..." "需要系統管理員權限，正在以系統管理員身分重新啟動..."
        $startArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PSCommandPath`"","-UninstallNode")
        Start-Process powershell.exe -Verb RunAs -ArgumentList $startArgs | Out-Null
        exit
    }

    winget uninstall -e --id OpenJS.NodeJS.LTS
}

# ==== 主流程 ====
Remove-Dependencies
Uninstall-NodeIfRequested

Write-Localized "✅ Cleanup completed." "✅ 清理完成。" "✅ 清理完成。"
