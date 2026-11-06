# Relatório executivo e técnico — verificação de 06/11/2026

**Documento histórico da fase 1.** Após a autorização das correções, consultar a conclusão atual em [validação da versão 1.0.21](validacao-release-1.0.21.md). Os resultados e bloqueios abaixo refletem o momento inicial, não o estado final da atualização.

## Parecer executivo

**Atualização não aprovada para produção. Limpeza de produção não autorizada nem executada.** Foram realizadas verificações locais, inventário estático e testes isolados do novo procedimento manual solicitado. A auditoria de produção permanece pendente: o diagnóstico Supabase não conectou com TLS validado (`SELF_SIGNED_CERT_IN_CHAIN`). Nenhum achado exclusivamente local é apresentado como comprovação do estado de produção.

| Área | Resultado | Evidência e limite |
|---|---|---|
| Frontend build | Aprovado localmente | `npm run build`: compilação, TypeScript, 22 páginas e geração standalone concluídos; avisos Node de depreciação/localStorage |
| Frontend lint | Reprovado | `npm run lint`: 27 erros e 238 avisos; os erros são de scripts CommonJS existentes sob regras Next/TypeScript; backups versionados também entram no lint |
| Backend build | Aprovado localmente | `prisma generate && nest build`, exit 0 |
| Backend testes | Aprovado | 32 suítes, 239 testes, exit 0 |
| Nova manutenção | Aprovada em ensaio isolado | 7 testes unitários e ensaio PostgreSQL com schema real, backup restaurado e rollback de trigger inesperada |
| Dependências | Reprovado | npm audit: frontend 19 pacotes sinalizados (1 crítico, 8 altos, 9 moderados, 1 baixo); backend 41 (2 críticos, 14 altos, 22 moderados, 3 baixos); incluem dependências de desenvolvimento |
| Migrations | Pendente | 59 diretórios, 54 registros locais, 5 sem registro e 1 checksum divergente; estrutura física pode já existir, exigindo reconciliação |
| Supabase/RLS | Pendente produção | 51 tabelas locais inventariadas, 6 sem RLS; nenhuma policy local; dados de produção indisponíveis pela falha TLS |
| Multiempresa | Evidência parcial; sem aprovação integral | 471 operações de consulta/mutação inventariadas por AST e 166 rotas; guards, escopo e testes existentes examinados; inventário não prova ausência de IDOR em todos os fluxos |
| Arquivos/disco | Mapeado; sem limpeza | `.gitignore`/`.dockerignore` cobrem caches e backups principais; há logs e `_backups` já versionados. Não houve remoção de arquivos nem acesso ao disco da VPS |
| Tipografia/mobile | Análise estática; QA visual pendente | Listagens com overflow e grids responsivos; controles de produtos `h-9` (36px) abaixo do alvo 44px; não houve ensaio visual completo em dispositivos |
| Versão/novidades | Pendente decisão de release | Frontend/backend 1.0.20; notas atuais de 01/10/2026 não descrevem todas as mudanças recentes; abertura por versão implementada no app-shell |

Os scripts novos foram explicitamente solicitados no anexo e adicionados como ferramenta independente. Não foram aplicadas correções nas funcionalidades existentes, scripts antigos, dependências, schema, permissões ou configurações de produção. Nenhum commit, push, deploy ou migration foi executado.

## Cobertura e evidências

- Inventário completo de rotas e operações detectadas: `contrx-backend/backups/source-inventory-20261106.json`. São 166 rotas, 471 operações Prisma/SQL detectadas, 105 sinais de armazenamento/HTML/configuração pública e 59 migrations com SHA-256.
- Diagnóstico e plano local somente leitura: `contrx-backend/backups/cleanup-final-authchecked-20261106.json`.
- Builds: `backups/validation-build-frontend-20261106.log` e `contrx-backend/backups/validation-build-backend-20261106.log`.
- Auditorias npm reais: `backups/audit-frontend-network-20261106.json` e `contrx-backend/backups/audit-backend-network-20261106.json`. Não confundir com as primeiras tentativas sem acesso de rede, que falharam e ficaram em arquivos separados.
- Ensaio integrado: `contrx-backend/backups/cleanup-isolated-1793997497772/test-result.json`, com dump, restauração, intenção, pré-commit, resultado e simulações.
- Não foram capturadas credenciais no relatório público. Dumps/diagnósticos privados ficam em pasta ignorada; Windows exige verificar ACL local. Não versionar esses artefatos.

## 1. Supabase e banco de dados

Banco: PostgreSQL via Prisma 7 e adaptador `pg`. Autenticação principal da aplicação: `public.usuarios`, `senha_hash` bcrypt, JWT próprio e `usuarios_sessoes`. Não há pressuposição de equivalência com IDs de Supabase Auth. O diagnóstico verifica separadamente a existência de `auth.users`, `auth.identities` e Storage, e bloqueia limpeza automática de recursos externos.

Catálogo local: 51 tabelas, 52 FKs, 4 triggers e 4 funções públicas. Nenhuma policy RLS foi encontrada e nenhuma das 4 funções públicas locais é SECURITY DEFINER. Há tabelas com RLS habilitado sem policies: isso nega acesso de roles comuns por padrão, mas owner/superuser/BYPASSRLS continuam sujeitos ao isolamento implementado na aplicação. Ausência de policy não equivale automaticamente a vazamento.

Seis tabelas sem RLS local: `vendas_categorias_produtos`, `vendas_grades_produtos`, `vendas_marcas_produtos`, `vendas_pedidos`, `vendas_produtos`, `vendas_unidades_produtos`. Os ACLs locais retornaram nulos; não foi demonstrado acesso público/anon. Classificação: lacuna de defesa em profundidade local, com impacto em produção a verificar após conexão TLS confiável. Inventário por tabela ao final.

Cinco migrations sem registro local:

- `20261105140000_allow_negative_sales_stock`
- `20261105150000_add_sales_product_units`
- `20261105160000_independent_grid_products`
- `20261105170000_sales_reference_customers`
- `20261106120000_sales_credit_adjustments_refund_settlements`

Checksum divergente: `20260806120635_catch_up_changes`. Isso comprova diferença entre arquivo e histórico registrado, **não** comprova sozinho que a estrutura correspondente esteja ausente. Não aplicar automaticamente, não editar histórico para ocultar a diferença e não executar reset. Comparar DDL atual, arquivo histórico e ambiente restaurado antes de propor reconciliação aditiva.

## 2. Multiempresa

Controllers privados usam identidade autenticada para `companyId`; módulos de empresas/admin exigem SystemOwner. Pessoas/contratos/bancos apresentam lookup inicial com empresa antes de mutações por ID. Essas mutações por ID devem ser endurecidas com escopo no próprio comando em fase 2, mas não foram automaticamente classificadas como IDOR confirmado quando há verificação prévia válida.

`files.controller.ts` valida entidade por `id + companyId` antes do serviço. `files.service.ts` tem sincronizações por ID, dependentes dessa autorização prévia. Vendas usa FKs compostas em grades, fornecedores, usuários e entidades financeiras; os testes existentes incluem cenários de isolamento. O inventário marca chamadas sem `companyId` no próprio argumento para revisão contextual; operações globais de SystemOwner e links públicos não devem ser confundidos com vazamento por simples busca textual.

Não foram executados testes destrutivos de exploração, nem se afirma garantia de isolamento de 100% das rotas apenas com análise estática e testes unitários. Revisão aprofundada de todas as chamadas inventariadas e testes de integração de dois tenants para todos os módulos permanecem requisitos para aprovação integral.

## 3. Frontend e 4. Backend

O frontend armazena JWT em `localStorage` (`context/AuthContext.tsx:183`, também impersonação). Isso o expõe a JavaScript da mesma origem em caso de XSS. Não foi comprovado XSS explorável; os usos de `dangerouslySetInnerHTML` examinados são script de tema e CSS de impressão. Não foram reproduzidos segredos neste relatório.

Backend usa `ValidationPipe` global com `whitelist`, `forbidNonWhitelisted` e `transform`; bcrypt para senha e SHA-256 para token de recuperação; emissão do token de recuperação condicionada a ambiente de desenvolvimento. JWT valida usuário ativo, empresa, sessão, revogação e expiração no banco.

A chamada `$queryRawUnsafe` encontrada em `vendas.service.ts:738` utiliza SQL constante e parâmetro `$1`, não concatenação de entrada: esse uso isolado não comprova SQL injection. Fetches examinados usam provedores fixos de CNPJ e clima, com cidade obtida de catálogo local; não recebem URL arbitrária do usuário. Arquivos legados em `/uploads` são servidos por middleware estático e merecem tratamento privado quando contiverem documentos confidenciais.

## 5. APIs e 7. Infraestrutura

As 5 rotas sem guard detectadas no inventário são raiz/favicon e três rotas deliberadamente públicas de compartilhamento (`extratos-publicos`, `contratos-publicos`, `relatorios-receber-publicos`). Seus serviços verificam validade do link, mas os controllers não têm rate limit próprio. Possuir o link funciona como credencial de leitura: avaliar minimização dos dados e revogação.

Login, cadastro e recuperação usam RateLimitGuard; entretanto, a chave de IP usa o primeiro valor de `x-forwarded-for` diretamente. O Nginx configura `$proxy_add_x_forwarded_for`, que pode preservar prefixo fornecido pelo cliente. Isso permite contornar contadores baseados em IP se a cadeia não for saneada. Buckets são em memória por processo: também não são compartilhados entre réplicas.

Nginx de produção contém TLS, redirecionamento HTTPS e HSTS; Next/backend têm CSP, nosniff, frame DENY e políticas de origem. CSP do frontend permite script/style inline; reduzir exige nonce/hash e testes. Docker expõe serviços apenas em loopback no compose e limita logs. A aplicação roda no Docker sem `USER` dedicado: endurecimento recomendado. Configuração Cloudflare, certificados, roles e headers efetivos da VPS não foram inspecionados remotamente.

## 6. Integridade, retenção e limpeza

O novo procedimento não executa exclusões em produção e bloqueia candidatos com dependências incertas. O catálogo real identifica FKs e cascatas. Registros sem propriedade demonstrada são preservados; dados globais não são excluídos por ausência de empresa.

O plano local contém 7 usuários: 2 protegidos e 5 candidatos. Ambos os protegidos estão na mesma empresa. Há 1 empresa candidata e 36 registros propostos no plano ordenado, mas 18 bloqueios impedem execução: 12 backups antigos populados, 5 sessões preservadas referenciando candidatos e 1 candidato com referência a identidade protegida. A existência de 5 candidatos não significa que todos tenham sido liberados para exclusão.

O código não determina deveres legais de retenção. O responsável deve avaliar contratos, movimentações, documentos fiscais, dados de auditoria e direitos envolvidos antes de autorizar qualquer exclusão. É uma condição operacional, não uma aprovação jurídica automática.

## 8. Dependências, arquivos e interface

Npm audit sinalizou 19 pacotes frontend e 41 backend, incluindo dependências transitivas/de desenvolvimento. Severidade do registro não prova exploração no projeto; conferir precondições e alcance em produção. Relatórios completos contêm as árvores, ranges, links e sugestões de correção. Não executar `npm audit fix --force`: há sugestões que alterariam major ou poderiam desalinhar Next e eslint-config-next.

A versão instalada de Next é afetada pelos intervalos reportados. O aviso crítico de otimização de imagens afeta Linux glibc mediante as condições do recurso; há também aviso específico de servidores Windows. O Dockerfile usa Debian/glibc. Isso exige prioridade de revisão e atualização, sem presumir que todas as precondições foram exploradas.

Fontes verificadas: [aviso de otimização de imagens](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [aviso de hospedagem Windows](https://github.com/advisories/GHSA-p293-qw3h-jr36). Não foram executados payloads de exploração.

Há logs já rastreados (`.backend-dev-3001.*.log`, `.backend-prod-3001.*.log`) e árvore `_backups/` rastreada. Ignore não retira arquivos já versionados. Sua remoção do índice deve ser proposta sem apagar backups de recuperação necessários. Novos artefatos estão sob `backups/` ignorado. Não foi feita limpeza da VPS ou dos backups existentes.

No mobile, há overflow de tabelas e grids responsivos no código; o catálogo usa controles de 36px e texto auxiliar de 11px em alguns pontos. Confrontar com padrão ERP de 44px para toque/12px mínimo auxiliar em fase 2, preservando a densidade solicitada pelo usuário. Sem ensaio visual, não marcar responsividade como aprovada.

## 9. Fichas de risco

| ID | Arquivo/local | Descrição e impacto | Cenário conceitual, sem exploração | Probabilidade | Severidade |
|---|---|---|---|---|---|
| R01 | `package-lock.json`, pacote next/sharp; `Dockerfile` | Intervalos vulneráveis reportados, inclusive RCE em condições específicas; risco de comprometimento do processo | Serviço alcançável processa entrada que aciona recurso afetado; confirmar alcance/configuração antes de classificar exploração concreta | Média, condicionada ao recurso | Crítica reportada pelo fornecedor |
| R02 | `contrx-backend/package-lock.json`, proxy-addr/handlebars e dependências | 2 pacotes com classificação crítica no npm; há riscos altos em plataforma HTTP, uploads e e-mail | Tráfego ou conteúdo não confiável alcança caminho vulnerável; dev dependency isolada reduz alcance | A verificar por dependência | Crítica reportada, alcance pendente |
| R03 | `contrx-backend/src/autenticacao/guards/rate-limit.guard.ts:34`, `getClientIp`; `nginx/contrx.conf` | Confiança em prefixo X-Forwarded-For pode contornar rate limiting; memória local não coordena réplicas | Cliente altera prefixo de cabeçalho, proxy o preserva e a chave do contador muda | Alta se cabeçalho não saneado | Alta |
| R04 | Catálogo local, 6 tabelas vendas listadas acima | RLS ausente; perda de segunda camada de isolamento em caso de grants/API direta | Role com SELECT ganha acesso sem filtro; grants e PostgREST de produção ainda não verificados | Indeterminada em produção | Média local; alta se exposição/grants forem confirmados |
| R05 | `context/AuthContext.tsx:183`, persistência; `app/admin/page.tsx` impersonação | JWT acessível a script da origem, inclusive token do operador em impersonação | Uma falha XSS futura permite ler token persistido; XSS não confirmado nesta auditoria | Média condicionada a XSS | Média |
| R06 | `contrx-backend/src/main.ts:65`, `/uploads` | Arquivos legados servidos sem autenticação por arquivo | Conhecimento/vazamento de URL possibilita leitura de documento privado legado | Média se houver arquivo confidencial | Alta condicional |
| R07 | Scripts antigos de limpeza, `manutencao-limpeza-producao.js:26,223` | TLS sem validação, backup parcial, ordem fixa e proteção insuficiente de dependências; risco de perda real | Operador usa script antigo acreditando estar protegido por backup completo | Média operacional | Alta |
| R08 | `contrx-backend/prisma/migrations`, histórico local | 5 registros ausentes e checksum divergente; possível falha de deploy/drift | Migrate tenta reaplicar DDL existente ou diverge de banco restaurado | Alta no ambiente divergente | Alta operacional |
| R09 | Controllers públicos de compartilhamento, método Get(':id') linha 8 | Sem rate limit próprio; links dão acesso a conteúdo compartilhado | Reuso de link vazado ou volume excessivo de consultas | Média | Média |
| R10 | Logs rastreados e `_backups/`; configuração ESLint | Crescimento de artefatos, lint bloqueado e risco de envio de resíduos | Build/release inclui arquivos legados ou logs com metadados | Média | Baixa a média conforme conteúdo |

Nenhuma ficha afirma vazamento comprovado entre empresas ou incidente já ocorrido. Itens condicionais exigem validação do ambiente real, sem reclassificá-los como resolvidos por testes unitários.

## 10. Plano da fase 2, sujeito à aprovação

1. Reconciliar CA/TLS de diagnóstico e inventariar produção com usuário de visibilidade completa, mantendo consulta somente leitura. Obter RLS, grants, policies, Auth/Storage e histórico real. Risco: configuração de confiança errada; validar hostname/cadeia, sem desativar TLS.
2. Atualizar dependências afetadas em alteração separada, mantendo compatibilidade de Next/React/ESLint/Nest/Prisma. Confirmar documentação local da nova versão antes de código. Rodar build, suíte completa, autenticação, uploads e impressão. Risco: mudanças de API/major e alterações no lockfile.
3. Corrigir derivação de IP e rate limit conforme topologia de proxy real; validar cadeia confiável, limites por identidade/IP e comportamento com réplicas. Risco: bloquear clientes legítimos atrás de NAT/proxy.
4. Reconciliar migrations em cópia restaurada; comparar estruturas e checksums históricos antes de qualquer ajuste de histórico. Propor apenas migração aditiva quando necessária, sem reset nem reaplicação cega. Risco: conflito DDL e downtime.
5. Endurecer RLS/grants, mutações com companyId, arquivos privados e links públicos. Testes de dois tenants e permissões antes de produção. Risco: bloquear funcionalidades legítimas ou links existentes.
6. Resolver cada bloqueio da limpeza com inventário de propriedade, retenção e recuperação. Gerar novo diagnóstico e simulação reais e solicitar aprovação de IDs/hash exatos. Nenhuma aprovação genérica de correções autoriza apagar dados de produção.
7. Corrigir lint, tratar logs/backups rastreados, validar mobile visualmente e preparar versão/notas coerentes. Preservar arquivos de recuperação e funcionalidades. Risco: exclusão indevida de artefato útil e regressão de layout.

A skill de segurança estabelece: “NÃO executar correções imediatamente” na fase 1 e exige aprovação para a fase 2. Referência: `.agents/skills/contrx_security_protocol/SKILL.md`. O novo procedimento de manutenção foi implementado por solicitação explícita; as correções acima continuam pendentes de aprovação.

O deploy permanece manual pelo usuário em `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`, **somente após resolver pendências e validar a versão**. Este relatório não recomenda enviar o estado atual.

## Changelog desta solicitação

Arquivos novos, todos fora dos fluxos da aplicação:

| Arquivo | Finalidade |
|---|---|
| `contrx-backend/scripts/maintenance/controlled-cleanup.cjs` | Catálogo real, planejamento conservador, travas, aprovação, backup restaurado e execução transacional |
| `contrx-backend/scripts/maintenance/diagnose.cjs` | Entrada somente leitura para diagnóstico |
| `contrx-backend/scripts/maintenance/dry-run.cjs` | Entrada de simulação sem DML |
| `contrx-backend/scripts/maintenance/execute.cjs` | Entrada manual protegida de execução futura |
| `contrx-backend/scripts/maintenance/controlled-cleanup.test.cjs` | 7 testes unitários de preservação/dependências |
| `contrx-backend/scripts/maintenance/integration-test.cjs` | Ensaio em bancos localhost novos com schema real e dados sintéticos |
| `contrx-backend/scripts/maintenance/source-inventory.cjs` | Inventário AST de rotas, guards, operações e checksums |
| `docs/limpeza-controlada.md` | Operação, backup, recuperação e checklist |
| `docs/auditoria-atualizacao-2026-11-06.md` | Relatório executivo/técnico e plano de correção |

O workspace já continha muitas alterações anteriores (70 arquivos rastreados alterados e diversos novos). O `git diff` geral foi consultado para inventário, mas essas mudanças anteriores não são atribuídas a esta solicitação e não foram revertidas. Outputs de teste, dumps e diagnósticos não são entregáveis para versionamento.

## Inventário por tabela — banco local, não produção

RLS/grants de produção: não verificados. “Não comprovado” não significa ausência garantida de vazamento. Tabelas com RLS habilitado têm zero policies no catálogo local; a visibilidade do backend depende de sua role e filtros.

| Tabela | RLS habilitado? | Existe risco? | Existe vazamento? | Nivel de risco local |
|---|---|---|---|---|
| _prisma_migrations | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| agenda_itens | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| arquivos_sistema | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| assinaturas_contrato | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_agenda_itens_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_assinaturas_contrato_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_configuracoes_app_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_contas_bancarias_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_contas_pagar_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_contas_receber_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_contratos_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_empresas_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_imoveis_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_movimentacoes_bancarias_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_movimentacoes_imoveis_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_pagamentos_realizados_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_pagamentos_recebidos_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_pessoas_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| backup_usuarios_20260813183503 | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| chamados_suporte | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| configuracoes_app | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| contas_bancarias | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| contas_pagar | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| contas_receber | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| contratos | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| empresas | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| error | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| historico_comercial | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| imoveis | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| impressos_compartilhados | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| movimentacoes_bancarias | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| movimentacoes_imoveis | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| pagamentos_realizados | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| pagamentos_recebidos | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| pessoas | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| usuarios | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| usuarios_sessoes | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| vendas_categorias_produtos | Nao | RLS ausente; grants de producao pendentes | Nao comprovado | Medio |
| vendas_clientes | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| vendas_creditos_clientes | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| vendas_eventos | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| vendas_fornecedores | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| vendas_grades_produtos | Nao | RLS ausente; grants de producao pendentes | Nao comprovado | Medio |
| vendas_marcas_produtos | Nao | RLS ausente; grants de producao pendentes | Nao comprovado | Medio |
| vendas_movimentos_estoque | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| vendas_pedidos | Nao | RLS ausente; grants de producao pendentes | Nao comprovado | Medio |
| vendas_produtos | Nao | RLS ausente; grants de producao pendentes | Nao comprovado | Medio |
| vendas_produtos_historico_precos | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| vendas_unidades_produtos | Nao | RLS ausente; grants de producao pendentes | Nao comprovado | Medio |
| vendas_variacoes_produtos | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
| vendas_vendedores | Sim | Role de bypass exige filtros; sem policies | Nao comprovado | A verificar |
