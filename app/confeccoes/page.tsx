"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Banknote, CalendarDays, ChartNoAxesCombined, CheckCheck, ChevronRight, ClipboardList, Cloud, CloudLightning, CloudRain, CloudSun, Droplets, LayoutDashboard, MapPin, Moon, Package, RefreshCw, RotateCcw, Search, Settings2, ShoppingBag, Snowflake, Sparkles, Store, Target, Truck, Users, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCompanyStorageKey } from "@/services/company-storage";
import { getConfectionsOverview, getDashboardWeather, searchDashboardCities, type ConfectionsOverview, type DashboardCity, type DashboardWeather } from "@/services/confections-dashboard.service";
import WhatsNewModal from "@/components/modals/whats-new-modal";
import WeatherLandscape, { weatherScene } from "./weather-landscape";
import packageJson from "@/package.json";

const shortcuts = [
  { id: "sales", title: "Nova venda", href: "/vendas?view=POS", icon: ShoppingBag },
  { id: "cash", title: "Caixa", href: "/vendas?view=CAIXA", icon: Banknote },
  { id: "products", title: "Produtos e estoque", href: "/vendas?view=PRODUTOS", icon: Package },
  { id: "customers", title: "Clientes", href: "/vendas?view=CLIENTES", icon: Users },
  { id: "suppliers", title: "Fornecedores", href: "/vendas?view=FORNECEDORES", icon: Truck },
  { id: "reports", title: "Relatórios", href: "/vendas?view=RELATORIOS", icon: ChartNoAxesCombined },
  { id: "conditional", title: "Condicionais", href: "/vendas?view=ABRIR&tipo=CONDICIONAL", icon: ClipboardList },
  { id: "orders", title: "Pedidos e orçamentos", href: "/vendas?view=ABRIR", icon: Store },
  { id: "returns", title: "Estornos", href: "/vendas?view=ESTORNOS", icon: RotateCcw },
];
type Preferences = { cityId: number | null; shortcuts: string[]; goal: number };
const defaults: Preferences = { cityId: null, shortcuts: shortcuts.slice(0, 6).map(item => item.id), goal: 0 };
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const card = "rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export default function ConfectionsHome() {
  const { user } = useAuth();
  const storageKey = user ? getCompanyStorageKey(user.companyId, `contrx_confections_home:${user.id}`) : null;
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [overview, setOverview] = useState<ConfectionsOverview | null>(null);
  const [overviewError, setOverviewError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [weather, setWeather] = useState<DashboardWeather | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherRefresh, setWeatherRefresh] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [modal, setModal] = useState<"location" | "shortcuts" | "goal" | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DashboardCity[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [goalError, setGoalError] = useState("");
  const [newsOpen, setNewsOpen] = useState(false);

  useEffect(() => {
    let value = defaults;
    try {
      const raw = storageKey ? localStorage.getItem(storageKey) : null;
      const stored = raw ? JSON.parse(raw) : null;
      if (stored) value = {
        cityId: Number.isInteger(stored.cityId) && stored.cityId > 0 ? stored.cityId : null,
        shortcuts: Array.isArray(stored.shortcuts) && stored.shortcuts.some((id: string) => shortcuts.some(item => item.id === id)) ? [...new Set<string>(stored.shortcuts.filter((id: string) => shortcuts.some(item => item.id === id)))] : defaults.shortcuts,
        goal: Number.isFinite(stored.goal) && stored.goal >= 0 ? stored.goal : 0,
      };
    } catch { /* Preferencias locais opcionais. */ }
    setPreferences(value); setLoadedKey(storageKey); setOverview(null); setWeather(null);
  }, [storageKey]);
  const savePreferences = (update: Partial<Preferences>) => {
    const next = { ...preferences, ...update };
    setPreferences(next);
    try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* A tela permanece utilizavel sem armazenamento. */ }
  };

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => { setNow(new Date()); setRefresh(value => value + 1); }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!storageKey || loadedKey !== storageKey) return;
    let canceled = false;
    setLoading(true);
    getConfectionsOverview(preferences.cityId).then(data => { if (!canceled) { setOverview(data); setOverviewError(""); } })
      .catch(() => { if (!canceled) setOverviewError("Não foi possível atualizar o resumo da loja."); })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [storageKey, loadedKey, preferences.cityId, refresh]);

  const city = overview?.selectedCity || null;
  const cityId = city?.id;
  useEffect(() => {
    if (!cityId) return;
    let canceled = false;
    setWeatherLoading(true); setWeatherError("");
    getDashboardWeather(cityId).then(data => { if (!canceled) setWeather(data); })
      .catch(() => { if (!canceled) setWeatherError("Clima indisponível no momento."); })
      .finally(() => { if (!canceled) setWeatherLoading(false); });
    const timer = window.setInterval(() => setWeatherRefresh(value => value + 1), 15 * 60000);
    return () => { canceled = true; window.clearInterval(timer); };
  }, [cityId, weatherRefresh]);
  useEffect(() => {
    if (modal !== "location" || query.trim().length < 2) { setResults([]); setSearching(false); setSearchError(""); return; }
    setResults([]); setSearching(true); setSearchError("");
    let canceled = false;
    const timer = window.setTimeout(() => {
      setSearching(true); setSearchError("");
      searchDashboardCities(query.trim()).then(data => { if (!canceled) setResults(data); })
        .catch(() => { if (!canceled) setSearchError("Não foi possível buscar as cidades."); })
        .finally(() => { if (!canceled) setSearching(false); });
    }, 250);
    return () => { canceled = true; window.clearTimeout(timer); };
  }, [modal, query]);
  const closeModal = useCallback(() => setModal(null), []);
  useEffect(() => {
    if (!modal) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") closeModal(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [modal, closeModal]);

  const timeZone = overview?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hour = now ? Number(new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now)) : 12;
  const currentWeather = weather?.city.id === city?.id ? weather : null;
  const scene = currentWeather ? weatherScene(currentWeather.symbol, hour) : hour < 6 || hour >= 18 ? "night" : "cloudy";
  const WeatherIcon = scene === "night" ? Moon : scene === "storm" ? CloudLightning : scene === "rain" ? CloudRain : scene === "snow" ? Snowflake : scene === "cloudy" ? currentWeather?.symbol.includes("partlycloudy") ? CloudSun : Cloud : CloudSun;
  const weatherLabel = scene === "night" ? "Noite" : scene === "storm" ? "Trovoadas na previsão" : scene === "rain" ? "Previsão de chuva" : scene === "snow" ? "Previsão de neve" : currentWeather?.symbol.includes("partlycloudy") ? "Sol entre nuvens" : scene === "cloudy" ? "Céu nublado" : "Tempo aberto";
  const greeting = now ? hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite" : "Bem-vindo";
  const firstName = user?.name?.trim().split(/\s+/)[0] || "";
  const dateLabel = now ? new Intl.DateTimeFormat("pt-BR", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(now) : "Hoje";
  const daily = overview?.daily;
  const metrics = [
    { title: "Vendas concluídas", value: daily ? number(daily.sales) : "—", icon: ShoppingBag },
    { title: "Faturamento líquido", value: daily ? money(daily.revenue) : "—", icon: Banknote },
    { title: "Peças · saldo vendido", value: daily ? number(daily.items) : "—", icon: Package },
    { title: "Ticket médio", value: daily ? money(daily.average) : "—", icon: ChartNoAxesCombined },
  ];
  const pending = overview?.pending;
  const tasks = [
    { label: "Parcelas de crediário vencidas", count: pending?.overdue, href: "/vendas?view=CLIENTES", icon: Banknote, alert: true },
    { label: "Produtos com estoque baixo", count: pending?.lowStock, href: "/vendas?view=PRODUTOS", icon: Package, alert: true },
    { label: "Condicionais em aberto", count: pending?.conditionals, href: "/vendas?view=ABRIR&tipo=CONDICIONAL", icon: ClipboardList, alert: false },
    { label: "Pedidos e orçamentos em aberto", count: pending?.orders, href: "/vendas?view=ABRIR", icon: Store, alert: false },
  ];
  const pendingCount = pending ? Object.values(pending).reduce((sum, value) => sum + value, 0) : 0;
  const goalPercent = preferences.goal > 0 && overview ? Math.max(0, overview.monthly.revenue / preferences.goal * 100) : 0;
  const goalProgress = Math.min(100, goalPercent);
  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(goalDraft.includes(",") ? goalDraft.replace(/\./g, "").replace(",", ".") : goalDraft);
    if (!Number.isFinite(value) || value < 0 || value > 999999999) { setGoalError("Informe uma meta válida em reais."); return; }
    savePreferences({ goal: Math.round(value * 100) / 100 }); closeModal();
  }

  return <div data-confections-home className="space-y-5 pb-3">
    <div className="flex items-center justify-between gap-4">
      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><LayoutDashboard className="h-4 w-4 text-[var(--primary-color)]" />Painel da loja</div>
    </div>

    <section aria-label="Boas-vindas e clima" className="relative isolate overflow-hidden rounded-2xl border border-[var(--primary-border-light)]">
      <WeatherLandscape scene={scene} />
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/5 dark:from-slate-900/95 dark:via-slate-900/80 dark:to-slate-900/10" />
      <div className="relative grid items-center gap-5 px-5 py-6 sm:px-7 lg:grid-cols-[1.2fr_1fr] lg:py-7">
        <div><div className="mb-3 inline-flex items-center gap-2 rounded-md bg-[var(--primary-bg-light)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-color)]"><CalendarDays className="h-3.5 w-3.5" /><span className="capitalize">{dateLabel}</span></div><h1 className="border-l-4 border-[var(--primary-color)] pl-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">{greeting}{firstName ? `, ${firstName}` : ""}!</h1><p className="mt-2 max-w-lg pl-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Que bom ter você por aqui. Acompanhe os resultados e organize a rotina da sua loja em um só lugar.</p></div>
        <div className="rounded-2xl border border-white/30 bg-slate-950/80 p-4 text-white shadow-lg backdrop-blur-sm sm:p-5">
          <button type="button" onClick={() => { setQuery(city?.name || ""); setSearchError(""); setModal("location"); }} className="mb-3 flex max-w-full items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white"><MapPin className="h-3.5 w-3.5" /><span className="truncate">{city ? `${city.name} · ${city.state}` : "Selecionar cidade"}</span><ChevronRight className="h-3 w-3" /></button>
          {currentWeather ? <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-3"><WeatherIcon className="h-9 w-9 text-amber-200" /><strong className="text-3xl font-black tabular-nums">{Math.round(currentWeather.temperature)}°C</strong></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/75">{currentWeather.feelsLike !== null && <span>Sensação {Math.round(currentWeather.feelsLike)}°C</span>}{currentWeather.humidity !== null && <span>Umidade {Math.round(currentWeather.humidity)}%</span>}</div></div><div className="max-w-44 text-xs leading-5"><p className="font-semibold">{weatherLabel}</p><p className="text-white/75">{currentWeather.temperature >= 30 ? "Dia quente por aí. Tenha água por perto." : scene === "rain" || scene === "storm" ? "Planeje suas saídas e leve um guarda-chuva." : "Tudo pronto para mais um dia de bons negócios."}</p></div></div> : <div className="flex items-center gap-3 py-1"><WeatherIcon className="h-9 w-9 text-white/60" /><p className="text-sm text-white/80">{weatherLoading ? "Consultando previsão…" : city ? "Previsão indisponível" : "Escolha sua cidade para acompanhar o tempo."}</p></div>}
          {currentWeather && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px] text-white/60"><span className="inline-flex items-center gap-1"><Droplets className="h-3 w-3" />{currentWeather.probability !== null ? `Chuva ${Math.round(currentWeather.probability)}%` : currentWeather.precipitation !== null ? `${number(currentWeather.precipitation)} mm nas próximas ${currentWeather.precipitationHours}h` : "Previsão por localização"}</span><span><a href="https://www.met.no/en" target="_blank" rel="noreferrer" className="underline">Clima: MET Norway</a> | <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">CC BY 4.0</a></span></div>}
          {weatherError && <div role="status" className="mt-2 flex items-center justify-between gap-2 text-xs text-white/80"><span>{weatherError}</span><button type="button" disabled={weatherLoading} onClick={() => setWeatherRefresh(value => value + 1)} className="underline disabled:opacity-50">Tentar novamente</button></div>}
        </div>
      </div>
    </section>

    <section aria-label="Acessos rápidos" className="space-y-3"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white"><LayoutDashboard className="h-4 w-4 text-[var(--primary-color)]" />Acessos rápidos</h2><button type="button" onClick={() => setModal("shortcuts")} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary-color)] hover:underline"><Settings2 className="h-3.5 w-3.5" />Personalizar</button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{preferences.shortcuts.map(id => shortcuts.find(item => item.id === id)!).filter(Boolean).map(({ id, title, href, icon: Icon }, index) => <Link key={id} href={href} className={`${card} group flex min-h-28 flex-col items-center justify-center gap-3 p-4 text-center transition hover:-translate-y-0.5 hover:border-[var(--primary-color)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[var(--primary-color)] ${index === 0 ? "border-[var(--primary-border-light)] bg-[var(--primary-bg-light)]" : ""}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-bg-light)] text-[var(--primary-color)]"><Icon className="h-5 w-5" /></span><span className="text-xs font-bold text-slate-900 dark:text-slate-100">{title}</span></Link>)}</div></section>

    {overviewError && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{overviewError}{overview ? " Exibindo o último resumo carregado." : ""}</span><button type="button" onClick={() => setRefresh(value => value + 1)} className="shrink-0 font-semibold underline">Tentar novamente</button></div>}
    <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <section aria-label="Resumo do dia" className={`${card} p-5`}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white"><ChartNoAxesCombined className="h-4 w-4 text-[var(--primary-color)]" />Resumo do dia</h2><button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading} aria-label="Atualizar resumo" className="rounded-lg p-1 text-slate-400 hover:text-[var(--primary-color)] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div><p className="mt-1 text-xs text-slate-500">Vendas e trocas concluídas{overview ? ` · ${new Date(`${overview.date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</p><div className="mt-5 grid grid-cols-2 gap-y-5 sm:grid-cols-4">{metrics.map(({ title, value, icon: Icon }, index) => <div key={title} className={`px-3 ${index > 0 ? "sm:border-l sm:border-slate-100 dark:sm:border-slate-800" : "pl-0"}`}><span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-bg-light)] text-[var(--primary-color)]"><Icon className="h-4 w-4" /></span><p className="text-[11px] font-medium text-slate-500">{title}</p><strong className="mt-1 block text-lg font-black tabular-nums text-slate-950 dark:text-white">{value}</strong></div>)}</div>{daily?.revenueChange !== null && daily?.revenueChange !== undefined && <p className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${daily.revenueChange >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}><ArrowUpRight className="h-3.5 w-3.5" />{daily.revenueChange > 0 ? "+" : ""}{daily.revenueChange.toFixed(1)}% de faturamento em relação a ontem</p>}</section>
      <section aria-label="Tarefas e pendências" className={`${card} p-5`}><h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white"><ClipboardList className="h-4 w-4 text-[var(--primary-color)]" />Tarefas e pendências{pending && <span className="rounded-full bg-[var(--primary-bg-light)] px-2 py-0.5 text-xs text-[var(--primary-color)]">{number(pendingCount)}</span>}</h2><div className="space-y-2">{tasks.map(({ label, count, href, icon: Icon, alert }) => <Link key={label} href={href} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 transition hover:border-[var(--primary-border-light)] hover:bg-[var(--primary-bg-light)] dark:border-slate-800 dark:bg-slate-800/40"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${alert && count ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" : "bg-[var(--primary-bg-light)] text-[var(--primary-color)]"}`}><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1 text-xs text-slate-700 dark:text-slate-200"><strong>{count === undefined ? "—" : number(count)}</strong> {label.toLocaleLowerCase("pt-BR")}</span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" /></Link>)}</div></section>
    </div>

    <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
      <section aria-label="Meta mensal" className={`${card} p-5`}><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white"><Target className="h-4 w-4 text-[var(--primary-color)]" />Minha meta do mês</h2><button type="button" onClick={() => { setGoalDraft(preferences.goal ? String(preferences.goal).replace(".", ",") : ""); setGoalError(""); setModal("goal"); }} aria-label="Definir meta mensal" className="rounded-lg p-1 text-[var(--primary-color)]"><Settings2 className="h-4 w-4" /></button></div><div className="mt-5 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs text-slate-500">Faturamento da loja neste mês</p><strong className="mt-1 block text-xl font-black tabular-nums text-slate-950 dark:text-white">{overview ? money(overview.monthly.revenue) : "—"}</strong></div><div className="text-right text-xs text-slate-500">{preferences.goal > 0 ? <><p>Meta: {money(preferences.goal)}</p><strong className="mt-1 block text-slate-900 dark:text-white">{goalPercent.toFixed(1)}%</strong></> : <button type="button" onClick={() => { setGoalDraft(""); setGoalError(""); setModal("goal"); }} className="font-semibold text-[var(--primary-color)]">Definir minha meta</button>}</div></div><div role="progressbar" aria-label="Progresso da meta mensal" aria-valuenow={Math.round(goalProgress)} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[var(--primary-color)] transition-[width]" style={{ width: `${goalProgress}%` }} /></div></section>
      <section className={`${card} p-5`}><h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white"><Sparkles className="h-4 w-4 text-[var(--primary-color)]" />Novidades do Contrx<span className="rounded bg-[var(--primary-bg-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-color)]">v{packageJson.version}</span></h2><div className="mt-5 flex items-center gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-bg-light)] text-[var(--primary-color)]"><CheckCheck className="h-6 w-6" /></span><div><p className="text-sm font-bold text-slate-900 dark:text-white">Sua loja, cada vez mais organizada.</p><p className="mt-1 text-xs leading-5 text-slate-500">Confira as melhorias e os recursos disponíveis na sua versão.</p><button type="button" onClick={() => setNewsOpen(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary-color)]">Ver novidades<ArrowRight className="h-3.5 w-3.5" /></button></div></div></section>
    </div>

    {modal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}><section role="dialog" aria-modal="true" aria-labelledby="home-dialog-title" className={`${card} flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden`}><header className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800"><h2 id="home-dialog-title" className="font-bold text-slate-900 dark:text-white">{modal === "location" ? "Selecionar cidade" : modal === "shortcuts" ? "Personalizar acessos" : "Minha meta do mês"}</h2><button type="button" onClick={closeModal} aria-label="Fechar" className="rounded-lg p-1 text-slate-500"><X className="h-5 w-5" /></button></header>
      {modal === "location" && <div className="min-h-0 overflow-y-auto p-4"><label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input autoFocus aria-label="Buscar cidade brasileira" placeholder="Digite a cidade e, se desejar, a UF" value={query} onChange={event => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pr-3 pl-9 text-sm text-slate-800 outline-none focus:border-[var(--primary-color)] dark:border-slate-700 dark:text-white" /></label><p className="mt-2 text-xs text-slate-500">A cidade escolhida ajusta o clima, a saudação e o fuso do painel.</p>{searching && <p role="status" className="py-3 text-sm text-slate-500">Buscando cidades…</p>}{searchError && <p role="alert" className="py-3 text-sm text-red-600">{searchError}</p>}<div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{results.map(result => <button type="button" key={result.id} onClick={() => { savePreferences({ cityId: result.id }); closeModal(); }} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left text-sm text-slate-700 hover:bg-[var(--primary-bg-light)] dark:text-slate-200"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--primary-color)]" />{result.name} · {result.state}</span><ChevronRight className="h-4 w-4" /></button>)}</div>{query.trim().length >= 2 && !searching && !searchError && !results.length && <p className="py-4 text-sm text-slate-500">Nenhuma cidade encontrada. Confira o nome e a UF.</p>}</div>}
      {modal === "shortcuts" && <div className="space-y-2 overflow-y-auto p-4"><p className="mb-3 text-xs text-slate-500">Escolha os acessos que deseja manter no seu início.</p>{shortcuts.map(({ id, title, icon: Icon }) => <label key={id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"><input type="checkbox" checked={preferences.shortcuts.includes(id)} disabled={preferences.shortcuts.length === 1 && preferences.shortcuts.includes(id)} onChange={event => savePreferences({ shortcuts: event.target.checked ? [...preferences.shortcuts, id] : preferences.shortcuts.filter(value => value !== id) })} className="h-4 w-4 accent-[var(--primary-color)]" /><Icon className="h-4 w-4 text-[var(--primary-color)]" /><span className="text-sm text-slate-700 dark:text-slate-200">{title}</span></label>)}</div>}
      {modal === "goal" && <form onSubmit={saveGoal} className="space-y-4 p-4"><p className="text-sm text-slate-500">Defina a meta que deseja acompanhar com o faturamento da loja.</p><label className="block space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200"><span>Meta em reais</span><input autoFocus inputMode="decimal" value={goalDraft} onChange={event => setGoalDraft(event.target.value)} placeholder="Ex.: 40.000,00" className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 outline-none focus:border-[var(--primary-color)] dark:border-slate-700" /></label>{goalError && <p role="alert" className="text-xs text-red-600">{goalError}</p>}<button className="rounded-xl bg-[var(--primary-color)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]">Salvar meta</button></form>}
    </section></div>}
    <WhatsNewModal isOpen={newsOpen} onClose={() => setNewsOpen(false)} currentVersion={packageJson.version} />
  </div>;
}
