# Implementação de usuários, acessos e sessões

Data: 06/11/2026. Autorização: usuário aprovou a proposta e pediu verificar primeiro o print de erro da tela de vendas.

## Tela de vendas e API local

O print mostra indisponibilidade de `http://localhost:3001`. Não havia listener nessa porta. O backend local compilado foi iniciado em segundo plano e o endpoint raiz respondeu HTTP 200. O processo em execução foi mantido com a versão anterior à nova migração de autenticação.

O botão “Tentar novamente” agora recarrega produtos e contas de recebimento; a falha de produtos preserva a mensagem retornada pela API. Não houve alteração nas regras de vendas.

Nos logs também apareceu uma pendência anterior: a tabela `public.vendas_ajustes_credito` não existe no banco em uso. A migração de créditos preparada anteriormente é `20261106120000_sales_credit_adjustments_refund_settlements`. Ela não foi executada nesta entrega. HTTP 200 na raiz comprova disponibilidade da API, mas não comprova todos os fluxos autenticados de vendas nem resolve tabelas pendentes.

## Fase 2 — autenticação por empresa

- Mantido `/autenticacao/login` por e-mail/senha e o fluxo existente de recuperação de senha.
- Acrescentado `/autenticacao/login-usuario` com código da empresa e usuário ou e-mail dentro da empresa identificada.
- Login normalizado para minúsculas e código para maiúsculas; senha preservada literalmente.
- Código único de empresa gerado pelo PostgreSQL; login opcional único por empresa. Não foi feito preenchimento arriscado a partir de prefixos de e-mail.
- Abas de acesso administrativo e de usuário acrescentadas à tela existente, preservando suas cores e estrutura.
- Proteção de tentativas inclui a identidade composta e um teto por IP/rota. O armazenamento continua em memória por processo, sem infraestrutura distribuída nova.

Arquivos principais: `app/login/page.tsx`, `services/auth.ts`, `context/AuthContext.tsx`, controller/service de autenticação, DTO de login e rate-limit guard.

## Fases 3 e 4 — cadastro e acessos

- Estendidos os formulários existentes de equipe, com login, confirmação de senha, limite de 1 a 20 sessões e configuração granular de ações.
- Código da empresa disponível para consulta/cópia pelo administrador na aba de usuários.
- Permissões organizadas por módulos reais, com ações individuais e seleção/limpeza de grupo. Cancelar a edição descarta o formulário; há restauração explícita dos acessos não salvos.
- `permissions` por módulo foi preservado; `actionPermissions = null` mantém o alcance legado. Uma lista explícita, inclusive vazia, restringe ações.
- O mesmo `ToolPermissionGuard` passou a validar metadados de ações nas rotas existentes. Cancelamento, descarte e estorno via POST exigem ação de excluir/cancelar, não cadastrar.
- Mantidas as regras administrativas e a proteção de último administrador e de atribuição de proprietário. Usuários comuns continuam impedidos de gerenciar usuários e sessões pelas APIs.
- Anexos verificam a entidade e sua empresa antes da operação, aplicando as permissões do módulo correspondente.
- Impressões/exportações de vendas consultam autorização no servidor. Impressões locais dos módulos existentes verificam as permissões do usuário; compartilhamentos existentes são protegidos nas rotas correspondentes. Dados já legitimamente entregues ao navegador podem ser copiados ou impressos fora dos controles da aplicação; essas permissões não constituem DRM.

Arquivos principais: configurações de usuários e seus tipos/serviços, `UserAccessFields.tsx`, `services/access-actions.ts`, `services/tool-permissions.ts`, `services/authorize-action.ts`, `access-policy.ts`, guard/decorator de ferramentas e metadados nos controllers. Não foram modificadas as regras de cálculo, estoque, caixa ou financeiro.

## Fases 5 e 6 — sessões e gerenciamento

- Nova tabela `UserSession`, vinculada ao par usuário/empresa por chave estrangeira composta.
- Limite padrão 1 preserva o comportamento anterior; logins válidos mantêm os acessos mais recentes até o limite.
- Login, redução de limite, revogação e mudanças de senha utilizam bloqueio transacional do usuário. O novo login revalida estado e hash de senha após obter o bloqueio.
- Tokens continuam com validade de um dia. Não foi introduzido refresh token. Validade do JWT e expiração persistida são alinhadas.
- Sessão revogada, usuário inativo, empresa bloqueada e contexto de empresa divergente são recusados no backend. O cache de autenticação de 30 segundos foi retirado desse caminho.
- Logout revoga a sessão atual. Reset de senha revoga todas; troca pelo próprio usuário preserva a atual e revoga as demais. Desativação e troca administrativa de senha pelo cadastro da equipe também revogam sessões.
- Gestão permite consultar todas as sessões ativas e até 100 registros recentes de histórico, encerrar uma ou todas e consultar o limite do usuário. A consulta não expõe o identificador usado no JWT.
- Revogação administrativa e mudanças de limite são registradas no histórico existente. Os registros de sessões mantêm motivo, responsável e horário de encerramento.
- A identificação de dispositivo é aproximada, a partir do User-Agent, sem identificação física de máquina.
- Frontend verifica sessão sem cache a cada 15 segundos quando visível e ao recuperar foco. Atualiza permissões recebidas do servidor, limpa autenticação e redireciona em 401. Abas que compartilham armazenamento sincronizam a autenticação.
- O acesso de suporte autorizado foi integrado ao emissor comum para preservar sua compatibilidade com o novo validador.
- O reset de dados de teste já existente remove as sessões apenas dos usuários que ele próprio exclui, na mesma transação e empresa. Nenhuma limpeza desse tipo foi executada nesta entrega.

Arquivos principais: `user-sessions.service.ts`, estratégia JWT, controller/service/module de autenticação, contexto e cliente da API, gestão de sessões e integração do acesso de suporte.

## Banco e ativação manual

Migração preparada: `contrx-backend/prisma/migrations/20261106150000_company_login_user_sessions/migration.sql`.

Ela adiciona código à empresa, login/limite/ações ao usuário, índices/constraints e a tabela de sessões com RLS habilitada, sem políticas públicas. A conexão de backend precisa ter o acesso de servidor apropriado a essa tabela; ela não deve ser acessível diretamente pelo cliente anônimo.

As sessões antigas com identificador e último login são importadas uma única vez, respeitando a duração anterior de um dia. Registros sem último login suficiente não podem ter sua validade reconstruída com segurança e exigirão novo login. O campo antigo não é removido e não há recriação sob demanda de sessões encerradas.

Antes da aplicação manual, revisar backup, estado das migrations anteriores, permissões da conexão de servidor e eventuais identificadores legados duplicados. Executar a mudança com os processos antigos de backend parados, pois eles ainda gravam sessões pelo modelo anterior. Publicar frontend e backend de forma coordenada após a migração. A execução na base real, commits, push e deploy continuam manuais.

Não reiniciar o backend novo contra um banco sem esta migração: o novo código depende das colunas e da tabela acrescentadas. Rollback de código exige planejamento, pois o validador antigo reconhece apenas um identificador e não entende múltiplas sessões.

## Fase 7 — evidências e limitações

- Suíte completa do backend: 28 suítes, 191 testes aprovados.
- Testes de autenticação e administração repetidos após os ajustes finais: 4 suítes, 11 testes aprovados.
- Script `node scripts/validate-auth-sessions-local.js`: 23 cenários aprovados. Integração com PostgreSQL local real, tabelas vazias clonadas em schema temporário, migração aplicada somente nesse schema e remoção dele ao terminar. Verifica logins, migração legada, concorrência, limites, revogações, expiração, logout, senha/reset, empresa/assinatura, constraints e requisições HTTP reais de autorização e isolamento.
- Builds de frontend e backend aprovados. Verificações TypeScript do frontend e do backend de produção também passaram. O build do frontend emitiu avisos de depreciação do Node e de disponibilidade de localStorage na geração estática, sem impedir sua conclusão.
- Verificação visual tentou usar a skill de controle do computador. A ferramenta interrompeu o acesso por não conseguir identificar com segurança a URL do navegador no Windows. Não foi realizado login por automação; revisão visual e teste em dois navegadores/computadores continuam pendentes.

Na implementação inicial, não foram aplicadas migrations no schema da aplicação ou em produção. A ativação local posteriormente autorizada está registrada abaixo. Não se afirma que os fluxos completos da tela de vendas estejam validados só pela resposta da raiz da API.

## Atualização — ativação local autorizada

Após o print de `Cannot GET /autenticacao/empresa-codigo`, foi confirmado que a rota existia no código compilado, mas o processo em execução ainda era o anterior. Também foi confirmado que as novas colunas e a tabela de sessões ainda não existiam no banco local.

O usuário autorizou expressamente o backup, a aplicação da migração local de autenticação e o reinício do backend, respondendo “SIM”.

- Backup completo local criado: `contrx-backend/backups/pre-auth-2026-11-06T14-30-58-403Z.dump`, com 1.698.705 bytes. O índice do arquivo foi lido pelo `pg_restore --list`; manifesto com SHA-256 foi salvo ao lado. Não houve teste de restauração completa desse backup.
- Backend anterior encerrado; migração `20261106150000_company_login_user_sessions` aplicada em transação e registrada em `_prisma_migrations` com checksum. Contagens de empresas/usuários e importação de sessões foram verificadas antes do commit.
- Backend recompilado e iniciado com a versão atualizada.
- Raiz da API: HTTP 200. `/autenticacao/empresa-codigo` e `/autenticacao/sessao`: HTTP 401 sem credenciais, confirmando que as rotas protegidas estão registradas. Login operacional com credenciais inválidas: HTTP 401.
- Verificações no banco: código atribuído às empresas, valores legados de limite/permissões preservados, sessões legadas importadas e RLS habilitada na tabela de sessões.
- Script de manutenção explícita: `scripts/apply-auth-migration-local.js`. Exige destino local e backup compatível; não é chamado por inicialização ou deploy. A suíte isolada de integração foi adaptada para continuar recriando a estrutura anterior mesmo após a atualização local.
- A migração anterior de créditos continua pendente. Nenhuma alteração foi feita em produção, nenhum commit/push/deploy foi executado.

A tela de configurações precisa ser recarregada para repetir a consulta ao backend atualizado. Login com a conta real e revisão visual continuam a cargo do usuário; os testes de login/sessões usam contas descartáveis no schema isolado.

## Atualização — e-mail opcional e formas de login

Atendendo à solicitação posterior, o cadastro e a edição da equipe passaram a permitir marcar separadamente “Acesso administrativo — e-mail e senha” e “Acesso de usuário — código da empresa, usuário e senha”. É permitido marcar ambos; selecionar uma forma não altera a função ou as permissões administrativas.

Novos cadastros começam com acesso de usuário marcado e acesso administrativo desmarcado. E-mail é opcional nesse caso e é salvo como NULL, sem criar endereços fictícios; o nome de usuário é obrigatório. Ao habilitar acesso administrativo, o e-mail passa a ser obrigatório. O servidor rejeita cadastros sem nenhuma forma de login e recusa autenticação por uma forma desmarcada, inclusive quando existe e-mail de contato.

A migração `20261106160000_user_login_methods_optional_email` tornou `User.email` opcional, preservou sua unicidade quando informado e adicionou as duas opções com valores padrão verdadeiros para preservar os acessos anteriores. Constraints impedem configurações sem identidade utilizável. A migração foi aplicada somente no banco local após backup `contrx-backend/backups/pre-auth-2026-11-06T14-42-05-323Z.dump` (1.705.280 bytes, índice do arquivo e SHA-256 verificados), com backend parado durante a alteração e reiniciado após a compilação.

Edição permite alterar/remover o e-mail conforme as formas habilitadas. A listagem apresenta o login quando não há e-mail. Usuário sem e-mail não recebe notificação de resposta de suporte por e-mail; o chamado e a resposta permanecem disponíveis no sistema. A recuperação por e-mail existente permanece preservada; contas sem e-mail devem solicitar a alteração de senha ao administrador.

Validação: 27 cenários de integração aprovados no PostgreSQL isolado, incluindo vários usuários sem e-mail, acesso operacional, bloqueio de login por e-mail desmarcado, acesso exclusivo por e-mail e validações de cadastro/edição. Testes específicos de autenticação/suporte: 3 suítes, 10 testes aprovados. Builds do backend e do frontend aprovados, incluindo a verificação TypeScript. Arquivos arquivados em `_backups` foram excluídos da compilação, preservando seu conteúdo original.

Após a ativação local, API HTTP 200, login inválido HTTP 401 e coluna de e-mail opcional confirmados. Nenhum usuário anterior teve uma forma de login restringida pela migração; o novo cadastro com formas selecionadas realizado após a ativação foi mantido. Nenhuma migração de créditos, alteração remota, commit, push ou deploy foi executado nesta atualização.
