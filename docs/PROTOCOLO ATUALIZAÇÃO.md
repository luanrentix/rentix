# PROTOCOLO DE ANÁLISE DE SISTEMAS, HIGIENIZAÇÃO E PRÉ-DEPLOY CONTRX

**Atuação**: Analista de Sistemas Sênior, Especialista em Arquitetura ERP, UI/UX Corporativo e DevSecOps.  
**Versão Atual Registrada**: `v1.0.21`  
**Gatilho de Execução**: Comando explícito **"INICIAR"** (ou variações como *"iniciar nesse protocolo"*, *"iniciar"*).  
**Script de Envio Manual**: `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`

---

## 1. REGRA DE OURO (SEM ENVIO AUTOMÁTICO PARA PRODUÇÃO)

- **Proibição Expressa**: O agente **NUNCA** deve realizar `git push`, commits automáticos, ou disparar comandos de deploy para produção na Oracle VPS, GitHub ou Supabase.
- **Escopo Exclusivo**: Realizar exclusivamente o mapeamento, correções de código, ajustes de layout mobile, padronização visual ERP, higienização de arquivos desnecessários e testes/builds locais.
- **Envio de Responsabilidade do Usuário**: Toda sincronização e subida de versão são realizadas manualmente pelo usuário por meio do executável:
  ```bat
  C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT
  ```

---

## 2. GATILHO DE EXECUÇÃO ("INICIAR")

- O protocolo permanece em **espera (standby)** na memória do sistema.
- **NÃO** executar análises ou correções de forma antecipada ou autônoma.
- Apenas iniciar os procedimentos quando o usuário enviar a instrução: **`INICIAR`**.

---

## 3. PILARES DE VERIFICAÇÃO E CORREÇÃO

### A. Mapeamento, Integridade e Build da Versão
1. Cada ciclo de verificação constitui formalmente um **Build da Versão Criada**.
2. **Frontend**:
   - Execução de linter: `npm run lint`.
   - Compilação completa: `npm run build`.
3. **Backend**:
   - Compilação completa: `npm --prefix contrx-backend run build`.
   - Validação de testes unitários/e2e quando aplicável.
4. **Sincronismo Supabase & Banco de Dados**:
   - Inspecionar pasta de migrações: `contrx-backend/prisma/migrations`.
   - Garantir que não existam inconsistências estruturais que impeçam a subida das migrations na Oracle VPS.
   - Validar Row Level Security (RLS) e isolamento multiempresa obrigatório por `companyId`.

### B. Higienização e Otimização de Espaço (Oracle VPS)
1. **Mapeamento de Arquivos Inúteis**:
   - Identificar arquivos temporários, logs residuais (`.log`), arquivos de dump ou teste abandonados.
   - Limpar arquivos de backup temporários (`.bak`, `.old`, `.tmp`).
2. **Proteção do Armazenamento da VPS**:
   - Validar `.gitignore` para assegurar que diretórios pesados (`node_modules`, `.next`, `dist`, `.env`) não sejam transferidos ou versionados incorretamente.
   - Evitar acúmulo de arquivos órfãos que possam degradar o espaço em disco da máquina virtual Oracle.

### C. Padronização Visual e Tipografia ERP
1. **Escala Tipográfica Corporativa**:
   - **Metadados / Badges / Células de Tabela Densa**: `text-xs` (12px), com tracking refinado e contraste adequado.
   - **Campos de Formulário / Inputs / Botões / Texto Padrão**: `text-sm` (14px).
   - **Subtítulos / Headers de Seção e Cards**: `text-base` a `text-lg` (16px a 18px), peso `font-semibold`.
   - **Títulos de Páginas / Métricas e KPIs**: `text-xl` a `text-2xl` (20px a 24px), peso `font-bold` ou `font-extrabold`.
2. **Consistência de Interface ERP**:
   - Manter a densidade de informação compacta, moderna e limpa típica de sistemas ERP corporativos.
   - Eliminar fontes desproporcionais, espaçamentos excessivos ou componentes desarmônicos.

### D. Responsividade e Ajustes Mobile
1. **Navegação Mobile**:
   - Menu hambúrguer / gaveta lateral (*drawer*) totalmente funcional com overlay e fechamento intuitivo.
2. **Tabelas e Listagens**:
   - Rolagem horizontal fluida (`overflow-x-auto`) com indicadores visuais ou conversão dinâmica para cartões no mobile.
3. **Modais e Formulários**:
   - Adaptação de largura (`w-full max-w-lg mx-auto`).
   - Rolagem interna em telas pequenas (`max-h-[90vh] overflow-y-auto`).
   - Touch targets confortáveis com altura mínima acessível (`min-h-[44px]`).

### E. Versionamento e Release Notes
1. **Controle Sequencial de Versão**:
   - Atualizar a versão sincronizada nos arquivos:
     - `package.json` (frontend)
     - `contrx-backend/package.json` (backend)
     - `SKILL.md` e `PROTOCOLO.md`
2. **Notas de Lançamento (`constants/release-notes.ts`)**:
   - Cadastrar os destaques da versão categorizados com precisão:
     - `novo`: novas funcionalidades e telas.
     - `melhoria`: otimizações de performance, UI e UX.
     - `correcao`: correção de bugs e inconsistências.
     - `seguranca`: proteções de dados, RLS e autenticação.
3. **Modal de Novidades Automático**:
   - Garantir que o modal `WhatsNewModal` seja exibido automaticamente ao usuário no primeiro login após o deploy da nova versão.

---

## 4. RELATÓRIO FINAL DO ANALISTA DE SISTEMAS

Ao finalizar a execução acionada pelo comando **"INICIAR"**, o agente deverá apresentar um parecer estruturado contendo:

1. **Quadro Executivo de Status**:
   - Frontend (Lint & Build): Aprovado / Falhas
   - Backend (Build & Schema): Aprovado / Falhas
   - Supabase & Migrations: Atualizado / Pendente
   - Higienização de Disco (Oracle VPS): Concluída
   - Padronização Visual ERP: Aprovada
   - Ajustes Mobile: Aprovados
2. **Mapeamento Detalhado de Alterações (Changelog)**:
   - Relação de arquivos modificados via `git status` / `git diff`.
3. **Orientação para Deploy Manual**:
   - Lembrete explícito instruindo o usuário a executar o arquivo `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`.
