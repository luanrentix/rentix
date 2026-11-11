'use strict';
// Entrada interativa exclusiva para manutenção manual. Nunca importar no deploy.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { spawnSync } = require('node:child_process');

async function main() {
  const backendDir = path.resolve(__dirname, '../..');
  let env = path.join(backendDir, '.env.supabase');
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const askPath = async (label, mustExist) => {
      const value = (await input.question(label)).trim().replace(/^"(.*)"$/, '$1');
      if (!value) throw new Error('Caminho obrigatorio. Operacao cancelada.');
      const file = path.resolve(backendDir, value);
      if (mustExist && !fs.statSync(file).isFile()) throw new Error('Arquivo invalido.');
      return file;
    };
    let mode;
    while (!mode) {
      console.log('\nMANUTENCAO MANUAL - LIMPEZA CONTROLADA');
      console.log(`Ambiente selecionado: ${env === path.join(backendDir, '.env.supabase') ? 'PRODUCAO / SUPABASE' : 'PERSONALIZADO'}`);
      console.log(`Arquivo: ${env}`);
      console.log('[1] Diagnostico (somente leitura)');
      console.log('[2] Simulacao (somente leitura)');
      console.log('[3] Executar plano aprovado (exclusao real)');
      console.log('[4] Usar outro arquivo de ambiente');
      console.log('[0] Voltar');
      console.log('Este menu nao executa scripts arbitrarios nem acompanha o deploy.');
      const choice = (await input.question('Escolha: ')).trim();
      if (choice === '0' || !choice) return;
      if (choice === '4') {
        env = await askPath('Outro arquivo de ambiente (caminho relativo a contrx-backend): ', true);
        continue;
      }
      mode = { '1': 'diagnose', '2': 'dry-run', '3': 'execute' }[choice];
      if (!mode) throw new Error('Opcao invalida.');
    }
    if (!fs.existsSync(env) || !fs.statSync(env).isFile()) {
      throw new Error('Arquivo de ambiente nao encontrado. Use a opcao 4 para selecionar outro. Nenhuma conexao iniciada.');
    }
    const output = path.join(backendDir, 'backups', `cleanup-${mode}-${Date.now()}.json`);
    const args = ['--env', env, '--out', output];
    if (mode === 'execute') {
      console.log('EXCLUSAO REAL: exige revisao humana, janela de manutencao e backup com restauracao testada.');
      console.log('Resolva todos os bloqueios e revise docs/limpeza-controlada.md antes de continuar.');
      const planFile = await askPath('Relatorio de simulacao aprovado (JSON): ', true);
      const approvalFile = await askPath('Aprovacao humana (JSON): ', true);
      const restoreEnv = await askPath('Ambiente do banco LOCAL VAZIO de restauracao: ', true);
      const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
      const approval = JSON.parse(fs.readFileSync(approvalFile, 'utf8'));
      if (plan.mode !== 'dry-run' || !/^[a-f0-9]{64}$/.test(plan.planHash) ||
          plan.planHash !== approval.planHash || plan.targetId !== approval.targetId ||
          !Array.isArray(plan.blockers) || plan.blockers.length ||
          !['production', 'isolated'].includes(approval.environment)) {
        throw new Error('Plano bloqueado, invalido ou diferente da aprovacao.');
      }
      const expected = `${approval.environment === 'production' ? 'LIMPAR PRODUCAO' : 'LIMPAR BASE ISOLADA'} ${plan.planHash}`;
      console.log(`Ambiente declarado: ${approval.environment}. Confira o destino e os IDs no plano.`);
      console.log(`Confirmacao exigida: ${expected}`);
      const confirmation = await input.question('Digite a confirmacao completa (Enter cancela): ');
      if (confirmation !== expected) throw new Error('Confirmacao divergente. Nenhuma execucao iniciada.');
      args.push('--plan', planFile, '--approval', approvalFile, '--restore-env', restoreEnv, '--confirm', confirmation);
    }
    input.close();
    // Argumentos separados, sem shell: caminhos e confirmacoes nunca viram comandos.
    const result = spawnSync(process.execPath, [path.join(__dirname, `${mode}.cjs`), ...args], {
      cwd: path.resolve(__dirname, '../..'), stdio: 'inherit', shell: false, windowsHide: true,
    });
    if (result.error || result.status !== 0) throw new Error('Manutencao interrompida. Confira a mensagem do script.');
    console.log(`Relatorio: ${output}`);
  } finally { input.close(); }
}
if (require.main === module) main().catch(error => {
  console.error(`Operacao cancelada/interrompida: ${error.code || error.message}`);
  process.exitCode = 1;
});
