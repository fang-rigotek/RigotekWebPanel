<#
文件：win-setup.ps1
用途：在 Windows 上为当前项目配置前端开发环境
特性：
- 自动本地化输出：简体/繁体/英文
- 相对路径推导 rwp_frontend（不写死盘符）
- 检测/安装 Node.js LTS（需要时自动提权）
- 启用 pnpm（Corepack）
- 按锁文件严格安装依赖（--frozen-lockfile）
#>

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

# ==== 路径推导（仅依赖脚本位置） ====
$scriptDir   = Split-Path -Parent $PSCommandPath      # devtools
$projectRoot = Split-Path -Parent $scriptDir          # RigotekWebPanel
$frontendDir = Join-Path $projectRoot 'rwp_frontend'  # 前端目录
if (-not (Test-Path $frontendDir)) {
    throw "Frontend directory not found: $frontendDir"
}

Write-Localized `
  "ProjectRoot: $projectRoot`nFrontendDir: $frontendDir" `
  "项目根目录：$projectRoot`n前端目录：$frontendDir" `
  "專案根目錄：$projectRoot`n前端目錄：$frontendDir"

# ==== 实用函数 ====
function Test-IsAdmin {
<#
作用：检测当前 PowerShell 是否以管理员身份运行
返回：$true / $false
#>
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-Node {
<#
作用：检测是否安装 Node.js，如未安装则以管理员权限通过 winget 安装 LTS 版
流程：
- node -v 成功则跳过
- 若未安装且非管理员，自动以管理员身份重启当前脚本
- 安装完成后提示重新打开终端并退出（使 PATH 生效）
#>
    $hasNode = $true
    try {
        $v = (& node -v)
        Write-Localized "Detected Node.js $v" "已检测到 Node.js $v" "已偵測到 Node.js $v"
    } catch {
        $hasNode = $false
        Write-Localized "Node.js not found. Installing LTS..." "未检测到 Node.js，开始安装 LTS 版..." "未偵測到 Node.js，開始安裝 LTS 版..."
    }

    if (-not $hasNode) {
        if (-not (Test-IsAdmin)) {
            Write-Localized "Elevation required, restarting as Administrator..." "需要管理员权限，正在以管理员身份重启..." "需要系統管理員權限，正在以系統管理員身分重新啟動..."
            $startArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PSCommandPath`"")
            Start-Process powershell.exe -Verb RunAs -ArgumentList $startArgs | Out-Null
            exit
        }
        winget install -e --id OpenJS.NodeJS.LTS --silent
        Write-Localized `
          "Node.js LTS installed. Please reopen PowerShell and run this script again." `
          "Node.js LTS 已安装。请重新打开 PowerShell 后再次运行本脚本。" `
          "Node.js LTS 已安裝。請重新開啟 PowerShell 後再次執行本腳本。"
        exit
    }
}

function Enable-Pnpm {
<#
作用：启用 Corepack 并激活最新稳定版 pnpm，输出 pnpm 版本确认
#>
    corepack enable | Out-Null
    corepack prepare pnpm@latest --activate | Out-Null
    $pv = (& pnpm -v)
    Write-Localized "Detected pnpm $pv" "已检测到 pnpm $pv" "已偵測到 pnpm $pv"
}

function Install-Dependencies {
<#
作用：在前端目录中按锁文件严格安装依赖，确保团队一致
#>
    Push-Location $frontendDir
    try {
        $lockFile = Join-Path $frontendDir 'pnpm-lock.yaml'
        if (-not (Test-Path $lockFile)) {
            throw "pnpm-lock.yaml is required for frozen installs."
        }
        Write-Localized "Installing dependencies (frozen lockfile)..." "按锁文件严格安装依赖..." "依鎖定檔嚴格安裝相依套件..."
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
