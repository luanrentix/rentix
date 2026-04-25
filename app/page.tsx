"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rentix_remember_email");

    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  function handleLogin() {
    const validEmail = "luan@rentix.com";
    const validPassword = "123";

    if (
      email.trim().toLowerCase() === validEmail &&
      password === validPassword
    ) {
      localStorage.setItem("rentix_logged", "true");

      localStorage.setItem(
        "rentix_user",
        JSON.stringify({
          name: "Luan",
          email: validEmail,
        })
      );

      if (remember) {
        localStorage.setItem("rentix_remember_email", email);
      } else {
        localStorage.removeItem("rentix_remember_email");
      }

      router.push("/dashboard");
      return;
    }

    setLoginError(true);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <div className="grid min-h-screen grid-cols-[42%_58%]">
        <section className="relative flex min-h-screen flex-col bg-gradient-to-br from-[#ff4b00] via-[#f04400] to-[#d93200] px-9 pt-10">
          <div className="absolute -bottom-24 -left-20 h-[430px] w-[430px] rounded-full border border-white/15" />
          <div className="absolute -bottom-5 -left-8 h-[300px] w-[300px] rounded-full border border-white/10" />

          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-35 w-35 items-center justify-center rounded-[22px] bg-white shadow-lg">
              <Image src="/logo-rentix.png" alt="Rentix" width={82} height={82} priority />
            </div>

            <div>
              <h1 className="text-[48px] font-black leading-none text-white">
                Rentix
              </h1>
              <p className="mt-2 text-sm font-bold text-white">
                Sistema de Gestão de Locações
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex justify-center">
            <div className="w-full max-w-[525px] rounded-[30px] bg-white px-10 py-11 shadow-2xl">
              <h2 className="mb-9 text-center text-[34px] font-light tracking-[-1px] text-slate-950">
                Bem-vindo ao{" "}
                <span className="font-black text-[#ff4b00]">Rentix!</span>
              </h2>

              <div className="space-y-5">
                <div className="flex h-[62px] items-center rounded-2xl border border-slate-200 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.10)]">
                  <div className="flex h-full w-[64px] items-center justify-center text-2xl">
                    ✉
                  </div>

                  <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-full flex-1 rounded-r-2xl bg-white px-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex h-[62px] items-center rounded-2xl border border-slate-200 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.10)]">
                  <div className="flex h-full w-[64px] items-center justify-center text-2xl">
                    🔒
                  </div>

                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleLogin();
                    }}
                    className="h-full flex-1 bg-white px-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex h-full w-[64px] items-center justify-center text-xl transition hover:bg-slate-50"
                  >
                    {showPassword ? "🙉" : "🙈"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span className="text-sm font-bold text-slate-600">
                    Salvar credenciais
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  className="h-[60px] w-full rounded-2xl bg-[#ff4b00] text-base font-black text-white shadow-[0_14px_30px_rgba(255,75,0,0.28)] transition hover:bg-[#e94400]"
                >
                  Entrar
                </button>
              </div>

              <button
                type="button"
                className="mt-6 w-full text-center text-sm font-black text-[#ff4b00]"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </div>

          <p className="relative z-10 mt-auto pb-10 text-center text-base font-black text-white">
            Rentix created by Luan H. L. Santos © 2026
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-white px-10">
          <div className="w-full max-w-[705px] rounded-[32px] bg-[#fff6ec] p-10">
            <div className="rounded-[30px] border border-slate-100 bg-white px-8 pb-8 pt-0 text-center shadow-sm">
              <div className="mx-auto -mt-2 mb-9 flex h-32 w-32 items-center justify-center rounded-[30px] bg-[#ffedd2] text-[66px]">
                🏠
              </div>

              <h2 className="mx-auto max-w-[650px] text-[34px] font-black leading-tight tracking-[-1px] text-slate-950">
                Gestão de locações simples, rápida e inteligente.
              </h2>

              <p className="mx-auto mt-7 max-w-[620px] text-lg leading-8 text-slate-600">
                Controle imóveis, inquilinos, contratos, vencimentos e receitas
                em uma plataforma moderna e profissional.
              </p>
            </div>
          </div>
        </section>
      </div>

      {loginError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
          <div className="w-full max-w-[460px] overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-red-100">
            <div className="bg-gradient-to-r from-red-50 via-white to-orange-50 px-7 py-6">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500 text-2xl text-white shadow-lg shadow-red-500/25">
                    ⚠️
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Acesso não autorizado
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Verifique seu e-mail e senha para continuar.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLoginError(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Fechar aviso"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-7 pb-7 pt-5">
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm font-bold text-red-700">
                  E-mail ou senha inválidos.
                </p>
                <p className="mt-1 text-xs font-medium text-red-500">
                  Tente novamente ou revise as credenciais informadas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLoginError(false)}
                className="mt-5 h-12 w-full rounded-2xl bg-[#ff4b00] text-sm font-black text-white shadow-[0_12px_24px_rgba(255,75,0,0.24)] transition hover:bg-[#e94400]"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}