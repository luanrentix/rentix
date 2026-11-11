# Falha de entrada de usuário criado — 09/11/2026

## Diagnóstico

A captura mostra sessão identificada em `/inicio`, com bloqueio no carregamento da configuração da empresa. No código, o `AppShell` consultava `GET /settings` para preparar menu, ramo e tema. Essa rota exige `settings:view`. Um colaborador autorizado para Vendas, mas sem Configurações, recebe 403 e não consegue preparar o ambiente em uma sessão sem cache.

Essa causa foi reproduzida pelos testes de autorização locais. O status da requisição autenticada específica em produção não foi coletado; portanto, outros erros de infraestrutura ou de vínculo da conta ainda não foram descartados para essa sessão.

## Correção local

- Nova rota `GET /settings/runtime`, autenticada por JWT e vinculada exclusivamente à empresa da sessão.
- Retorna somente campos permitidos de apresentação da empresa e tema. Não retorna configurações privadas, preferências do administrador nem modelos de impressão.
- Inicialização de colaborador usa essa rota. Usuário autorizado para Configurações mantém o fluxo administrativo existente.
- `GET /settings` e `PUT /settings` continuam exigindo suas permissões; nenhuma permissão foi ampliada na conta.
- Cache de inicialização distingue empresa, usuário e autorização para ler configurações.
- Cabeçalho usa o nome do usuário autenticado.

## Validação e publicação

Testes de regressão cobrem colaborador de Vendas, negação de leitura/escrita administrativa, JWT obrigatório na nova rota, projeção de campos, empresa da sessão, empresa sem configuração e empresa inexistente. Há roteiro do cliente para verificar rota e rejeição de resposta de outra empresa.

Validações locais: nove testes de autorização e configuração aprovados, roteiro do cliente aprovado, TypeScript do frontend e builds de frontend e backend aprovados. A rota nova respondeu 401 sem sessão no backend local, confirmando que não é pública. O ESLint do shell aponta avisos anteriores, sem erros.

Sem migration ou alteração de contas/dados em produção. Para disponibilizar a correção, é necessário atualizar **frontend e backend** pelo procedimento manual habitual. Não foram executados commit, push ou deploy. Não é necessário conceder acesso administrativo de Configurações ao colaborador como contorno.
