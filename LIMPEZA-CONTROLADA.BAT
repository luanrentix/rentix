@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Contrx - Limpeza controlada manual
pushd "%~dp0contrx-backend"
if errorlevel 1 exit /b 1
echo ============================================================
echo LIMPEZA CONTROLADA - PRODUCAO SUPABASE
echo Preservar adm@contrx.com e luanathmra@gmail.com e seus dados.
echo Primeiro diagnostico e simulacao. Exclusao exige plano aprovado.
echo ============================================================
node scripts\maintenance\manual-menu.cjs
set "CLEANUP_RESULT=%ERRORLEVEL%"
popd
if not "%CLEANUP_RESULT%"=="0" echo Operacao interrompida. Confira os impedimentos acima.
pause
exit /b %CLEANUP_RESULT%
