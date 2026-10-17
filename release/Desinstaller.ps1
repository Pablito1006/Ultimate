$ErrorActionPreference = "Stop"

$PluginId = "com.mastermotion.toolkit"
$ExternalRoot = Join-Path $env:APPDATA "Adobe\UXP\Plugins\External"
$InfoFile = Join-Path $env:APPDATA "Adobe\UXP\PluginsInfo\v1\premierepro.json"

Write-Host ""
Write-Host "========================================"
Write-Host " MasterMotion - Desinstallation"
Write-Host "========================================"
Write-Host ""

$removed = $false
if (Test-Path $ExternalRoot) {
  Get-ChildItem $ExternalRoot -Directory | Where-Object { $_.Name -like ($PluginId + "_*") } | ForEach-Object {
    Write-Host ("Suppression : " + $_.FullName)
    Remove-Item $_.FullName -Recurse -Force
    $removed = $true
  }
}

if (Test-Path $InfoFile) {
  try {
    $parsed = Get-Content $InfoFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $kept = @($parsed.plugins | Where-Object { $_.pluginId -ne $PluginId })
    @{ plugins = $kept } | ConvertTo-Json -Depth 6 | Set-Content $InfoFile -Encoding UTF8
    Write-Host "Registre premierepro.json mis a jour."
  } catch {
    Write-Host ("Impossible de mettre a jour premierepro.json : " + $_.Exception.Message)
  }
}

$upia = Join-Path $env:CommonProgramFiles "Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe"
if (Test-Path $upia) {
  Write-Host "Tentative de retrait via UPIA..."
  & $upia /remove $PluginId 2>$null
}

if ($removed) {
  Write-Host ""
  Write-Host "OK - MasterMotion desinstalle. Redemarrez Premiere Pro." -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "Aucune installation locale trouvee dans External." -ForegroundColor Yellow
}
Write-Host ""
Read-Host "Entree pour fermer"
