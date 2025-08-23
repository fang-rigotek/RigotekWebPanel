<#
文件：win-cleanup.ps1
用途：清理前端依赖与生成物；可选卸载 Node.js LTS
特性：
- 自动本地化输出（简/繁/英）
- 相对路径推导
- 删除 node_modules、pnpm store
- 顺带清理 devtools\.generated（与自启脚本一致）
- 可选参数 -UninstallNode：卸载 Node LTS（自动提权）
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
$scriptDir   = Split-Path -Parent $PSCommandPath    # devtools
$projectRoot = Split-Path -Parent $scriptDir        # RigotekWebPanel
$frontendDir = Join-Path $projectRoot 'rwp_frontend'
$genDir      = Join-Path $scriptDir '.generated'
if (-not (Test-Path $frontendDir)) { throw "Frontend directory not found: $frontendDir" }

Write-Localized `
  "Frontend: $frontendDir`nGenerated: $genDir" `
  "前端目录：$frontendDir`n生成目录：$genDir" `
  "前端目錄：$frontendDir`n產生目錄：$genDir"

# ==== 提权工具 ====
function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Invoke-WithElevation {
    if (Test-IsAdmin) { return }
    Write-Localized "Requesting elevation (UAC) ..." "需要管理员权限，正在请求 UAC ..." "需要系統管理員權限，正在請求 UAC ..."
    $startArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File', $PSCommandPath,'-UninstallNode',$UninstallNode)
    Start-Process 'powershell.exe' -Verb RunAs -ArgumentList $startArgs | Out-Null
    exit
}

# ==== 动作 ====
function Remove-Dependencies {
    $modulesPath = Join-Path $frontendDir 'node_modules'
    if (Test-Path $modulesPath) {
        Write-Localized "Removing node_modules..." "正在删除 node_modules..." "正在刪除 node_modules..."
        Remove-Item -Recurse -Force $modulesPath
    } else {
        Write-Localized "node_modules not found, skip." "未找到 node_modules，跳过。" "未找到 node_modules，略過。"
    }

    try {
        Write-Localized "Pruning pnpm store..." "清理 pnpm 缓存..." "清理 pnpm 快取..."
        Push-Location $frontendDir
        pnpm store prune
        Pop-Location
    } catch {
        Write-Localized `
          "pnpm prune failed (pnpm missing?): $($_.Exception.Message)" `
          "清理 pnpm 失败（可能未安装 pnpm）：$($_.Exception.Message)" `
          "清理 pnpm 失敗（可能未安裝 pnpm）：$($_.Exception.Message)"
    }
}

function Remove-Generated {
    if (Test-Path $genDir) {
        Remove-Item -Recurse -Force $genDir
        Write-Localized "Removed generated dir." "已删除生成目录。" "已刪除產生目錄。"
    } else {
        Write-Localized "Generated dir not found." "未找到生成目录。" "未找到產生目錄。"
    }
}

function Uninstall-NodeIfRequested {
    if (-not $UninstallNode) { return }
    if (-not (Test-IsAdmin)) { Invoke-WithElevation }

    Write-Localized "Uninstalling Node.js LTS..." "正在卸载 Node.js LTS..." "正在移除 Node.js LTS..."
    winget uninstall -e --id OpenJS.NodeJS.LTS
}

# ==== 主流程 ====
Remove-Dependencies
Remove-Generated
Uninstall-NodeIfRequested

Write-Localized "✅ Cleanup done." "✅ 清理完成。" "✅ 清理完成。"
