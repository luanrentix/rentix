"use client";

import Image from "next/image";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Home,
  LockKeyhole,
  LogIn,
  Mail,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

function getAuthErrorPresentation(
  error: unknown,
  defaultTitle: string,
  defaultMessage: string,
) {
  const message = error instanceof Error ? error.message : defaultMessage;
  const normalizedMessage = message.toLowerCase();
  const isInvalidCredentialsError =
    normalizedMessage.includes("invalid credentials") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("e-mail ou senha");
  const isBackendConfigurationError =
    message.includes("NEXT_PUBLIC_API_URL") ||
    normalizedMessage.includes("backend não configurado") ||
    normalizedMessage.includes("backend nao configurado") ||
    normalizedMessage.includes("api em");
  const isDatabaseConfigurationError =
    normalizedMessage.includes("credenciais do banco") ||
    normalizedMessage.includes("database_url") ||
    normalizedMessage.includes("direct_url") ||
    normalizedMessage.includes("banco de dados indisponivel");

  if (isBackendConfigurationError) {
    return {
      title: "Backend não configurado",
      message,
      subtitle: "Configure a API para continuar.",
    };
  }

  if (isDatabaseConfigurationError) {
    return {
      title: "Banco não conectado",
      message,
      subtitle: "Corrija a conexão do backend.",
    };
  }

  if (isInvalidCredentialsError) {
    return {
      title: defaultTitle,
      message: defaultMessage,
      subtitle: "Revise os dados para continuar.",
    };
  }

  return {
    title: defaultTitle,
    message,
    subtitle: "Revise os dados para continuar.",
  };
}

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [authErrorTitle, setAuthErrorTitle] = useState("Acesso não autorizado");
  const [authErrorSubtitle, setAuthErrorSubtitle] = useState(
    "Revise os dados para continuar.",
  );
  const [authErrorMessage, setAuthErrorMessage] = useState(
    "E-mail ou senha inválidos.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const legacyStoragePrefix = ["ren", "tix"].join("");
    const savedEmail =
      localStorage.getItem("contrx_remember_email") ||
      localStorage.getItem(`${legacyStoragePrefix}_remember_email`);
    const authNotice = localStorage.getItem("contrx_auth_notice");

    if (savedEmail) {
      localStorage.setItem("contrx_remember_email", savedEmail);
      setEmail(savedEmail);
      setRemember(true);
    }

    if (authNotice) {
      localStorage.removeItem("contrx_auth_notice");
      showAuthError("Sessão encerrada", authNotice, "Acesse novamente para continuar.");
    }
  }, []);

  function showAuthError(title: string, message: string, subtitle?: string) {
    setAuthErrorTitle(title);
    setAuthErrorSubtitle(subtitle || "Revise os dados para continuar.");
    setAuthErrorMessage(message);
    setAuthError(true);
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      showAuthError("Dados incompletos", "Informe e-mail e senha para entrar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setAuthError(false);

      await login(email.trim(), password);

      if (remember) {
        localStorage.setItem("contrx_remember_email", email.trim());
      } else {
        localStorage.removeItem("contrx_remember_email");
        localStorage.removeItem(`${["ren", "tix"].join("")}_remember_email`);
      }
    } catch (error) {
      const authErrorPresentation = getAuthErrorPresentation(
        error,
        "Acesso não autorizado",
        "E-mail ou senha inválidos.",
      );

      showAuthError(
        authErrorPresentation.title,
        authErrorPresentation.message,
        authErrorPresentation.subtitle,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-white">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[42%_58%]">
        <section className="relative flex min-h-dvh flex-col items-center bg-gradient-to-br from-[#ff4b00] via-[#f04400] to-[#d93200] px-4 pt-6 sm:px-9 sm:pt-8 lg:min-h-screen">
          <div className="relative z-10 flex w-full max-w-[525px] justify-center">
            <div className="flex h-20 w-full max-w-[325px] shrink-0 items-center justify-center rounded-[18px] bg-white px-5 shadow-lg sm:h-28 sm:max-w-[430px] sm:rounded-[22px] sm:px-8">
              <Image
                src="/logo-contrx.png"
                alt="Contrx"
                width={1536}
                height={1024}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </div>

          <div className="relative z-10 mt-5 flex w-full max-w-[525px] justify-center pb-6 sm:mt-6 sm:pb-8">
            <div className="w-full max-w-[525px] rounded-[24px] bg-white px-4 py-6 shadow-2xl sm:rounded-[30px] sm:px-10 sm:py-10">
              <h1 className="text-center text-2xl font-light leading-tight text-slate-950 sm:text-[30px]">
                Bem-vindo ao{" "}
                <span className="font-black text-[#ff4b00]">Contrx!</span>
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-center text-sm font-semibold leading-6 text-slate-500">
                Acesse sua conta para continuar gerenciando imóveis, contratos
                e financeiro.
              </p>

              <div className="mt-5 space-y-3 sm:mt-7 sm:space-y-4">
                <AuthInput
                  icon={<Mail size={20} />}
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={setEmail}
                  autoComplete="username"
                  onEnter={handleLogin}
                />

                <div className="flex h-[54px] items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.10)] sm:h-[58px]">
                  <div className="flex h-full w-[58px] items-center justify-center text-slate-600">
                    <LockKeyhole size={20} />
                  </div>

                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleLogin();
                    }}
                    className="contrx-auth-input h-full min-w-0 flex-1 bg-white px-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex h-full w-[58px] items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <label className="flex w-fit items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 accent-[#ff4b00]"
                  />
                  <span className="text-sm font-bold text-slate-600">
                    Lembrar e-mail
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isSubmitting || isLoading}
                  className="flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ff4b00] text-base font-black text-white shadow-[0_14px_30px_rgba(255,75,0,0.28)] transition hover:bg-[#e94400] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <LogIn size={19} />
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  showAuthError(
                    "Recuperação de senha",
                    "A recuperação de senha será configurada na próxima etapa.",
                  )
                }
                className="mt-5 w-full text-center text-sm font-black text-[#ff4b00] sm:mt-6"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </div>

          <p className="relative z-10 mt-auto pb-5 text-center text-sm font-black text-white sm:pb-8 sm:text-base">
            Contrx © 2026
          </p>
        </section>

        <section className="hidden min-h-screen items-center justify-center bg-white px-10 lg:flex">
          <div className="w-full max-w-[705px] rounded-[32px] bg-[#fff6ec] p-10">
            <div className="rounded-[30px] border border-slate-100 bg-white px-8 pb-8 pt-0 text-center shadow-sm">
              <div className="mx-auto -mt-2 mb-9 flex h-32 w-32 items-center justify-center rounded-[30px] bg-[#ffedd2] text-[#ff4b00]">
                <Home size={70} strokeWidth={2.4} />
              </div>

              <h2 className="mx-auto max-w-[650px] text-[34px] font-black leading-tight text-slate-950">
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

      {authError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
          <div className="w-full max-w-[460px] overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-red-100">
            <div className="bg-gradient-to-r from-red-50 via-white to-orange-50 px-7 py-6">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/25">
                    <AlertTriangle size={26} />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      {authErrorTitle}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {authErrorSubtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAuthError(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Fechar aviso"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-7 pb-7 pt-5">
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm font-bold text-red-700">
                  {authErrorMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAuthError(false)}
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

type AuthInputProps = {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  autoComplete?: string;
};

function AuthInput({
  icon,
  type,
  placeholder,
  value,
  onChange,
  onEnter,
  autoComplete,
}: AuthInputProps) {
  return (
    <div className="flex h-[54px] items-center rounded-2xl border border-slate-200 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.10)] sm:h-[58px]">
      <div className="flex h-full w-[58px] items-center justify-center text-slate-600">
        {icon}
      </div>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEnter?.();
        }}
        className="contrx-auth-input h-full min-w-0 flex-1 rounded-r-2xl bg-white px-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
