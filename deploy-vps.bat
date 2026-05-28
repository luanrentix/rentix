@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "BRANCH=main"
set "VPS_USER=ubuntu"
set "VPS_HOST=163.176.163.165"
set "VPS_PATH=/opt/contrx"
set "SSH_KEY=~/oracle-final.key"
set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"

if not exist "%GIT_BASH%" (
  set "GIT_BASH=%ProgramFiles(x86)%\Git\bin\bash.exe"
)

if not exist "%GIT_BASH%" (
  echo Git Bash nao encontrado. Instale o Git for Windows ou ajuste GIT_BASH neste arquivo.
  exit /b 1
)

cd /d "%~dp0"

echo.
echo === Contrx deploy para VPS Oracle ===
echo Projeto: %CD%
echo VPS: %VPS_USER%@%VPS_HOST%:%VPS_PATH%
echo.

echo === Build local ===
call npm run build
if errorlevel 1 (
  echo Build local falhou. Deploy cancelado.
  exit /b 1
)

for /f "delims=" %%s in ('git status --porcelain') do (
  set "HAS_CHANGES=1"
)

if defined HAS_CHANGES (
  echo.
  echo Existem alteracoes locais:
  git status --short
  echo.
  set /p COMMIT_MSG="Mensagem do commit: "

  if "!COMMIT_MSG!"=="" (
    echo Mensagem vazia. Deploy cancelado.
    exit /b 1
  )

  git add .
  if errorlevel 1 exit /b 1

  git commit -m "!COMMIT_MSG!"
  if errorlevel 1 exit /b 1
) else (
  echo.
  echo Nenhuma alteracao local para commitar.
)

echo.
echo === Enviando para GitHub ===
git push origin %BRANCH%
if errorlevel 1 (
  echo Push falhou. Deploy cancelado.
  exit /b 1
)

echo.
echo === Atualizando VPS ===
"%GIT_BASH%" -lc "ssh -i %SSH_KEY% %VPS_USER%@%VPS_HOST% 'cd %VPS_PATH% && git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build && docker compose -f docker-compose.prod.yml ps && curl -I https://www.contrx.com.br && curl -I https://api.contrx.com.br'"
if errorlevel 1 (
  echo Deploy remoto falhou.
  exit /b 1
)

echo.
echo Deploy concluido com sucesso.
endlocal
