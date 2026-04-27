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
    <main className="min-h-screen bg-white">
      {/* RESPONSIVO AQUI */}
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[42%_58%]">
        
        {/* LADO ESQUERDO */}
        <section className="relative flex flex-col bg-gradient-to-br from-[#ff4b00] via-[#f04400] to-[#d93200] px-6 pt-8 lg:px-9 lg:pt-10">
          
          <div className="relative z-10 flex flex-col items-center gap-4 text-center lg:flex-row lg:text-left">
            <div className="flex h-24 w-24 items-center justify-center rounded-[22px] bg-white shadow-lg lg:h-35 lg:w-35">
              <Image src="/logo-rentix.png" alt="Rentix" width={70} height={70} priority />
            </div>

            <div>
              <h1 className="text-3xl font-black text-white lg:text-[48px]">
                Rentix
              </h1>
              <p className="mt-1 text-sm font-bold text-white">
                Sistema de Gestão de Locações
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex justify-center">
            <div className="w-full max-w-md rounded-[30px] bg-white px-6 py-8 shadow-2xl lg:max-w-[525px] lg:px-10 lg:py-11">
              
              <h2 className="mb-6 text-center text-2xl font-light text-slate-950 lg:text-[34px]">
                Bem-vindo ao{" "}
                <span className="font-black text-[#ff4b00]">Rentix!</span>
              </h2>

              <div className="space-y-4">
                
                <div className="flex h-[56px] items-center rounded-2xl border border-slate-200 bg-white">
                  <div className="flex h-full w-12 items-center justify-center text-xl lg:w-[64px] lg:text-2xl">
                    ✉
                  </div>

                  <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="flex-1 bg-white px-2 text-sm font-bold text-slate-700 outline-none"
                  />
                </div>

                <div className="flex h-[56px] items-center rounded-2xl border border-slate-200 bg-white">
                  <div className="flex h-full w-12 items-center justify-center text-xl lg:w-[64px] lg:text-2xl">
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
                    className="flex-1 bg-white px-2 text-sm font-bold text-slate-700 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex h-full w-12 items-center justify-center text-lg lg:w-[64px] lg:text-xl"
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
                  className="h-12 w-full rounded-2xl bg-[#ff4b00] text-sm font-black text-white"
                >
                  Entrar
                </button>
              </div>

              <button
                type="button"
                className="mt-4 w-full text-center text-sm font-black text-[#ff4b00]"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </div>

          <p className="mt-6 pb-6 text-center text-sm font-black text-white lg:mt-auto lg:pb-10">
            Rentix © 2026
          </p>
        </section>

        {/* LADO DIREITO (DESKTOP APENAS) */}
        <section className="hidden lg:flex min-h-screen items-center justify-center bg-white px-10">
          <div className="w-full max-w-[705px] rounded-[32px] bg-[#fff6ec] p-10">
            <div className="rounded-[30px] border border-slate-100 bg-white px-8 pb-8 pt-0 text-center shadow-sm">
              <div className="mx-auto -mt-2 mb-9 flex h-32 w-32 items-center justify-center rounded-[30px] bg-[#ffedd2] text-[66px]">
                🏠
              </div>

              <h2 className="text-[34px] font-black text-slate-950">
                Gestão de locações simples, rápida e inteligente.
              </h2>

              <p className="mt-7 text-lg text-slate-600">
                Controle imóveis, inquilinos, contratos e receitas.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}