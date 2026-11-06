# Codigo curto da empresa

Formato: CTX- seguido dos cinco primeiros caracteres de empresas.id, em maiusculas.
Exemplo: ID iniciado por bab91 gera CTX-BAB91. O login exige usuario e senha.

A migracao 20261106180000_company_code_from_id substitui os codigos sequenciais
existentes e instala um trigger para gerar o codigo em novos cadastros.
IDs, usuarios, sessoes e relacionamentos sao preservados.
Os colaboradores devem usar o novo codigo no proximo login por empresa.

Cinco caracteres do UUID podem coincidir. A migracao cancela integralmente se
houver prefixos duplicados; novos cadastros com duplicidade sao rejeitados pelo
indice unico. Nenhum ID existente e alterado para contornar colisoes.
O campo Prisma usa dbgenerated() porque o trigger preenche o codigo.

Aplicada apenas no banco local, com backup verificado e conferencia das contagens.
A atualizacao em producao e manual, pelo responsavel, no fluxo habitual de versao.

Teste isolado: node scripts/validate-company-code-from-id-local.js (no backend).
Cobre conversao pelo ID, geracao automatica e rejeicao de colisoes.
