@echo off
chcp 65001 >nul
setlocal EnableExtensions
title Installation MasterMotion
cd /d "%~dp0"

echo.
echo  Lancement de l'installeur MasterMotion...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Installer.ps1"
set "ERR=%ERRORLEVEL%"
if not "%ERR%"=="0" (
  echo.
  echo  [ERREUR] Installation echouee ^(code %ERR%^).
  pause
)
endlocal
exit /b %ERR%
