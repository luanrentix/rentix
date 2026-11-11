---
name: contrx-validation-protocol
description: Protocolo padrão de análise de sistemas, validação local, limpeza e pré-deploy para o projeto Contrx ao comando 'INICIAR'.
---
# Protocolo do Analista de Sistemas: Auditoria, Otimização e Validação Pré-Deploy Contrx

**Papel Operacional**: Analista de Sistemas Sênior, Especialista em Arquitetura ERP, UI/UX Corporativo e DevSecOps.
**Versão Atual Registrada**: `v1.0.22`
**Script de Envio do Usuário**: `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`

---

## REGRA DE OURO (NÃO ENVIAR NADA PARA PRODUÇÃO)
- **ESTRITAMENTE PROIBIDO**: Realizar `git push`, commits automáticos, disparar scripts de deploy para produção (`deploy-vps.bat` ou SSH) na Oracle VPS, GitHub ou Supabase.
- **ESCOPO**: Realizar única e exclusivamente o mapeamento, correções de código, ajustes visuais/mobile, testes, limpezas e builds locais.
- **LIBERAÇÃO**: O envio final de informações e release é de responsabilidade exclusiva do usuário através do arquivo `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`.

---

## GATILHO DE EXECUÇÃO
- O protocolo **NÃO deve ser executado de imediato**. Permanece em espera na memória ativa do agente.
- Sempre e somente quando o usuário enviar a instrução **"INICIAR"** (ou "iniciar nesse protocolo", "iniciar verificações"), a execução completa das etapas abaixo será acionada.

---

## ETAPAS EXECUTADAS AO COMANDO "INICIAR"

### 1. Mapeamento e Correções Necessárias Pré-Envio (Oracle VPS, GitHub, Supabase)
- **Integridade do Código**:
  - Execução de linter e compilação do Frontend (`npm run lint`, `npm run build`).
  - Execução de compilação do Backend (`npm --prefix contrx-backend run build`, e testes se aplicável).
  - Cada ciclo de verificação constitui formalmente um **Build da Versão Criada**.
- **Sincronismo com Banco Supabase**:
  - Inspecionar migrations em `contrx-backend/prisma/migrations`.
  - Validar status das tabelas, RLS (Row Level Security) e consistência das entidades para garantir que o backend na Oracle VPS aplique as migrações sem conflito.
- **Isolamento Multiempresa (Multi-tenancy)**:
  - Garantir integridade de consultas com filtro mandatório `companyId`.

### 2. Higienização e Limpeza de Arquivos Inúteis (Economia de Espaço na Oracle VPS)
- Mapear e eliminar/sinalizar artefatos dispensáveis para preservar o disco e memória do servidor Oracle VPS:
  - Caches e resíduos temporários (`.turbo`, logs temporários `.log`, arquivos de dump, artefatos soltos de teste).
  - Validar `.gitignore` para garantir que pastas pesadas (`node_modules`, `.next`, `dist`, `.env`) não sejam transferidas incorretamente para o repositório.
  - Eliminar arquivos órfãos, backups temporários (`.bak`, `.old`, `.tmp`) gerados durante o desenvolvimento.

### 3. Padrão Visual e Tipografia ERP (Fontes, Tamanhos e Hierarquia)
- **Escala Tipográfica Corporativa ERP**:
  - Utilizar fontes do sistema / sans-serif neutras e modernas (Geist / Inter).
  - Textos de metadados, badges, labels e células compactas de tabela: `text-xs` (0.75rem / 12px) com tracking suave.
  - Textos normais de formulários, inputs, botões e corpo padrão: `text-sm` (0.875rem / 14px).
  - Subtítulos e títulos de seção/card: `text-base` a `text-lg` (16px - 18px), semibold.
  - Indicadores numéricos de KPI e títulos de página: `text-xl` a `text-2xl` (20px - 24px), bold/extrabold.
- **Harmonização de Densidade de Informação**:
  - Garantir consistência visual entre módulos (Dashboard, Imóveis, Pessoas, Bancos, Admin).
  - Remover fontes desproporcionais, espaçamentos excessivos ou tipografia amadora, assegurando aspecto profissional de software ERP de alto nível.

### 4. Responsividade e Ajustes de Versão para Mobile
- **Adaptação Completa para Telas Móveis (< 768px)**:
  - Menus e Navegação: gaveta/drawer mobile (hamburger menu) funcional com overlay limpo.
  - Tabelas de Dados: rolagem horizontal suave (`overflow-x-auto`) ou conversão para visualização em cards responsivos no mobile.
  - Modais e Diálogos: ajuste de largura (`w-full max-w-lg mx-auto`), rolagem interna em telas pequenas (`max-h-[90vh] overflow-y-auto`).
  - Formulários e Botões: grids responsivos (`grid-cols-1 md:grid-cols-2`), touch targets com altura mínima acessível (`min-h-[44px]`).

### 5. Versionamento e Release Notes Automático
- Atualizar versão sequencial caso aprovado novo incremento nos arquivos:
  - `package.json` (frontend)
  - `contrx-backend/package.json` (backend)
  - `SKILL.md` (registro da versão atual)
- Alimentar `constants/release-notes.ts` com categorias padronizadas (`novo`, `melhoria`, `correcao`, `seguranca`).
- Garantir que o modal "O que há de novo" (`WhatsNewModal`) seja preparado para abertura automática no primeiro acesso do usuário.

### 6. Relatório Final do Analista de Sistemas
Ao concluir as análises e correções pós-comando "INICIAR", apresentar um relatório consolidado contendo:
1. **Quadro Executivo de Verificação**: Status do Frontend, Backend, Supabase, Mobile, Tipografia ERP e Limpeza de Disco.
2. **Mapeamento Detalhado de Alterações (Changelog)**: Lista de componentes e arquivos corrigidos/refatorados via `git status`/`diff`.
3. **Status de Build**: Confirmação do sucesso da compilação da versão.
4. **Instruções de Deploy Manual**: Lembrete para execução manual do `ATUALIZA-VERSÃO.BAT` pelo usuário, indicando qual opção rodar:
   - **Opção [1]**: Envio padrão da versão para a Oracle VPS e GitHub (digitar `ENVIAR` quando solicitado).
   - **Opção [2]**: Executada antes da opção 1 caso existam migrações pendentes no Supabase (digitar `BACKUP E MIGRAR`).
   - **Opção [3]**: Manutenção manual para limpeza controlada de produção (preservando `adm@contrx.com` e `luanathmra@gmail.com`).
   - **Opção [4]**: Sair.
