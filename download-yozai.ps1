$ErrorActionPreference = 'Stop'
$items = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'yozai-downloads.json') -Raw | ConvertFrom-Json
$items | ForEach-Object -Parallel {
    $ErrorActionPreference = 'Stop'
    if (!(Test-Path -LiteralPath $_.file) -or (Get-Item -LiteralPath $_.file).Length -lt 100) {
        Invoke-WebRequest -Uri $_.url -OutFile $_.file -TimeoutSec 20
    }
} -ThrottleLimit 8
Write-Output 'All locally hosted Yozai pieces are ready.'
