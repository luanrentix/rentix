"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

    localStorage.setItem("rentix_logged", "true");
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen overflow-hidden bg-white">
      <section className="relative flex min-h-screen w-full flex-col justify-between bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 px-16 py-12 lg:w-[44%]">
        <div className="absolute -left-40 top-72 h-[520px] w-[520px] rounded-full border border-white/10" />
        <div className="absolute -left-28 top-80 h-[380px] w-[380px] rounded-full border border-white/10" />

        <div className="relative z-10 flex items-center gap-5">
          <img
            src="/logo.png"
            alt="Rentix"
            className="h-28 w-28 object-contain brightness-0 invert"
          />

          <div>
            <h1 className="text-6xl font-black italic tracking-tight text-white drop-shadow-sm">
              Rentix
            </h1>
            <p className="mt-1 text-base font-medium text-white">
              Sistema de Gestão de Locações
            </p>
          </div>
        </div>

        <div className="relative z-20 mb-16 mt-20 w-full max-w-[620px] rounded-[28px] bg-white px-14 py-12 shadow-2xl shadow-orange-950/25 lg:absolute lg:left-20 lg:top-[34%] lg:mb-0 lg:mt-0 lg:-translate-y-1/2">
          <h2 className="mb-9 text-center text-4xl font-light tracking-tight text-slate-900">
            Bem-vindo ao{" "}
            <span className="font-black text-orange-600">Rentix!</span>
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <span className="text-2xl text-orange-600">✉️</span>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-mail"
                className="w-full bg-transparent text-lg font-medium text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <span className="text-2xl text-orange-600">🔒</span>

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Senha"
                className="w-full bg-transparent text-lg font-medium text-slate-700 outline-none placeholder:text-slate-400"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xl text-slate-400 transition hover:text-orange-600"
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>

            <button
              type="submit"
              className="mt-7 w-full rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-5 text-xl font-black text-white shadow-xl shadow-orange-200 transition hover:from-orange-700 hover:to-orange-600"
            >
              Entrar
            </button>

            <button
              type="button"
              className="block w-full pt-2 text-center text-lg font-medium text-orange-600 transition hover:text-orange-700"
            >
              Esqueceu sua senha?
            </button>
          </form>
        </div>

        <p className="relative z-10 text-center text-xl font-medium text-white">
          Rentix © {new Date().getFullYear()}
        </p>
      </section>

      <section className="hidden min-h-screen flex-1 items-center justify-center bg-white px-10 lg:flex">
        <img
          src="/login-illustration.png"
          alt="Rentix Login Illustration"
          className="w-full max-w-[780px] object-contain"
        />
      </section>
    </main>
  );
}