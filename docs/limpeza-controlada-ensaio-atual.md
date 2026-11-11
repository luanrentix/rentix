# Limpeza controlada — resultado do ensaio

O executável manual é `LIMPEZA-CONTROLADA.BAT`, na raiz do projeto. O código completo de planejamento, diagnóstico, simulação, backup, restauração e execução está em `contrx-backend/scripts/maintenance/controlled-cleanup.cjs`. As instruções operacionais estão em `docs/limpeza-controlada.md`.

## Validação realizada

- 12 testes automatizados aprovados, sem falhas.
- Ensaio integrado aprovado com clone do schema real em banco local novo e dados sintéticos: 3 usuários, 2 protegidos, 1 candidato e 1 empresa candidata. A simulação identificou 6 registros e nenhum bloqueio; incluiu explicitamente o pagamento vinculado à conta candidata.
- Backup completo da base sintética restaurado em destino separado e comparado por fingerprints.
- Plano desatualizado, ausência de aprovação e execução simultânea recusados.
- Trigger com alteração inesperada de usuário protegido detectada; transação integralmente revertida.
- Execução autorizada somente na base sintética; credenciais e atividade dos protegidos verificadas; pagamento e conta exclusivos removidos na ordem correta; repetição com plano vazio.

Evidências locais: `contrx-backend/backups/cleanup-isolated-1794234331841/`, incluindo `dry-run.json`, `execution.json` e `test-result.json`. Esses arquivos são ignorados pelo Git e não devem ser publicados.

## Limites

Nenhuma exclusão foi executada em produção. O ensaio não autoriza a limpeza real, não comprova login real das contas de produção e não resolve os vínculos compartilhados ou as tabelas antigas de backup encontrados no diagnóstico de produção. É necessária nova simulação, revisão dos bloqueios e aprovação explícita do plano exato antes de qualquer execução real. Não existe flag para ignorar bloqueios.
