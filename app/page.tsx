"use client";

import Image from "next/image";
import {
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  Home,
  LockKeyhole,
  LogIn,
  Mail,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const { login, createAccount, isLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupCompanyName, setSignupCompanyName] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");

  const [authError, setAuthError] = useState(false);
  const [authErrorTitle, setAuthErrorTitle] = useState("Acesso não autorizado");
  const [authErrorMessage, setAuthErrorMessage] = useState(
    "E-mail ou senha inválidos.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rentix_remember_email");

    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  function showAuthError(title: string, message: string) {
    setAuthErrorTitle(title);
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
        localStorage.setItem("rentix_remember_email", email.trim());
      } else {
        localStorage.removeItem("rentix_remember_email");
      }
    } catch (error) {
      showAuthError(
        "Acesso não autorizado",
        error instanceof Error ? error.message : "E-mail ou senha inválidos.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateAccount() {
    const normalizedEmail = email.trim();

    if (!signupName.trim() || !normalizedEmail || !password || !signupCompanyName.trim()) {
      showAuthError(
        "Cadastro incompleto",
        "Preencha nome, e-mail, senha e nome da empresa.",
      );
      return;
    }

    if (password.length < 8) {
      showAuthError(
        "Senha muito curta",
        "Use uma senha com pelo menos 8 caracteres.",
      );
      return;
    }

    if (password !== signupPasswordConfirm) {
      showAuthError("Senhas diferentes", "Confirme a senha digitada.");
      return;
    }

    try {
      setIsSubmitting(true);
      setAuthError(false);

      await createAccount({
        name: signupName.trim(),
        email: normalizedEmail,
        password,
        companyName: signupCompanyName.trim(),
      });
    } catch (error) {
      showAuthError(
        "Não foi possível criar a conta",
        error instanceof Error
          ? error.message
          : "Revise os dados informados e tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit() {
    if (mode === "login") {
      void handleLogin();
      return;
    }

    void handleCreateAccount();
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setAuthError(false);
    setPassword("");
    setSignupPasswordConfirm("");
  }

  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[42%_58%]">
        <section className="relative flex min-h-screen flex-col bg-gradient-to-br from-[#ff4b00] via-[#f04400] to-[#d93200] px-6 pt-8 sm:px-9 lg:min-h-screen">
          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[22px] bg-white shadow-lg sm:h-32 sm:w-32">
              <Image
                src="/logo-rentix.png"
                alt="Rentix"
                width={82}
                height={82}
                priority
              />
            </div>

            <div>
              <h1 className="text-[42px] font-black leading-none text-white sm:text-[48px]">
                Rentix
              </h1>
              <p className="mt-2 text-sm font-bold text-white">
                Sistema de Gestão de Locações
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex justify-center pb-8">
            <div className="w-full max-w-[525px] rounded-[30px] bg-white px-6 py-8 shadow-2xl sm:px-10 sm:py-10">
              <h2 className="text-center text-[30px] font-light leading-tight text-slate-950">
                {isSignup ? "Crie sua conta" : "Bem-vindo ao"}{" "}
                <span className="font-black text-[#ff4b00]">
                  {isSignup ? "Rentix" : "Rentix!"}
                </span>
              </h2>

              <div className="mt-7 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                    mode === "login"
                      ? "bg-white text-[#ff4b00] shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <LogIn size={17} />
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                    mode === "signup"
                      ? "bg-white text-[#ff4b00] shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <UserPlus size={17} />
                  Criar conta
                </button>
              </div>

              <div className="mt-7 space-y-4">
                {isSignup && (
                  <>
                    <AuthInput
                      icon={<User size={20} />}
                      type="text"
                      placeholder="Seu nome"
                      value={signupName}
                      onChange={setSignupName}
                    />
                    <AuthInput
                      icon={<Building2 size={20} />}
                      type="text"
                      placeholder="Nome da empresa"
                      value={signupCompanyName}
                      onChange={setSignupCompanyName}
                    />
                  </>
                )}

                <AuthInput
                  icon={<Mail size={20} />}
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={setEmail}
                />

                <div className="flex h-[58px] items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.10)]">
                  <div className="flex h-full w-[58px] items-center justify-center text-slate-600">
                    <LockKeyhole size={20} />
                  </div>

                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSubmit();
                    }}
                    className="h-full min-w-0 flex-1 bg-white px-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
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

                {isSignup && (
                  <AuthInput
                    icon={<LockKeyhole size={20} />}
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirmar senha"
                    value={signupPasswordConfirm}
                    onChange={setSignupPasswordConfirm}
                    onEnter={handleSubmit}
                  />
                )}

                {!isSignup && (
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
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading}
                  className="flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ff4b00] text-base font-black text-white shadow-[0_14px_30px_rgba(255,75,0,0.28)] transition hover:bg-[#e94400] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSignup ? <UserPlus size={19} /> : <LogIn size={19} />}
                  {isSubmitting
                    ? isSignup
                      ? "Criando..."
                      : "Entrando..."
                    : isSignup
                      ? "Criar conta"
                      : "Entrar"}
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
                className="mt-6 w-full text-center text-sm font-black text-[#ff4b00]"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </div>

          <p className="relative z-10 mt-auto pb-8 text-center text-base font-black text-white">
            Rentix © 2026
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
                      Revise os dados para continuar.
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
};

function AuthInput({
  icon,
  type,
  placeholder,
  value,
  onChange,
  onEnter,
}: AuthInputProps) {
  return (
    <div className="flex h-[58px] items-center rounded-2xl border border-slate-200 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.10)]">
      <div className="flex h-full w-[58px] items-center justify-center text-slate-600">
        {icon}
      </div>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEnter?.();
        }}
        className="h-full min-w-0 flex-1 rounded-r-2xl bg-white px-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
