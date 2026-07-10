process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

async function main() {
  const localClient = new Client({ connectionString: 'postgresql://postgres@localhost:55432/contrx' });
  await localClient.connect();

  const accounts = await localClient.query('SELECT id, nome, saldo_atual, limite, ativo FROM contas_bancarias');
  const transactions = await localClient.query('SELECT id, conta_bancaria_id, tipo, status, valor, descricao FROM movimentacoes_bancarias');

  console.log('--- LOCAL accounts ---');
  console.log(accounts.rows);
  console.log('--- LOCAL transactions ---');
  console.log(transactions.rows);

  await localClient.end();
}

main().catch(console.error);
