@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "GIT_PAGER=cat"
set "PAGER=cat"
chcp 65001 >nul
set "PROJECT_DIR=C:\projetos\contrx"
set "SSH_KEY=/c/ssh/oracle-final.key"
set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=%ProgramFiles(x86)%\Git\bin\bash.exe"
cd /d "%PROJECT_DIR%"
if errorlevel 1 exit /b 1
:MENU
cls
echo ============================================================
echo CONTRX - ATUALIZACAO MANUAL VALIDADA
echo [1] Validar e enviar versao para VPS Oracle
echo [2] Backup local dos dados e migrations do Supabase
echo [3] Manutencao manual - diagnostico, simulacao e plano aprovado
echo [4] Sair
echo ============================================================
set "OPCAO="
set /p "OPCAO=Escolha 1, 2, 3 ou 4: "
if "%OPCAO%"=="1" goto DEPLOY
if "%OPCAO%"=="2" goto SUPABASE
if "%OPCAO%"=="3" goto MANUTENCAO
if "%OPCAO%"=="4" exit /b 0
goto MENU
:DEPLOY
if not exist "C:\ssh\oracle-final.key" (
  echo Chave SSH nao encontrada em C:\ssh\oracle-final.key. Nenhum envio iniciado.
  goto FALHA
)
echo Pare os servidores locais antes do build. O envio exige schema de producao atualizado.
node contrx-backend\scripts\manual-supabase-update.cjs --env contrx-backend\.env.supabase --check --require-current
if errorlevel 1 goto FALHA
call npm.cmd run lint
if errorlevel 1 goto FALHA
call npm.cmd run build
if errorlevel 1 goto FALHA
call npm.cmd --prefix contrx-backend run lint
if errorlevel 1 goto FALHA
call npm.cmd --prefix contrx-backend run test -- --runInBand
if errorlevel 1 goto FALHA
call npm.cmd --prefix contrx-backend run build
if errorlevel 1 goto FALHA
call npm.cmd audit --omit=dev --audit-level=high
if errorlevel 1 goto FALHA
call npm.cmd --prefix contrx-backend audit --omit=dev --audit-level=high
if errorlevel 1 goto FALHA
if not exist "%GIT_BASH%" (
  echo Git Bash nao encontrado.
  goto FALHA
)
git --no-pager diff --check
if errorlevel 1 goto FALHA
git --no-pager status --short
echo Confira todos os arquivos acima. Nenhum envio foi realizado ainda.
set "CONFIRMACAO="
set /p "CONFIRMACAO=Digite ENVIAR para autorizar commit, push e deploy: "
if not "%CONFIRMACAO%"=="ENVIAR" goto MENU
set "HAS_CHANGES="
for /f "delims=" %%s in ('git status --porcelain') do set "HAS_CHANGES=1"
if not defined HAS_CHANGES goto PUSH
node scripts\stage-release-1.0.23.cjs
if errorlevel 1 goto FALHA
git --no-pager diff --cached --check
if errorlevel 1 goto FALHA
git --no-pager diff --cached --name-only
echo Revise a lista staged acima antes de continuar.
set "CONFIRMACAO_FINAL="
set /p "CONFIRMACAO_FINAL=Digite ENVIAR novamente para confirmar apenas estes arquivos: "
if not "%CONFIRMACAO_FINAL%"=="ENVIAR" goto MENU
git commit -m "Atualiza versao Contrx e aplica correcoes validadas"
if errorlevel 1 goto FALHA
:PUSH
git push origin main
if errorlevel 1 goto FALHA
"%GIT_BASH%" -lc "ssh -i %SSH_KEY% ubuntu@163.176.163.165 'cd /opt/contrx && git pull --ff-only origin main && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build && docker compose -f docker-compose.prod.yml ps && curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-connrefused -I https://www.contrx.com.br && curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-connrefused -I https://api.contrx.com.br'"
if errorlevel 1 goto FALHA
echo Envio concluido. Valide login e operacoes essenciais antes de encerrar a janela de manutencao.
pause
goto MENU
:MANUTENCAO
pushd "%PROJECT_DIR%\contrx-backend"
if errorlevel 1 goto FALHA
node scripts\maintenance\manual-menu.cjs
set "MANUTENCAO_RESULT=%ERRORLEVEL%"
popd
if not "%MANUTENCAO_RESULT%"=="0" goto FALHA
pause
goto MENU
:SUPABASE
echo Esta opcao exporta os dados reais da aplicacao, incluindo dados pessoais
echo e hashes de credenciais, para contrx-backend\backups no computador local.
echo Proteja essa pasta com ACL e criptografia. Nao a envie para GitHub.
echo Depois aplica migrations; nao executa limpeza de usuarios ou exclusao de movimentacoes.
echo Garanta tambem backup/PITR do provedor para os schemas gerenciados e recursos externos.
node contrx-backend\scripts\manual-supabase-update.cjs --env contrx-backend\.env.supabase --check
if errorlevel 1 goto FALHA
set "CONFIRMACAO="
set /p "CONFIRMACAO=Digite BACKUP E MIGRAR para autorizar estas duas operacoes: "
if not "%CONFIRMACAO%"=="BACKUP E MIGRAR" goto MENU
node contrx-backend\scripts\manual-supabase-update.cjs --env contrx-backend\.env.supabase --apply --confirm-backup-e-migrar
if errorlevel 1 goto FALHA
echo Supabase atualizado. Agora utilize a opcao 1 para validar e enviar o aplicativo.
pause
goto MENU
:FALHA
echo Operacao interrompida. Leia o erro acima; nao pule validacoes.
pause
goto MENU
