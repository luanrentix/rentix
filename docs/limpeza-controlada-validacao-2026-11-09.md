# Validação da limpeza controlada — 09/11/2026

A solicitação já está implementada no repositório. As entradas manuais são `contrx-backend/scripts/maintenance/diagnose.cjs`, `dry-run.cjs` e `execute.cjs`. O procedimento completo, dependências, riscos, backup, restauração e checklist estão em [limpeza-controlada.md](limpeza-controlada.md).

## Resultado desta revisão

- PostgreSQL com Prisma; autenticação própria por bcrypt, JWT e sessões no banco. Não se confundem contas da aplicação com Supabase Auth.
- Lista protegida fixa: `adm@contrx.com` e `luanathmra@gmail.com`. Identidade ausente, duplicada, inativa ou inconsistente bloqueia a execução.
- Diagnóstico e simulação utilizam transação somente de leitura. A execução exige plano exato, confirmação específica, revisão humana, backup restaurado em destino local separado e comparação dos dados preservados antes do commit.
- Recursos externos, propriedade incerta e dependências desconhecidas impedem exclusão automática. Retenção legal depende de revisão do responsável; não foi presumida autorização para descartar dados fiscais ou de auditoria.
- Nenhuma integração com deploy, inicialização ou migrations foi adicionada. Nenhuma exclusão em produção foi executada nesta revisão.

## Testes executados agora

Comando, a partir de `contrx-backend`:

```powershell
node --test scripts/maintenance/controlled-cleanup.test.cjs scripts/maintenance/database-connection.test.cjs
```

Resultado: **10 testes aprovados, zero falhas**. Cobrem proteção das identidades, referências compartilhadas, tabelas desconhecidas, FKs compostas, ciclos, órfãos, arquivos externos e configuração TLS.

A tentativa de teste integrado (`integration-test.cjs .env`) falhou antes de conectar à fonte local: `ECONNREFUSED 127.0.0.1:55432`. A simulação atual também não conseguiu inicializar. A tentativa de iniciar o PostgreSQL pelo utilitário existente falhou com erro 87 do Windows ao criar token restrito. Portanto, **não há nova simulação nem novo teste de restauração aprovado nesta data**.

## Evidências anteriores, não revalidadas nesta data

- `contrx-backend/backups/cleanup-isolated-1793997497772/test-result.json`: registra teste integrado aprovado, backup restaurado, rollback de efeitos inesperados de trigger, proteção das credenciais e repetição com plano vazio em bases sintéticas.
- `contrx-backend/backups/cleanup-final-authchecked-20261106.json`: simulação local anterior; 7 usuários, 2 protegidos, 5 candidatos, 1 empresa candidata, 36 registros propostos e 18 bloqueios. Não representa produção nem autoriza execução.

As evidências contêm identificadores pessoais e permanecem na pasta local de backups ignorada pelo Git.

## Pendências para operação

Restabelecer o PostgreSQL local e repetir o teste integrado e a simulação. Para produção, gerar diagnóstico e simulação novos no ambiente explicitamente selecionado, resolver todos os bloqueios e revisar retenção e recuperação externa. A execução real continua condicionada à aprovação humana do plano exato e aos demais requisitos do procedimento. Nenhuma aprovação destrutiva foi solicitada nesta revisão, pois ainda falta um plano atual validado para apresentar.
