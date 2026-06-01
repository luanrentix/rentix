import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Home,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import ExperimentSignupCard from "@/components/home/experiment-signup-card";

const appLoginUrl = process.env.NEXT_PUBLIC_APP_URL || "/login";
const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL;

const modules = [
  {
    title: "Bens/Ativos",
    description: "Carteira organizada com status, dados do proprietário e histórico.",
    icon: Home,
  },
  {
    title: "Pessoas",
    description: "Clientes, inquilinos e proprietários em um cadastro centralizado.",
    icon: Users,
  },
  {
    title: "Contratos",
    description: "Vencimentos, renovações e encerramentos acompanhados de perto.",
    icon: FileText,
  },
  {
    title: "Financeiro",
    description: "Contas a receber, contas a pagar, indicadores e relatórios.",
    icon: Landmark,
  },
  {
    title: "Agenda",
    description: "Compromissos e alertas conectados à rotina da gestão de contratos.",
    icon: CalendarDays,
  },
  {
    title: "Dashboard",
    description: "Visão rápida de ocupação, receita, contratos e pendências.",
    icon: BarChart3,
  },
];

const overviewMetrics = [
  { value: "82%", label: "ocupação" },
  { value: "38", label: "contratos ativos" },
  { value: "R$ 86,4 mil", label: "receita prevista" },
];

const previewRows = [
  { label: "Contratos vencendo", value: "6", tone: "bg-orange-50 text-orange-700" },
  { label: "Contas em atenção", value: "12", tone: "bg-red-50 text-red-700" },
  { label: "Bens/ativos disponíveis", value: "14", tone: "bg-emerald-50 text-emerald-700" },
];

export default async function HomePage() {
  const host = (await headers()).get("host")?.toLowerCase() || "";

  if (host === "app.contrx.com.br" || host.startsWith("app.contrx.com.br:")) {
    redirect("/login");
  }

  return (
    <main className="min-h-dvh bg-[#f8fafc] text-slate-950">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Contrx">
            <Image
              src="/contrx-logo-horizontal-light.png"
              alt="Contrx"
              width={2250}
              height={880}
              className="h-14 w-36 object-contain sm:w-44"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-black text-slate-600 md:flex">
            <a href="#modulos" className="transition hover:text-[#ff4b00]">
              Módulos
            </a>
            <a href="#controle" className="transition hover:text-[#ff4b00]">
              Controle
            </a>
            <a href="#contato" className="transition hover:text-[#ff4b00]">
              Contato
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={appLoginUrl}
              className="hidden h-11 items-center justify-center px-3 text-sm font-black text-slate-600 transition hover:text-[#ff4b00] sm:inline-flex"
            >
              Entrar
            </Link>
            <a
              href="#experimente"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ff4b00] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,75,0,0.24)] transition hover:bg-[#e94400]"
            >
              Experimente Grátis
              <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white pt-20">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,#ffffff_0%,#f8fafc_48%,#fff1e8_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-slate-950" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:py-14">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-black uppercase text-[#ff4b00]">
              <ShieldCheck size={16} />
              ERP de gestão de contratos online
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.04] text-slate-950 sm:text-5xl lg:text-6xl">
              Controle contratos, cobranças e vencimentos em um só painel.
            </h1>

            <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
              O Contrx organiza imóveis, pessoas, contratos, agenda e financeiro
              para sua equipe acompanhar a operação sem depender de planilhas
              soltas.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#experimente"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ff4b00] px-7 text-base font-black text-white shadow-[0_20px_45px_rgba(255,75,0,0.24)] transition hover:bg-[#e94400]"
              >
                Experimente Grátis
                <ArrowRight size={19} />
              </a>
              <Link
                href={appLoginUrl}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-base font-black text-slate-700 transition hover:border-orange-200 hover:text-[#ff4b00]"
              >
                Entrar no sistema
              </Link>
            </div>

            <div className="mt-8 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Exemplo de operação monitorada
                </p>
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129/0.14)]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {overviewMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[8px] border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-2xl font-black text-slate-950">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase text-slate-500">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-8 overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.22)] lg:mr-8">
              <div className="rounded-[18px] bg-white p-4">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-[#ff4b00]">
                      Visão operacional
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Painel de contratos
                    </h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#ff4b00]">
                    <BarChart3 size={22} />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {previewRows.map((row) => (
                    <div key={row.label} className={`rounded-2xl px-4 py-4 ${row.tone}`}>
                      <p className="text-2xl font-black">{row.value}</p>
                      <p className="mt-1 text-xs font-bold leading-4">{row.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.85fr]">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-black text-slate-800">
                        Receitas previstas
                      </p>
                      <p className="text-sm font-black text-slate-950">
                        R$ 86,4 mil
                      </p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white">
                      <div className="h-2 w-[82%] rounded-full bg-[#ff4b00]" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-500" size={18} />
                      <p className="text-sm font-black text-slate-800">
                        Agenda sincronizada
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                      Vistorias, cobranças e renovações em uma fila de atenção.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ExperimentSignupCard />
        </div>
      </section>

      <section id="modulos" className="bg-white py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase text-[#ff4b00]">
              Operação integrada
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
              Tudo que sua equipe acompanha no dia a dia, no mesmo ambiente.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <article
                  key={module.title}
                  className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#ff4b00]">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-slate-950">
                    {module.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                    {module.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="controle" className="bg-[#f7f8fb] py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-[#ff4b00]">
              Controle financeiro
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
              Receber, pagar, projetar e decidir com mais clareza.
            </h2>
            <p className="mt-6 max-w-xl text-base font-medium leading-8 text-slate-600">
              O Contrx reúne contratos, vencimentos e lançamentos financeiros
              para ajudar a equipe a enxergar o realizado, o projetado e o que
              exige atenção.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Contas a receber com status e pagamentos",
              "Contas a pagar vinculadas a pessoas e imóveis",
              "Relatórios financeiros por período",
              "Alertas para pendências operacionais",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <CheckCircle2 className="text-emerald-500" size={22} />
                <p className="mt-4 text-sm font-black leading-6 text-slate-800">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="bg-slate-950 py-16 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-orange-200">
              Contrx
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
              Entre no ERP ou conheça a plataforma com a nossa equipe.
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="#experimente"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ff4b00] px-7 text-base font-black text-white transition hover:bg-[#e94400]"
            >
              Experimente Grátis
              <ArrowRight size={19} />
            </a>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 px-7 text-base font-black text-white transition hover:bg-white/10"
              >
                <MessageCircle size={19} />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
