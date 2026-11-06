# Diagnóstico e proposta: usuários, acessos e sessões

Data: 06/11/2026. Fase 1: análise estática do código e do schema Prisma. Não representa auditoria do banco remoto nem validação funcional das funcionalidades propostas.

## Solicitação e referência

A solicitação efetiva é o prompt anexado sobre usuários, controle de acesso e sessões simultâneas. O arquivo `plano-implementacao-login-usuario-empresa.md` é referência técnica: seus exemplos e itens marcados não comprovam implementação ou testes. A imagem fornecida representa o login, sem detalhamento visual de uma árvore de permissões. A organização dos acessos deverá seguir os módulos reais e os componentes atuais.

O prompt determina: “Antes de qualquer migration destrutiva, mudança de arquitetura compartilhada ou alteração que possa afetar funcionalidades fora do escopo, interrompa a execução e solicite autorização.” A substituição do validador central de sessão e a extensão do guard de permissões afetam a autenticação compartilhada. Por isso, esta entrega apresenta a mudança concreta para autorização antes de editar esses componentes.

## Comparação com o sistema

| Funcionalidade e objetivo | Situação encontrada | Alteração necessária |
| --- | --- | --- |
| Login administrativo: preservar acesso por e-mail e senha | Existe em `/autenticacao/login`, com bcrypt, JWT e validação da empresa/assinatura | Manter endpoint, recuperação de senha e regras atuais; usar o mesmo emissor de sessões do novo login |
| Login operacional: identificar empresa antes do usuário | Não há endpoint ou campos de código/login | Adicionar `/autenticacao/login-usuario`, normalização e busca restrita à empresa; erros de credenciais genéricos |
| Código da empresa: identificação pública para colaboradores | `Company` não possui `code` | Código único e estável, consulta/cópia somente no contexto autorizado; o código não concede acesso |
| Nome de usuário: permitir o mesmo login em empresas distintas | `User.email` é único global; não há `username` | Login normalizado com unicidade composta por empresa; preservar unicidade e funcionamento do e-mail |
| Cadastro da equipe: complementar o formulário existente | Nome, e-mail, senha, perfil, ativo e permissões por módulo já existem | Acrescentar login, confirmação quando aplicável, limite de sessões e acessos por ação, sem duplicar cadastro |
| Isolamento administrativo | Listagem e alterações de usuários usam a empresa do administrador; guard administrativo já existe | Reutilizar contexto autenticado em todas as novas consultas e mutações; testar IDs de outra empresa |
| Acessos: autorizar operações reais no servidor | `ToolPermissionGuard` valida módulos; administradores/proprietários possuem regras privilegiadas | Estender o guard e o catálogo existentes com ações explícitas por endpoint; preservar permissões legadas |
| Sessões simultâneas: manter até o limite e retirar a mais antiga | `User.activeSessionId` permite somente uma sessão; novo login substitui a anterior | Nova estrutura persistente de sessões e transação serializada por usuário |
| Revogação: bloquear token encerrado no backend | JWT compara identificador único usando cache de usuário de até 30 segundos | Consultar validade persistida da sessão em cada requisição protegida e conferir empresa do token |
| Gestão de sessões: consultar e encerrar remotamente | Não há endpoints nem tela específicos | Consulta e revogação individual/todas, restritas à empresa e ao administrador autorizado |
| Logout: encerrar acesso no servidor | Frontend apenas limpa autenticação local | Endpoint que revoga a sessão atual; limpar cliente mesmo em falha de rede, sem afirmar revogação remota quando não confirmada |
| Dispositivo, atividade e histórico | Há último login, mas não histórico individual de sessões | Registrar criação, atividade, expiração, encerramento, motivo e identificação aproximada pelo navegador |
| Aviso e redirecionamento | Há evento para 401, aviso de sessão substituída e verificação periódica de 60 segundos | Motivos estruturados, mensagem compatível com limites maiores e verificação sem cache |

## Incompatibilidades da referência

1. O exemplo de `loginCompanyUser` ainda grava somente `activeSessionId`. Copiá-lo impediria os acessos simultâneos solicitados.
2. O preenchimento do login pelo prefixo do e-mail pode gerar duplicatas dentro da empresa. Não aplicar o SQL de exemplo sem tratar colisões e normalização.
3. Códigos aleatórios curtos também podem colidir. A geração precisa de restrição única e tratamento de conflito, inclusive no cadastro de novas empresas.
4. As mensagens distintas de empresa inexistente, usuário inexistente e senha incorreta do exemplo contradizem seu checklist de prevenção de enumeração. Usar resposta genérica para credenciais inválidas.
5. O rate limit atual usa IP, rota e e-mail em memória. Não implementa a proteção por empresa/login alegada pela referência; precisará incluir as novas identidades e um limite por IP que não possa ser contornado apenas trocando o login. Sua abrangência continua limitada por processo sem armazenamento compartilhado.
6. O frontend não inclui `OWNER` na mesma lista de perfis privilegiados do backend. Também há diferença de comportamento para permissões ausentes. A compatibilidade deve seguir os direitos efetivos do servidor, sem ampliar acessos silenciosamente.
7. O cache GET da API é separado por token, mas consultas de validade de sessão e gestão de sessões precisam ignorá-lo. Uma resposta em cache não pode validar uma sessão revogada.

## Modelo de dados proposto para aprovação

- `Company`: adicionar `code`, com geração segura para novas empresas e preenchimento das antigas com tratamento de colisões. Fazer a evolução em etapas antes de exigir valor obrigatório.
- `User`: adicionar `username` opcional para compatibilidade, unicidade por `companyId` e login normalizado; `maxConcurrentSessions` inteiro positivo com padrão 1; configuração opcional de ações que estende as permissões atuais, com distinção explícita entre configuração legada e restrição granular.
- `UserSession`: nova tabela com identificador interno, identificador opaco de sessão, usuário, empresa, criação, última atividade, expiração, revogação, motivo e responsável quando aplicável. Índices para consulta das sessões válidas por usuário/empresa e ordenação por criação. Integridade referencial deve impedir associação cruzada entre empresa e usuário.
- Auditoria: reutilizar o mecanismo existente, avaliando `CommercialHistory`, sem registrar senha, hash ou token. Registrar alterações de limite e encerramentos administrativos.

Manter `activeSessionId` durante a transição; não apagar usuários, registros ou histórico. Preservar a expiração atual do JWT de um dia, sem introduzir refresh token nesta entrega. A migração das sessões legadas deve considerar `activeSessionId` e `lastLoginAt`, evitando reativar sessão já revogada. Casos sem informação suficiente devem ser identificados na validação da migração, antes da aplicação.

Arquivos de migração serão preparados para revisão e execução manual. Nenhuma alteração de banco remoto, commit, push ou deploy está incluída.

## Comportamento transacional e autorização

Os dois logins e a criação de conta utilizarão a mesma rotina de emissão de sessão. A transação deverá serializar logins e alterações de limite pelo usuário, revalidar seu estado, desconsiderar sessões expiradas, revogar as mais antigas excedentes e criar a nova sessão. Ordenação estável por data e identificador evita resultados ambíguos. Reduzir o limite preservará as sessões mais recentes na mesma estratégia de bloqueio.

O validador JWT conferirá usuário ativo, empresa, assinatura, vínculo do token e sessão persistida. O cache atual não poderá manter uma autorização revogada. A atualização da última atividade deve ser limitada em frequência sem reabrir sessões encerradas.

A definição de ações será explícita por rota: POST não significa necessariamente cadastrar, pois há cancelamentos, consultas e operações especiais. Incluir endpoints compartilhados de arquivos conforme a entidade para evitar contorno de permissões. Impressão e exportação devem respeitar os endpoints utilizados; dados já entregues legitimamente ao navegador não podem ser impedidos de serem copiados por uma simples permissão visual.

Permissões antigas por módulo continuam com seu alcance atual até configuração granular explícita. Perfis administrativos mantêm suas regras; a interface comum não poderá atribuir proprietário do sistema ou elevar o próprio usuário. A empresa virá do contexto autenticado, nunca de um campo livre do formulário.

Reset de senha, desativação e alterações administrativas de credenciais deverão revogar sessões de forma consistente. Na troca de senha pelo próprio usuário, preservar apenas a sessão atual e encerrar as demais, com informação clara. Logout encerra a sessão atual. Abas do mesmo navegador que compartilham o token representam a mesma sessão; não há identificação física confiável de computador.

O backend bloqueará a próxima operação autenticada após revogação. A tela ociosa identificará o encerramento na verificação periódica ou ao recuperar foco. Não prometer desconexão visual instantânea sem canal de notificação; reutilizar o mecanismo atual com verificação sem cache, sem criar infraestrutura adicional.

## Arquivos e componentes envolvidos

| Área | Arquivos existentes a estender |
| --- | --- |
| Modelo e migração | `contrx-backend/prisma/schema.prisma`; nova pasta de migração aditiva |
| Login e usuários | `contrx-backend/src/autenticacao/autenticacao.controller.ts`, `autenticacao.service.ts`, `autenticacao.module.ts`, DTOs e tipo do usuário autenticado |
| Sessões | `contrx-backend/src/autenticacao/strategies/estrategia-jwt.ts`; novo serviço de sessões e DTOs de gestão |
| Permissões | Guard e decorator de ferramentas existentes; metadados explícitos nos endpoints dos módulos envolvidos, sem alterar suas regras operacionais |
| Proteção de tentativas | `contrx-backend/src/autenticacao/guards/rate-limit.guard.ts` |
| Login no navegador | `app/login/page.tsx`, `context/AuthContext.tsx`, `services/auth.ts`, `services/api.ts` |
| Configurações | `app/configuracoes/page.tsx`, `components/UserSettingsTab.tsx`, `components/CompanySettingsTab.tsx`, tipos de configurações |
| Catálogo e integração | `services/company-users.service.ts`, `services/tool-permissions.ts`; tipos e verificações de ações nos pontos correspondentes |

Os caminhos de componentes da tabela são relativos a `app/configuracoes`. Novos testes deverão acompanhar serviços, guard e fluxos de integração. Arquivos já possuem alterações anteriores no workspace; elas devem ser preservadas.

## Fases e validação prevista

1. Diagnóstico: esta entrega. Nenhum código de aplicação foi alterado nesta fase.
2. Login por empresa: schema/migração aditiva, código, login, endpoint e abas, preservando aparência atual e login por e-mail.
3. Cadastro: novos campos no formulário existente, consulta/cópia do código, validações e limite positivo.
4. Acessos: catálogo de ações reais, seleção individual/grupo, restaurar alterações não salvas e validação equivalente no servidor.
5. Sessões: emissão comum, concorrência, limite, revogação, expiração e transição do identificador legado.
6. Gestão: sessões por usuário, encerramento individual/todas e auditoria; atualização do estado no frontend.
7. Validação: testes automatizados de serviço/guard e integração com PostgreSQL isolado para concorrência e constraints; builds de frontend/backend e verificação visual dos formulários. Não utilizar produção para testes.

Cobertura exigida: login administrativo; login operacional; empresa incorreta; login igual em empresas diferentes; usuário inativo; ação proibida por API; limites 1 e 2; token revogado; revogação administrativa; redução do limite; logins concorrentes; expiração; logout; tentativa cruzada entre empresas; regressão de login, reset, assinatura e operações existentes.

Testes com mocks não comprovam serialização no PostgreSQL. Builds não comprovam isolamento entre empresas. Cada resultado será reportado separadamente e pendências serão explicitadas.

## Riscos e decisão necessária

Os principais riscos são invalidar tokens durante a transição, ampliar ou restringir direitos legados, colisão no preenchimento de códigos/logins, corrida entre login e revogação e incompatibilidade de versões durante publicação. Mitigar com mudanças aditivas, testes de concorrência, manutenção dos campos antigos e plano de publicação coordenada. Rollback de código após emissão de múltiplas sessões exige cuidado: o validador antigo reconhece apenas uma; não presumir rollback transparente.

Autorizar a implementação desta extensão da autenticação compartilhada, dos guards e do schema, com preparação de migrations aditivas para execução manual, é o próximo passo. A autorização anterior para tabelas complementares de Confecções não cobre estas tabelas compartilhadas de autenticação.
