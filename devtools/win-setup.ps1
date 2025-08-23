<#
文件：win-setup.ps1
用途：为当前项目配置前端开发环境（Node LTS + pnpm + 依锁文件安装依赖）
特性：
- 自动本地化输出（简/繁/英）
- 相对路径推导（不写死盘符）
- 如未安装 Node，自动提权用 winget 安装 LTS
- 启用 Corepack 并激活 pnpm
- 严格锁定安装（--frozen-lockfile）
#>

param()

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
if (-not (Test-Path $frontendDir)) { throw "Frontend directory not found: $frontendDir" }

Write-Localized `
  "ProjectRoot: $projectRoot`nFrontend: $frontendDir" `
  "项目根目录：$projectRoot`n前端目录：$frontendDir" `
  "專案根目錄：$projectRoot`n前端目錄：$frontendDir"

# ==== 提权工具 ====
function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Invoke-WithElevation {
    if (Test-IsAdmin) { return }
    Write-Localized "Requesting elevation (UAC) ..." "需要管理员权限，正在请求 UAC ..." "需要系統管理員權限，正在請求 UAC ..."
    $startArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File', $PSCommandPath)
    Start-Process 'powershell.exe' -Verb RunAs -ArgumentList $startArgs | Out-Null
    exit
}

# ==== 动作 ====
function Install-Node {
    # 已安装则跳过
    $hasNode = $true
    try { $null = & node -v } catch { $hasNode = $false }
    if ($hasNode) {
        Write-Localized "Node.js detected." "已检测到 Node.js。" "已偵測到 Node.js。"
        return
    }

    # 未安装则提权并安装 LTS
    if (-not (Test-IsAdmin)) {
        Invoke-WithElevation
    }
    Write-Localized "Installing Node.js LTS via winget..." "通过 winget 安装 Node.js LTS..." "透過 winget 安裝 Node.js LTS..."
    winget install -e --id OpenJS.NodeJS.LTS --silent
    Write-Localized `
      "Node.js installed. Please reopen PowerShell and rerun this script." `
      "Node.js 已安装。请重新打开 PowerShell 并再次运行本脚本。" `
      "Node.js 已安裝。請重新開啟 PowerShell 並再次執行本腳本。"
    exit
}

function Enable-Pnpm {
    corepack enable        | Out-Null
    corepack prepare pnpm@latest --activate | Out-Null
    $pv = (& pnpm -v)
    Write-Localized "pnpm detected: $pv" "已检测到 pnpm：$pv" "已偵測到 pnpm：$pv"
}

function Install-Dependencies {
    if (-not (Test-Path (Join-Path $frontendDir 'pnpm-lock.yaml'))) {
        throw "pnpm-lock.yaml is required for frozen installs."
    }
    Push-Location $frontendDir
    try {
        Write-Localized "Installing dependencies (frozen)..." "按锁文件严格安装依赖..." "依鎖定檔嚴格安裝相依套件..."
        pnpm install --frozen-lockfile
    } finally {
        Pop-Location
    }
}

# ==== 主流程 ====
Install-Node
Enable-Pnpm
Install-Dependencies

Write-Localized `
  "`n✅ Environment ready. Start dev server:`n  cd `"$frontendDir`"`n  pnpm dev" `
  "`n✅ 环境就绪。启动开发服务：`n  cd `"$frontendDir`"`n  pnpm dev" `
  "`n✅ 環境就緒。啟動開發服務：`n  cd `"$frontendDir`"`n  pnpm dev"
