"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    const validEmail = "luan@rentix.com";
    const validPassword = "123456";

    if (email.trim().toLowerCase() === validEmail && password === validPassword) {
      localStorage.setItem("rentix_logged", "true");

      localStorage.setItem(
        "rentix_user",
        JSON.stringify({
          name: "Luan",
          email: validEmail,
        })
      );

      router.push("/dashboard");
      return;
    }

    alert("E-mail ou senha inválidos.");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <div className="grid min-h-screen grid-cols-[42%_58%]">
        <section className="relative flex min-h-screen flex-col bg-gradient-to-br from-[#ff4b00] via-[#f04400] to-[#d93200] px-9 pt-10">
          <div className="absolute -bottom-24 -left-20 h-[430px] w-[430px] rounded-full border border-white/15" />
          <div className="absolute -bottom-5 -left-8 h-[300px] w-[300px] rounded-full border border-white/10" />

          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-[22px] bg-white shadow-lg">
              <Image src="/logo.png" alt="Rentix" width={82} height={82} priority />
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
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleLogin();
                    }}
                    className="h-full flex-1 bg-white px-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                  />

                  <div className="flex h-full w-[64px] items-center justify-center text-xl">
                    🙈
                  </div>
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
            Rentix © 2026
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

              <div className="mt-11 grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-orange-100 bg-white px-6 py-5 shadow-[0_4px_8px_rgba(15,23,42,0.08)]">
                  <h3 className="text-base font-black text-slate-950">
                    Imóveis
                  </h3>
                  <p className="mt-2 text-sm font-bold text-[#ff4b00]">
                    Controle total
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-white px-6 py-5 shadow-[0_4px_8px_rgba(15,23,42,0.08)]">
                  <h3 className="text-base font-black text-slate-950">
                    Contratos
                  </h3>
                  <p className="mt-2 text-sm font-bold text-[#ff4b00]">
                    Integração real
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-white px-6 py-5 shadow-[0_4px_8px_rgba(15,23,42,0.08)]">
                  <h3 className="text-base font-black text-slate-950">
                    Financeiro
                  </h3>
                  <p className="mt-2 text-sm font-bold text-[#ff4b00]">
                    Automático
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}