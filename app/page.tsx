"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VALID_EMAIL = "luan@Rentix.com";
const VALID_PASSWORD = "123456";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !password) {
      alert("Informe e-mail e senha.");
      return;
    }

    if (email !== VALID_EMAIL || password !== VALID_PASSWORD) {
      alert("E-mail ou senha inválidos.");
      return;
    }

    localStorage.setItem("rentix_logged", "true");
    localStorage.setItem(
      "rentix_user",
      JSON.stringify({
        name: "Luan",
        email: VALID_EMAIL,
      })
    );

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff7ed]">
      <div className="grid min-h-screen lg:grid-cols-[42%_58%]">
        <section className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 px-10 py-10">
          <div className="absolute -left-40 top-64 h-[520px] w-[520px] rounded-full border border-white/10" />
          <div className="absolute -left-24 top-80 h-[360px] w-[360px] rounded-full border border-white/10" />

          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-xl shadow-orange-900/20">
              <img
                src="/logo.png"
                alt="Rentix"
                className="h-20 w-20 object-contain"
              />
            </div>

            <div>
              <h1 className="text-5xl font-black tracking-tight text-white">
                Rentix
              </h1>
              <p className="mt-1 text-sm font-semibold text-white/90">
                Sistema de Gestão de Locações
              </p>
            </div>
          </div>

          <div className="relative z-20 mx-auto w-full max-w-[560px] rounded-[2rem] bg-white p-10 shadow-2xl shadow-orange-950/25 lg:absolute lg:left-20 lg:top-1/2 lg:-translate-y-1/2">
            <h2 className="text-center text-4xl font-light tracking-tight text-slate-950">
              Bem-vindo ao{" "}
              <span className="font-black text-orange-600">Rentix!</span>
            </h2>

            <form onSubmit={handleLogin} className="mt-10 space-y-5">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
                <span className="text-xl text-orange-600">✉️</span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="E-mail"
                  className="w-full bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
                <span className="text-xl text-orange-600">🔒</span>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Senha"
                  className="w-full bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-lg text-slate-400 transition hover:text-orange-600"
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4 text-lg font-black text-white shadow-xl shadow-orange-200 transition hover:from-orange-700 hover:to-orange-600"
              >
                Entrar
              </button>

              <button
                type="button"
                className="block w-full text-center text-sm font-bold text-orange-600 transition hover:text-orange-700"
              >
                Esqueceu sua senha?
              </button>
            </form>
          </div>

          <p className="relative z-10 text-center text-base font-semibold text-white">
            Rentix © {new Date().getFullYear()}
          </p>
        </section>

        <section className="hidden min-h-screen items-center justify-center bg-white px-12 lg:flex">
          <div className="max-w-3xl">
            <div className="rounded-[2rem] bg-orange-50 p-10">
              <div className="mx-auto flex h-[420px] w-full max-w-[620px] items-center justify-center rounded-[2rem] bg-white shadow-sm">
                <div className="text-center">
                  <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-[2rem] bg-orange-100 text-6xl">
                    🏠
                  </div>

                  <h2 className="text-4xl font-black tracking-tight text-slate-950">
                    Gestão de locações simples, rápida e inteligente.
                  </h2>

                  <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-500">
                    Controle imóveis, inquilinos, contratos, vencimentos e
                    receitas em uma plataforma moderna e profissional.
                  </p>

                  <div className="mt-10 grid grid-cols-3 gap-4">
                    <InfoCard title="Imóveis" value="Controle total" />
                    <InfoCard title="Contratos" value="Integração real" />
                    <InfoCard title="Financeiro" value="Automático" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type InfoCardProps = {
  title: string;
  value: string;
};

function InfoCard({ title, value }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4 text-center shadow-sm">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 text-xs font-semibold text-orange-600">{value}</p>
    </div>
  );
}