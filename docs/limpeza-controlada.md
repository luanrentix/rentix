# Limpeza controlada: procedimento manual

## Acesso pelo BAT de atualização

Também é possível abrir diretamente `C:\projetos\contrx\LIMPEZA-CONTROLADA.BAT`. Esse arquivo inicia somente o menu de manutenção, sem commit, push, deploy ou migrations.

### Revisão do planejamento de dependências

O motor `controlled-cleanup.cjs` identifica pagamentos recebidos por `conta_receber_id`, pagamentos realizados por `conta_pagar_id` e assinaturas por `contrato_id`. Essas entidades não possuem `empresa_id` no schema Prisma. Elas só entram no plano quando a FK real do catálogo confirma o proprietário, o proprietário é candidato à exclusão, todos os demais pais referenciados também são candidatos e não existe menção à identidade protegida. A ordem remove filhos antes dos pais. Ausência da FK esperada bloqueia o plano. O campo `inheritedOwnership` explica cada inclusão no relatório.

Movimentações bancárias com referências sem FK, sessões e históricos compartilhados, tabelas antigas de backup, schemas externos e recursos de Auth/Storage não recebem dispensa automática. Não é seguro apagar esses registros apenas para reduzir a contagem de bloqueios. A revisão legal continua obrigatória para dados financeiros, assinaturas e históricos. Relatórios antigos devem ser substituídos por nova simulação e nova aprovação após qualquer alteração no planejamento.

No `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`, a opção **3 — Manutenção manual** abre um menu independente: diagnóstico, simulação ou execução do plano aprovado. A opção **4** encerra o BAT. As opções 1 e 2 mantêm seus fluxos anteriores.

O menu do BAT seleciona automaticamente `contrx-backend/.env.supabase` (produção), mostra esse destino antes da escolha e permite trocar o arquivo pela opção 4. Se o arquivo não existir, interrompe sem escolher outro silenciosamente. Caminhos relativos partem de `contrx-backend`. Diagnóstico e simulação geram relatórios novos em `contrx-backend/backups`. Para execução real, também exige relatório aprovado, arquivo de aprovação humana, ambiente local vazio para teste de restauração e digitação da confirmação exata. Todos os bloqueios do executor continuam válidos. Nenhuma manutenção é executada automaticamente ao atualizar a versão.

O catálogo inicial contém somente a limpeza controlada conhecida. Scripts futuros devem ser registrados e revisados antes de serem disponibilizados; não há campo para executar comandos arbitrários.

Data da implementação: 06/11/2026. Esta ferramenta é independente de deploy, startup e migrations. Não altera APIs, telas, permissões, schema ou regras comerciais.

## Entregáveis

- Diagnóstico: `contrx-backend/scripts/maintenance/diagnose.cjs`.
- Simulação somente de leitura: `contrx-backend/scripts/maintenance/dry-run.cjs`.
- Execução manual: `contrx-backend/scripts/maintenance/execute.cjs`.
- Motor e backup/restauração: `controlled-cleanup.cjs`, na mesma pasta.
- Testes: `controlled-cleanup.test.cjs` e `integration-test.cjs`.
- Inventário estático: `source-inventory.cjs`.
- Evidências locais detalhadas: `contrx-backend/backups/`, ignorado pelo Git. Contêm identificadores pessoais; acesso restrito. Não publicar esses arquivos.

**Não usar os scripts antigos** `manutencao-limpeza-producao.js`, `diagnostico-limpeza-producao.js` ou `cleanup-protected-production-users.js` para esta operação. Na fase 2 autorizada, essas entradas foram aposentadas e agora interrompem a operação com orientação para o novo procedimento. Cópias dos arquivos anteriores estão preservadas nos backups locais. Nenhuma limpeza foi executada em produção.

## Regras de preservação e bloqueio

Os e-mails `adm@contrx.com` e `luanathmra@gmail.com` devem identificar exatamente uma conta ativa cada em `public.usuarios`. O sistema usa autenticação própria com bcrypt, JWT e `usuarios_sessoes`; não se presume que esses IDs sejam de Supabase Auth. Empresas de ambos e todos os registros dessas empresas são preservados. Empresas sem usuários conhecidos também são preservadas por propriedade incerta.

O programa lê o catálogo real PostgreSQL, constraints, FKs compostas, índices, triggers, funções, políticas RLS e tabelas. Usa os nomes físicos do cliente Prisma gerado para reconhecer entidades. Registros propostos são identificados por ID e fingerprint; a ordem considera dependências entre registros, incluindo grades autorreferenciadas. Cascatas não substituem esse inventário.

O plano bloqueia execução em caso de tabela desconhecida populada, chave primária não suportada, partição, regra de reescrita, relacionamento órfão/cíclico, referência de registro preservado para candidato, associação com identidade protegida, arquivo externo/legado ou tabelas fora de `public`. Referências indiretas cuja propriedade não pode ser estabelecida continuam preservadas e podem bloquear o plano. O procedimento é conservador: não promete remover todos os candidatos automaticamente.

Registros JSON/texto também são verificados por referência literal aos e-mails e IDs protegidos. Isso não prova a ausência de todos os vínculos semânticos possíveis; revisão humana de campos polimórficos, integrações e propriedade permanece obrigatória. Históricos com atores sem FK recebem proteção adicional.

Se `auth.users`, `auth.identities` ou Storage contiverem dados, a execução fica bloqueada. O programa não remove identidades externas ou arquivos do disco/buckets e não tenta compensar exclusões externas com rollback SQL. Triggers precisam de revisão específica quanto a efeitos externos não transacionais.

## A — Diagnóstico e B — simulação

Executar a partir de `contrx-backend`, escolhendo explicitamente um arquivo de ambiente. Nos comandos diretos abaixo o ambiente é obrigatório; o menu do BAT fornece `.env.supabase` por padrão, conforme indicado acima. Não há preferência silenciosa por `DIRECT_URL`. É utilizada somente `DATABASE_URL` desse arquivo. Não copiar credenciais para a linha de comando.

```powershell
node scripts/maintenance/diagnose.cjs --env .env --out backups/diagnostico-novo.json
node scripts/maintenance/dry-run.cjs --env .env --out backups/simulacao-nova.json
```

Para diagnosticar produção, escolher explicitamente o ambiente correto, com cadeia TLS confiável. Nesta sessão a tentativa Supabase falhou com `SELF_SIGNED_CERT_IN_CHAIN`: nenhum diagnóstico de produção foi concluído. Corrigir a confiança da CA no ambiente de execução; não usar `NODE_TLS_REJECT_UNAUTHORIZED=0`, `sslmode=no-verify` ou `rejectUnauthorized:false`.

Ambos os comandos usam `REPEATABLE READ READ ONLY`; a simulação não executa DELETE, UPDATE, INSERT, DDL ou triggers de exclusão. Geram lista de candidatos, empresas, quantidades/IDs por tabela, catálogo de dependências, conflitos, plano ordenado, fingerprints e `planHash`. Um plano com bloqueios é um diagnóstico válido, mas **não é uma autorização de execução**.

Os arquivos de saída nunca são sobrescritos. Usar nomes novos a cada rodada. O lock advisory impede duas instâncias desta ferramenta simultâneas.

## C — Execução futura, somente após aprovação específica

Pré-requisitos que ainda devem ser satisfeitos em produção:

1. Resolver a conexão TLS e obter diagnóstico/simulação de produção.
2. Reconciliar todos os bloqueios, inclusive backups antigos, sessões e referências compartilhadas. A ferramenta não possui flag de bypass de bloqueios.
3. Aprovação humana do plano exato e da relação completa de IDs. Revisão responsável dos deveres de retenção fiscal, contratual, contábil e de auditoria. O código não decide quais registros podem ser legalmente eliminados.
4. Janela de manutenção com aplicação, workers e integrações pausados pelo operador. O advisory lock só coordena a própria ferramenta. Locks SQL impedem escritas concorrentes em `public` durante a execução; não substituem a janela de manutenção.
5. Ferramentas PostgreSQL compatíveis com o servidor (`pg_dump`/`pg_restore`). No Windows, configurar `PG_BIN` para o diretório das ferramentas, sem abrir janela.
6. Banco de restauração vazio, separado, em localhost e com nome `contrx_cleanup_restore_*`. O programa se recusa a sobrescrever dados nele. Credenciais desse destino em arquivo de ambiente separado.
7. Backup independente dos recursos externos, configurações de infraestrutura, roles/grants globais, arquivos e material de recuperação, com acesso restrito. Se houver recursos externos não conciliados, o plano permanece bloqueado.

Criar manualmente um JSON de aprovação com os campos abaixo, após revisar o relatório. Nunca reutilizar o hash de um ambiente diferente ou de uma simulação antiga:

```json
{
  "operator": "NOME DO RESPONSAVEL",
  "environment": "production",
  "targetId": "COPIAR DO RELATORIO",
  "planHash": "COPIAR DO RELATORIO",
  "legalRetentionReviewed": true,
  "triggersReviewed": true,
  "externalRecoveryReviewed": true,
  "maintenanceWindowActive": true
}
```

Comando destinado exclusivamente ao operador, após aprovação humana da produção. **Não foi executado nesta implementação.**

```powershell
node scripts/maintenance/execute.cjs --env CAMINHO_ENV_PRODUCAO --plan backups/SIMULACAO_APROVADA.json --approval backups/APROVACAO.json --restore-env backups/RESTORE_LOCAL.env --out backups/EXECUCAO_NOVA.json --confirm "LIMPAR PRODUCAO HASH_EXATO_DO_PLANO"
```

O JSON de aprovação é uma confirmação operacional, não uma assinatura digital ou controle de acesso substituto do DBA. Quem já controla credenciais e arquivos locais deve ser um operador autorizado.

## Backup, restauração e recuperação

Antes do primeiro DELETE, o executor exporta o snapshot da transação bloqueada e executa `pg_dump --format=custom --snapshot=...` de todo o banco. O arquivo contém inclusive dados sensíveis: guardar com ACL local restrita e criptografia em repouso gerenciada pelo operador. A ferramenta usa modo `0600` em sistemas compatíveis; no Windows, conferir ACL da pasta.

Em seguida restaura de fato o arquivo no destino local vazio com `pg_restore --exit-on-error --no-owner --no-privileges`. Compara fingerprints de todos os registros de todas as tabelas públicas restauradas com o snapshot fonte. Somente após igualdade registra manifesto com SHA-256 do dump e resultado do teste. Não considera JSON parcial, tamanho de arquivo ou mera listagem do arquivo como teste de restauração.

`--no-owner --no-privileges` adapta o ensaio de restauração ao ambiente local; **não valida permissões de produção, roles globais ou infraestrutura**. Um plano com dados externos não chega à execução. Nenhuma restauração sobre produção é automatizada. Para recuperação real: manter indisponibilidade, preservar evidências, restaurar primeiro em destino novo e isolado, validar dados/roles/grants/configuração, autenticação e vínculos, e só então aprovar manualmente a troca de conexão. Nunca sobrescrever o banco em uso por tentativa.

O executor registra intenção, backup testado, validação pré-commit e resultado final em arquivos independentes. Antes do COMMIT compara, tabela a tabela, os fingerprints de **todos** os registros preservados, incluindo credenciais, configurações, permissões e dados globais. Alteração inesperada por trigger, cascata ou SET NULL aborta a transação.

Falha de conexão durante COMMIT tem resultado potencialmente ambíguo. Consultar o estado real do banco com os arquivos de intenção/pré-commit e backup antes de repetir. Falha ao escrever o relatório após COMMIT é informada como commit confirmado. Não presumir rollback quando COMMIT pode ter ocorrido.

## Testes executados e validação posterior

```powershell
node --test scripts/maintenance/controlled-cleanup.test.cjs
$env:PG_BIN = 'C:\Program Files\PostgreSQL\18\bin'
node scripts/maintenance/integration-test.cjs .env
```

O teste integrado exige fonte localhost e cria bases descartáveis com prefixos `contrx_cleanup_test_*` e `contrx_cleanup_restore_*`. Clona somente o schema da fonte; insere dados sintéticos nas bases novas. Não altera os dados da fonte. Os bancos de ensaio e dumps são mantidos como evidência; sua remoção posterior depende da identificação e decisão do operador.

Validado: simulação sem escrita, identidade ausente/duplicada/inativa, empresa compartilhada, tabelas desconhecidas, FKs compostas, grades, órfãos, referências compartilhadas, arquivos externos, concorrência, recusa sem aprovação, recusa de plano antigo após alteração de trigger, backup efetivamente restaurado, detecção de trigger que altera usuário protegido e rollback integral, execução somente na base sintética e repetição com plano vazio.

Checklist após uma execução futura autorizada:

- [ ] Confrontar totais e IDs removidos com o plano aprovado e o relatório final.
- [ ] Confirmar as duas identidades ativas, hashes, perfis, permissões e empresas preservados.
- [ ] Testar login real, sessão, configurações, contratos e acesso administrativo das duas contas, sem solicitar ou registrar senhas no relatório.
- [ ] Confirmar que contas excluídas e seus tokens/sessões não autenticam; a estratégia JWT consulta usuário e sessão no banco em cada autenticação.
- [ ] Verificar integridade referencial, dados globais e ausência de mudanças em registros preservados.
- [ ] Validar integrações e arquivos externos conforme plano independente, se aplicável.
- [ ] Retomar aplicação somente após liberação do responsável e arquivar evidências com acesso restrito.

## Resultado desta sessão

Não houve exclusão em produção. A base local da aplicação também não foi limpa. A simulação local encontrou 7 usuários, 2 protegidos, 5 candidatos e 1 empresa candidata; propôs 36 registros, mas foi bloqueada por 18 dependências/incertezas. As duas contas protegidas pertencem à mesma empresa local. Esses números **não representam produção**.

Os 18 bloqueios locais compreendem 12 tabelas de backup antigo populadas sem propriedade reconhecida, 5 sessões preservadas em empresa protegida referenciando usuários candidatos, e 1 conta candidata com referência textual a identidade protegida. Nada disso foi eliminado ou ignorado.

Relatório estruturado: `contrx-backend/backups/cleanup-final-authchecked-20261106.json`. Teste integrado final: `contrx-backend/backups/cleanup-isolated-1793997497772/test-result.json`.
