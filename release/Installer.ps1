# MasterMotion installer (sideload UXP, works without Creative Cloud)
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CcxPath = Join-Path $ScriptDir "MasterMotion_premierepro.ccx"
$PluginId = "com.mastermotion.toolkit"
$PluginName = "MasterMotion & AI Toolkit Pro"

Write-Host ""
Write-Host "========================================"
Write-Host " MasterMotion - Installation"
Write-Host "========================================"
Write-Host ""

if (-not (Test-Path $CcxPath)) {
  Write-Host "[ERREUR] Fichier introuvable :" -ForegroundColor Red
  Write-Host "  $CcxPath"
  Write-Host "Le dossier release/ doit contenir MasterMotion_premierepro.ccx"
  Read-Host "Entree pour fermer"
  exit 1
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($CcxPath)
try {
  $manifestEntry = $zip.Entries | Where-Object {
    ($_.FullName -replace "\\", "/") -eq "manifest.json"
  } | Select-Object -First 1
  if (-not $manifestEntry) {
    throw "manifest.json absent du package .ccx"
  }
  $reader = New-Object System.IO.StreamReader($manifestEntry.Open())
  $manifestJson = $reader.ReadToEnd()
  $reader.Close()
  $manifest = $manifestJson | ConvertFrom-Json
  $version = [string]$manifest.version
  if (-not $version) { throw "version manquante dans manifest.json" }
} finally {
  $zip.Dispose()
}

$FolderName = "${PluginId}_${version}"
$ExternalRoot = Join-Path $env:APPDATA "Adobe\UXP\Plugins\External"
$TargetDir = Join-Path $ExternalRoot $FolderName
$InfoDir = Join-Path $env:APPDATA "Adobe\UXP\PluginsInfo\v1"
$InfoFile = Join-Path $InfoDir "premierepro.json"

Write-Host "Package : $CcxPath"
Write-Host "Version : $version"
Write-Host "Cible   : $TargetDir"
Write-Host ""

$upiaCandidates = @(
  "$env:CommonProgramFiles\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe",
  "${env:ProgramFiles(x86)}\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe"
)
$upia = $upiaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($upia) {
  Write-Host "Creative Cloud (UPIA) detecte - tentative Adobe..."
  try {
    & $upia /doubleClick $CcxPath
    Start-Sleep -Seconds 2
  } catch {
    Write-Host "UPIA ignore."
  }
} else {
  Write-Host "Creative Cloud Desktop / UPIA non detecte."
  Write-Host "Normal : installation directe (sideload) en cours..."
  Write-Host "Vous ne verrez PAS la fenetre Installer de Creative Cloud."
}
Write-Host ""

Write-Host "Installation directe dans le dossier UXP Premiere..."
New-Item -ItemType Directory -Force -Path $ExternalRoot | Out-Null
if (Test-Path $TargetDir) {
  Remove-Item -Recurse -Force $TargetDir
}
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

$tmpZip = Join-Path $env:TEMP ("MasterMotion_install_" + [guid]::NewGuid().ToString() + ".zip")
Copy-Item $CcxPath $tmpZip -Force
Expand-Archive -Path $tmpZip -DestinationPath $TargetDir -Force
Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue

if (-not (Test-Path (Join-Path $TargetDir "manifest.json"))) {
  Write-Host "[ERREUR] Echec extraction - manifest.json introuvable" -ForegroundColor Red
  Read-Host "Entree pour fermer"
  exit 1
}

New-Item -ItemType Directory -Force -Path $InfoDir | Out-Null
$entry = [ordered]@{
  hostMinVersion = "25.6.0"
  name           = $PluginName
  path           = "`$localPlugins\External\$FolderName"
  pluginId       = $PluginId
  status         = "enabled"
  type           = "uxp"
  versionString  = $version
}

$data = @{ plugins = @() }
if (Test-Path $InfoFile) {
  try {
    $raw = Get-Content $InfoFile -Raw -Encoding UTF8
    if ($raw -and $raw.Trim().Length -gt 0) {
      $parsed = $raw | ConvertFrom-Json
      if ($parsed.plugins) {
        $data.plugins = @($parsed.plugins | Where-Object { $_.pluginId -ne $PluginId })
      }
    }
  } catch {
    Write-Host "premierepro.json invalide - recreation..."
    $data.plugins = @()
  }
}
$data.plugins += $entry
($data | ConvertTo-Json -Depth 6) | Set-Content -Path $InfoFile -Encoding UTF8

Write-Host ""
Write-Host "OK - MasterMotion est installe." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT - a faire dans Premiere Pro :" -ForegroundColor Yellow
Write-Host "  1. Fermez COMPLETEMENT Premiere Pro."
Write-Host "  2. Rouvrez Premiere Pro."
Write-Host "  3. Preferences / Settings -> Plugins"
Write-Host "     Cochez Enable developer mode, puis redemarrez encore."
Write-Host "  4. Menu : Fenetre -> UXP Plugins -> MasterMotion"
Write-Host "     (PAS le menu Extensions = ancien CEP)"
Write-Host ""
Write-Host "Si le panneau n apparait pas :"
Write-Host "  - Premiere Pro 25.6 ou plus recent requis"
Write-Host "  - Verifiez le dossier :"
Write-Host "    $TargetDir"
Write-Host ""
Read-Host "Entree pour fermer"
