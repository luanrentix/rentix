export default function InitialPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Bem-vindo ao Contrx!</h1>
      <p className="mt-3 text-slate-600" role="status">
        Seu acesso está ativo. Se nenhum módulo de trabalho aparecer no menu,
        solicite ao administrador da empresa a liberação das suas permissões.
      </p>
    </section>
  );
}
