"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  Mail,
  Phone,
  Settings2,
  User,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function getSignupErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível criar a conta. Revise os dados e tente novamente.";
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function ExperimentSignupCard() {
  const router = useRouter();
  const { createAccount, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleCreateAccount() {
    const normalizedEmail = email.trim();
    const phoneDigits = phone.replace(/\D/g, "");

    if (!name.trim() || !companyName.trim() || !phoneDigits || !normalizedEmail || !password) {
      setErrorMessage("Preencha nome, empresa, telefone, e-mail e senha para começar.");
      return;
    }

    if (phoneDigits.length < 10) {
      setErrorMessage("Informe um telefone com DDD válido.");
      return;
    }

    if (!isEmailValid) {
      setErrorMessage("Por favor, insira um e-mail válido.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await createAccount({
        name: name.trim(),
        companyName: companyName.trim(),
        phone,
        email: normalizedEmail,
        password,
      });

      setShowWelcomeModal(true);
    } catch (error) {
      setErrorMessage(getSignupErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function continueToCompanySettings() {
    router.push("/configuracoes?onboarding=1");
  }

  return (
    <>
      <section
        id="experimente"
        className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.12)] lg:mt-16"
        aria-label="Experimente grátis"
      >
        <div className="mb-4">
          <p className="text-xs font-black uppercase text-[#ff4b00]">
            Experimente grátis
          </p>
          <h2 className="mt-2 text-xl font-black leading-tight text-slate-950">
            Crie sua conta e acesse o Contrx
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Cadastre sua empresa e comece pelo painel de configuração.
          </p>
        </div>

        <div className="grid gap-2.5">
          <SignupInput
            icon={<User size={18} />}
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={setName}
            autoComplete="name"
          />
          <SignupInput
            icon={<Building2 size={18} />}
            type="text"
            placeholder="Nome da empresa"
            value={companyName}
            onChange={setCompanyName}
            autoComplete="organization"
          />
          <SignupInput
            icon={<Phone size={18} />}
            type="tel"
            placeholder="Telefone"
            value={phone}
            onChange={(value) => setPhone(formatPhone(value))}
            autoComplete="tel"
          />
          <div className="flex flex-col gap-1">
            <SignupInput
              icon={<Mail size={18} />}
              type="email"
              placeholder="E-mail profissional"
              value={email}
              onChange={setEmail}
              autoComplete="username"
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
            />
            {(isEmailFocused || (email && !isEmailValid)) && (
              <p className="px-2 text-[11px] font-bold text-orange-600">
                Por favor, insira um e-mail válido (ex: nome@empresa.com)
              </p>
            )}
          </div>
          <SignupInput
            icon={<LockKeyhole size={18} />}
            type="password"
            placeholder="Senha"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            onEnter={handleCreateAccount}
          />
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreateAccount}
          disabled={isSubmitting || isLoading || showWelcomeModal}
          className="mt-4 flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff4b00] px-5 text-sm font-black text-white shadow-[0_16px_30px_rgba(255,75,0,0.22)] transition hover:bg-[#e94400] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <UserPlus size={18} />
          {isSubmitting ? "Criando conta..." : "Começar grátis"}
        </button>

        <p className="mt-4 text-center text-xs font-semibold leading-5 text-slate-500">
          Depois do cadastro, você será levado para configurar a empresa.
        </p>
      </section>

      {showWelcomeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >
          <div className="w-full max-w-md rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <h2
              id="welcome-title"
              className="mt-5 text-2xl font-black leading-tight text-slate-950"
            >
              Bem-vindo ao Contrx
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Sua conta foi criada com sucesso. Vamos começar pela tela de
              configurações da empresa para deixar seus dados, preferências e
              identidade comercial prontos para uso.
            </p>

            <div className="mt-5 grid gap-3">
              <WelcomeItem
                icon={<Settings2 className="h-5 w-5" />}
                title="Primeiro passo"
                description="Configurar os dados principais da empresa."
              />
              <WelcomeItem
                icon={<CalendarDays className="h-5 w-5" />}
                title="Acesso liberado"
                description="Seu teste profissional é válido por 30 dias."
              />
            </div>

            <button
              type="button"
              onClick={continueToCompanySettings}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff4b00] px-5 text-sm font-black text-white shadow-[0_16px_30px_rgba(255,75,0,0.22)] transition hover:bg-[#e94400]"
            >
              Ir para configurações
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

type WelcomeItemProps = {
  description: string;
  icon: ReactNode;
  title: string;
};

function WelcomeItem({ description, icon, title }: WelcomeItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 ring-1 ring-slate-200">
        {icon}
      </div>
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

type SignupInputProps = {
  icon: ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  onEnter?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

function SignupInput({
  icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  onEnter,
  onFocus,
  onBlur,
}: SignupInputProps) {
  return (
    <div className="flex h-11 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
      <div className="flex h-full w-12 shrink-0 items-center justify-center text-slate-500">
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
        onFocus={onFocus}
        onBlur={onBlur}
        className="h-full min-w-0 flex-1 bg-white pr-4 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
