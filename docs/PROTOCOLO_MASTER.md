# PROTOCOLO MASTER — CONTRX ERP
## Auditoria Técnica, Otimização, Responsividade, Higienização de Dados e Preparação de Builds

**PAPEL:** Atue como um Engenheiro de Software Sênior, Analista de Sistemas, Especialista em DevOps, Banco de Dados, Segurança, Performance e UX/UI para sistemas ERP.
**PROJETO:** CONTRX ERP
**VERSÃO ATUAL DE REFERÊNCIA:** `V1.0.26` (Build validado e preparado)
**AMBIENTES:** Oracle Cloud (VPS), GitHub e Supabase
**SCRIPT DE ATUALIZAÇÃO:** `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`

---

## 1. COMANDO DE ATIVAÇÃO E REGRAS DE OURO

- **Gatilho de Disparo:** Este protocolo permanece em **standby** e **SÓ DEVERÁ SER INICIADO QUANDO O USUÁRIO DIGITAR EXPLICITAMENTE: "INICIAR"** (ou variações diretas como *"iniciar"*, *"iniciar auditoria"*, *"iniciar nesse protocolo"*).
- **NUNCA EXECUTAR DE FORMA AUTÔNOMA SEM O COMANDO "INICIAR".**
- **REGRA ABSOLUTA:** **NÃO REALIZAR DEPLOY, PUSH, PUBLICAÇÃO OU ENVIO PARA PRODUÇÃO SEM AUTORIZAÇÃO EXPRESSA DO USUÁRIO.**
- Toda e qualquer publicação para produção na Oracle VPS, GitHub ou Supabase é feita exclusivamente pelo usuário de forma manual via script `ATUALIZA-VERSÃO.BAT`.
- **Faseamento Mandatório:**
  1. **FASE 1 — Auditoria e Diagnóstico (Somente Leitura):** Varredura completa das áreas técnicas, relatório executivo e técnico detalhado. Nenhuma correção é aplicada nesta fase.
  2. **FASE 2 — Correções e Validações Locais:** Correções pontuais e necessárias, mantendo 100% da integridade do negócio, seguidas de linter, testes e compilação local (`npm run build`).

---

## 2. MAPEAMENTO COMPLETO DO SISTEMA

Realizar análise técnica aprofundada de toda a estrutura do projeto:
- Organização das pastas e arquitetura (`app`, `components`, `contrx-backend`, `services`, `lib`, etc.).
- Dependências e bibliotecas (identificação de pacotes desatualizados ou vulneráveis via `npm audit`).
- Componentes reutilizáveis e consistência entre módulos.
- Rotas e integridade da navegação (App Router Next.js e rotas NestJS no backend).
- Identificação de funções e métodos duplicados, código obsoleto ou morto.
- Diagnóstico de tipagem TypeScript e erros de compilação.
- Tratamento de exceções e tolerância a falhas.
- Causa raiz de cada problema identificado sem refatorações extensas desnecessárias.

---

## 3. AUDITORIA DA ORACLE CLOUD E LIMPEZA DE VPS

Auditar os recursos, rotinas de build e consumo na instância Oracle Cloud:
- Espaço total e disponível em disco na VPS.
- Consumo por diretório, logs antigos, caches residuais e builds órfãos.
- **LIMPEZA DE IMAGENS E DOCKER A CADA ENVIO (REQUISITO CRÍTICO):**
  - Identificar acúmulo de imagens órfãs (`<none>`), camadas de cache de build e containers parados.
  - Ajustar o script `ATUALIZA-VERSÃO.BAT` e as rotinas de deploy para executar a limpeza automática de disco a cada deploy via comandos seguros:
    ```bash
    docker image prune -af --filter "until=24h"
    docker builder prune -af --filter "until=24h"
    ```
- Processos, serviços ativos e consumo de CPU/Memória.

**Regras de Segurança na VPS:**
1. Nunca excluir arquivos de produção automaticamente.
2. Nunca apagar bancos de dados ou arquivos de backup.
3. Nunca interromper serviços ativos sem autorização.
4. Nunca remover arquivos sem verificar suas dependências.
5. Apresentar estimativa do espaço recuperável antes de qualquer limpeza.

---

## 4. AUDITORIA DO SUPABASE E PROTOCOLO CIRÚRGICO DE DADOS

Verificar a integridade do banco de dados PostgreSQL / Supabase, estrutura e isolamento multiempresa:
- Estrutura das tabelas, chaves primárias e estrangeiras, índices e constraints.
- Políticas RLS (Row Level Security) e isolamento multiempresa obrigatório por `empresa_id` / `companyId`.
- Inspeção de migrações pendentes em `contrx-backend/prisma/migrations`.
- Funções, triggers, `SECURITY DEFINER` com `search_path` seguro e tratamento de erros.

### PROTOCOLO DE HIGIENIZAÇÃO DE USUÁRIOS E EMPRESAS (PRÓXIMA MIGRAÇÃO):
> [!IMPORTANT]
> A próxima migração / manutenção deverá purgar todos os usuários e empresas de teste, preservando única e exclusivamente as duas empresas autorizadas.

- **EMPRESAS E USUÁRIOS PROTEGIDOS (WHITELIST IMUTÁVEL — NÃO APAGAR):**
  1. **Empresa Contrx** (`adm@contrx.com`):
     - Preservar a empresa, seus 3 usuários vinculados, 6 bens/ativos, 18 contratos, 8 pessoas cadastradas e todo o seu histórico financeiro e operacional.
  2. **Empresa CHÁCARA PÔR DO SOL** (`luanathmra@gmail.com`):
     - Preservar a empresa, seus 2 usuários vinculados, 1 bem/ativo, 1 contrato, 1 pessoa cadastrada e todos os seus dados operacionais.
- **ALVO DA LIMPEZA GERAL (EXPURGO TOTAL):**
  - Excluir todas as outras empresas (ex: `Kit Net do Jura` - `magnotn10@gmail.com`, `LUAN` - `edif.luan@gmail.com`, `EMPRESA ABC TLDA` - `luan@contrx.com`, empresas vazias/ocultas e quaisquer outros cadastros não autorizados).
  - Excluir todos os usuários associados a essas empresas.
  - Excluir em cascata todos os dados vinculados: pessoas, bens, contratos, agendamentos, contas a pagar/receber, histórico de vendas, produtos, clientes, arquivos e sessões.
- **Procedimento Obrigatório:**
  1. Realizar dump completo do banco para backup local antes de qualquer deleção.
  2. Executar simulação prévia (*dry-run*) conferindo os hashes e IDs de preservação.
  3. Somente executar a exclusão com script controlado via Opção [3] do menu de manutenção.

---

## 5. AUDITORIA DO GITHUB

- Verificar estado atual da branch `main` e arquivos modificados via `git status` e `git diff`.
- Identificar arquivos desnecessários versionados ou ausências no `.gitignore`.
- Rastreamento estrito contra credenciais, senhas ou tokens hardcoded.
- Proibição absoluta de `git push`, criação de tags ou merges remotos automáticos pelo assistente.

---

## 6. PADRONIZAÇÃO VISUAL DO ERP (UI/UX)

Revisão e padronização da interface corporativa:
- **Tipografia e Escala:**
  - Badges, status, metadados e células densas: `text-xs` (12px).
  - Campos de formulário, inputs, botões e textos de conteúdo: `text-sm` (14px).
  - Cabeçalhos de cards e seções: `text-base` a `text-lg` (16px a 18px), peso `font-semibold`.
  - Títulos de página e métricas: `text-xl` a `text-2xl` (20px a 24px), peso `font-bold`.
- **Componentes:** Padronização de botões, modais, formulários, alertas, tabelas, alinhamentos e espaçamentos.
- **Feedback:** Indicadores de carregamento (*spinners/skeletons*) e mensagens de validação claras.
- Preservar a identidade visual do ERP sem alterações cosméticas desnecessárias.

---

## 7. AUDITORIA E CORREÇÕES MOBILE

Garantir usabilidade total em celulares e tablets (Android e iOS):
- Menu lateral responsivo com drawer/overlay funcional.
- Tabelas com rolagem horizontal suave (`overflow-x-auto`) ou cartões responsivos em telas menores.
- Modais e telas de formulários adaptados sem corte de conteúdo (`w-full max-w-lg`, `max-h-[90vh] overflow-y-auto`).
- Botões e elementos interativos com área de toque mínima acessível (`min-h-[44px]`).
- Prevenção de quebra de layout por teclado virtual e legibilidade preservada.

---

## 8. VERIFICAÇÃO DE PERFORMANCE

- Análise de tempo de carregamento e requisições duplicadas.
- Otimização de renderizações desnecessárias no React/Next.js.
- Paginação de tabelas e carregamento eficiente de grandes volumes de dados.
- Otimização de imagens, CSS e scripts estáticos.

---

## 9. VALIDAÇÃO DO SCRIPT ATUALIZA-VERSÃO.BAT

Auditar detalhadamente o arquivo:
`C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`

- Analisar fluxo de execução, dependências de compilação e validações de segurança.
- **NÃO EXECUTAR O BAT.**
- Garantir que o comando de envio da VPS inclua a rotina de limpeza de imagens Docker antigas e cache de compilação.
- Manter integradas as opções:
  - `[1] Validar e enviar versao para VPS Oracle`
  - `[2] Backup local dos dados e migrations do Supabase`
  - `[3] Manutencao manual - diagnostico, simulacao e plano aprovado`
  - `[4] Sair`

---

## 10. TESTES E VALIDAÇÃO LOCAL DO BUILD

Antes de liberar qualquer versão:
1. Validar linter do frontend (`npm run lint`).
2. Executar build do frontend Next.js (`npm run build`).
3. Validar linter e testes do backend (`npm --prefix contrx-backend run lint`, `npm --prefix contrx-backend run test`).
4. Executar build do backend NestJS (`npm --prefix contrx-backend run build`).
5. Auditar segurança de pacotes (`npm audit --omit=dev --audit-level=high`).
6. Confirmar se o build está tecnicamente apto para envio manual pelo usuário.

---

## 11. CONTROLE DE VERSÕES E RELEASE NOTES

- Versão Atual Base: `V1.0.25`.
- Próxima Versão Alvo: `V1.0.26` (sincronizada em `package.json`, `contrx-backend/package.json` e documentações).
- Atualização das notas de lançamento em `constants/release-notes.ts`.
- Exibição automática do modal de novidades (`WhatsNewModal`) no primeiro login após o deploy.

---

## 12. RELATÓRIO FINAL OBRIGATÓRIO

Ao término de cada execução sob o comando **"INICIAR"**, apresentar:

**RELATÓRIO DE AUDITORIA — CONTRX ERP**
- **Versão analisada e preparada:**
- **Data da análise:**
- **Status geral do sistema:**
  - Frontend (Lint & Build): [Aprovado / Falhas]
  - Backend (Build & Schema): [Aprovado / Falhas]
  - Supabase & Migrations: [Atualizado / Pendente]
  - VPS Oracle (Rotina de Limpeza Docker): [Configurada / Pendente]
  - Higienização de Usuários (Whitelist): [Conferida / Pronta]
  - Responsividade Mobile: [Validada]
  - Visual e UX/UI ERP: [Padronizado]
- **Problemas identificados e corrigidos:**
- **Arquivos modificados:**
- **Orientações para o deploy manual via `ATUALIZA-VERSÃO.BAT`:**
