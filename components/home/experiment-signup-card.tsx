"use client";

import { useState } from "react";
import { Building2, LockKeyhole, Mail, User, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function getSignupErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível criar a conta. Revise os dados e tente novamente.";
}

export default function ExperimentSignupCard() {
  const { createAccount, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateAccount() {
    const normalizedEmail = email.trim();

    if (!name.trim() || !companyName.trim() || !normalizedEmail || !password) {
      setErrorMessage("Preencha nome, empresa, e-mail e senha para começar.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("As senhas não conferem.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await createAccount({
        name: name.trim(),
        companyName: companyName.trim(),
        email: normalizedEmail,
        password,
      });
    } catch (error) {
      setErrorMessage(getSignupErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="experimente"
      className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_28px_70px_rgba(15,23,42,0.16)] sm:p-6"
      aria-label="Experimente grátis"
    >
      <div className="mb-5">
        <p className="text-xs font-black uppercase text-[#ff4b00]">
          Experimente grátis
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">
          Crie sua conta e acesse o Contrx
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Cadastre sua empresa e comece pelo painel de configuração.
        </p>
      </div>

      <div className="grid gap-3">
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
          icon={<Mail size={18} />}
          type="email"
          placeholder="E-mail profissional"
          value={email}
          onChange={setEmail}
          autoComplete="username"
        />
        <SignupInput
          icon={<LockKeyhole size={18} />}
          type="password"
          placeholder="Senha"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <SignupInput
          icon={<LockKeyhole size={18} />}
          type="password"
          placeholder="Confirmar senha"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
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
        disabled={isSubmitting || isLoading}
        className="mt-5 flex h-[52px] min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ff4b00] px-5 text-sm font-black text-white shadow-[0_18px_34px_rgba(255,75,0,0.24)] transition hover:bg-[#e94400] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <UserPlus size={18} />
        {isSubmitting ? "Criando conta..." : "Começar grátis"}
      </button>

      <p className="mt-4 text-center text-xs font-semibold leading-5 text-slate-500">
        Depois do cadastro, você será levado para configurar a empresa.
      </p>
    </section>
  );
}

type SignupInputProps = {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  onEnter?: () => void;
};

function SignupInput({
  icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  onEnter,
}: SignupInputProps) {
  return (
    <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
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
        className="h-full min-w-0 flex-1 bg-white pr-4 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
