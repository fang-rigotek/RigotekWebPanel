<#
文件：win-setup.ps1
用途：在 Windows 上为当前项目配置前端开发环境
功能：
- 检测/安装 Node.js LTS
- 启用 pnpm
- 按锁文件（严格）安装依赖
说明：
- 仅依赖脚本自身位置推导 rwp_frontend，不写死盘符
- 使用 PowerShell 核准动词命名函数
- 每个函数都有注释说明其职责
#>

$ErrorActionPreference = 'Stop'

# === 路径推导（只依赖脚本所在位置） ===
$scriptDir   = Split-Path -Parent $PSCommandPath          # devtools 目录
$projectRoot = Split-Path -Parent $scriptDir              # RigotekWebPanel 根目录
$frontendDir = Join-Path $projectRoot 'rwp_frontend'      # 前端目录
if (-not (Test-Path $frontendDir)) { throw "未找到前端目录：$frontendDir" }

Write-Host "ProjectRoot: $projectRoot"
Write-Host "FrontendDir: $frontendDir"

# -------------------------
# 函数：Test-IsAdmin
# 作用：检测当前 PowerShell 是否以管理员身份运行
# 返回：$true / $false
# -------------------------
function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p  = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# -------------------------
# 函数：Install-Node
# 作用：检测是否已安装 Node.js；若未安装，则以管理员权限通过 winget 安装 LTS 版
# 逻辑：
#   - 若能执行 node -v 说明存在，直接返回
#   - 否则需要管理员；若当前非管理员，则自动以管理员身份重启本脚本
#   - 安装完成后退出，提示用户重新打开终端让 PATH 生效
# -------------------------
function Install-Node {
  $hasNode = $true
  try {
    $v = (& node -v)
    Write-Host "Detected Node.js $v"
  } catch {
    $hasNode = $false
    Write-Host "未检测到 Node.js，将安装 LTS 版本..."
  }

  if (-not $hasNode) {
    if (-not (Test-IsAdmin)) {
      Write-Host "需要管理员权限安装 Node.js，正在以管理员身份重启本脚本..."
      Start-Process powershell.exe -Verb RunAs -ArgumentList @(
        "-NoProfile","-ExecutionPolicy","Bypass","-File","`"$PSCommandPath`""
      )
      exit
    }

    winget install -e --id OpenJS.NodeJS.LTS --silent
    Write-Host "Node.js LTS 已安装。请重新打开 PowerShell 后再次运行本脚本。"
    exit
  }
}

# -------------------------
# 函数：Enable-Pnpm
# 作用：启用 Corepack 并激活最新稳定版 pnpm；输出 pnpm 版本确认
# -------------------------
function Enable-Pnpm {
  corepack enable | Out-Null
  corepack prepare pnpm@latest --activate | Out-Null
  $pv = (& pnpm -v)
  Write-Host "Detected pnpm $pv"
}

# -------------------------
# 函数：Install-Dependencies
# 作用：进入前端目录，按锁文件严格安装依赖，确保与团队版本一致
# 逻辑：
#   - 必须存在 pnpm-lock.yaml；否则直接报错
#   - 使用 --frozen-lockfile 防止任何版本漂移
# -------------------------
function Install-Dependencies {
  Push-Location $frontendDir
  try {
    $lockFile = Join-Path $frontendDir 'pnpm-lock.yaml'
    if (-not (Test-Path $lockFile)) {
      throw "未找到 pnpm-lock.yaml，严格锁定安装需要锁文件。"
    }
    Write-Host "按锁文件严格安装依赖..."
    pnpm install --frozen-lockfile
  } finally {
    Pop-Location
  }
}

# --- 主执行流程（依次执行三个步骤） ---
Install-Node
Enable-Pnpm
Install-Dependencies

Write-Host "`n✅ 环境就绪。启动开发服务："
Write-Host "   cd `"$frontendDir`""
Write-Host "   pnpm dev"
