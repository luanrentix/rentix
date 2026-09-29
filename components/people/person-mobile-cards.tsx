"use client";

import React from "react";
import {
  Building2,
  UserRound,
  MessageCircle,
  FileText,
  Edit2,
  Mail,
  Phone,
} from "lucide-react";
import type { Person } from "./person-types";
import { openWhatsAppMessage } from "./person-types";

interface PersonMobileCardsProps {
  people: Person[];
  isLoading: boolean;
  onOpenHistory: (person: Person) => void;
  onOpenEdit: (person: Person) => void;
}

export function PersonMobileCards({
  people,
  isLoading,
  onOpenHistory,
  onOpenEdit,
}: PersonMobileCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 lg:hidden">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="h-4 w-40 bg-slate-100 rounded-full" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3 w-28 bg-slate-100 rounded-full" />
            <div className="h-8 w-full bg-slate-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center lg:hidden">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          <UserRound className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-black text-slate-800">
          Nenhuma pessoa encontrada
        </h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Ajuste os filtros ou cadastre uma nova pessoa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 lg:hidden">
      {people.map((person) => {
        const isCompany = person.type === "company";
        const isActive = person.status === "active";
        const hasPhone = Boolean(person.phone && person.phone.trim());

        return (
          <div
            key={person.id}
            className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 transition ${
              !isActive ? "bg-slate-50/60 opacity-80" : ""
            }`}
          >
            {/* Linha Superior: Nome e Status */}
            <div className="flex items-start justify-between gap-2">
              <div
                className="person-name-container group group/person cursor-pointer flex-1 min-w-0"
                onClick={() => onOpenHistory(person)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenHistory(person);
                  }}
                  className="person-name-btn block w-full truncate text-left text-sm uppercase font-semibold text-slate-800 dark:text-slate-100 hover:font-black hover:text-orange-600 hover:underline group-hover:font-black group-hover:text-orange-600 group-hover:underline cursor-pointer"
                  title="Ver histórico da pessoa"
                >
                  {person.name}
                </button>

                <div className="mt-0.5 text-xs font-semibold text-slate-400">
                  {person.document || "Sem documento"}
                </div>
              </div>

              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-emerald-600" : "bg-slate-400"
                  }`}
                />
                {isActive ? "Ativo" : "Inativo"}
              </span>
            </div>

            {/* Badges de Tipo e Perfil */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${
                  isCompany
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {isCompany ? (
                  <Building2 className="h-3 w-3" />
                ) : (
                  <UserRound className="h-3 w-3" />
                )}
                {isCompany ? "Pessoa Jurídica" : "Pessoa Física"}
              </span>

              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  person.isTenant
                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {person.isTenant ? "Inquilino" : "Não inquilino"}
              </span>

              {person.city && (
                <span className="text-[11px] font-semibold text-slate-400">
                  • {person.city} {person.state ? `/${person.state}` : ""}
                </span>
              )}
            </div>

            {/* Contato: Telefone, WhatsApp e E-mail */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <div className="flex items-center gap-2">
                {hasPhone ? (
                  <>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {person.phone}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        openWhatsAppMessage(
                          person.phone,
                          `Olá ${person.name}, tudo bem? Entramos em contato pelo sistema Contrx.`
                        )
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition"
                      title="Abrir WhatsApp"
                      aria-label="Abrir WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-medium text-slate-400">
                    Sem telefone
                  </span>
                )}
              </div>

              {person.email && (
                <a
                  href={`mailto:${person.email}`}
                  className="text-xs font-semibold text-slate-500 hover:text-orange-600 flex items-center gap-1 truncate max-w-[180px]"
                >
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{person.email}</span>
                </a>
              )}
            </div>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
              <button
                type="button"
                onClick={() => onOpenHistory(person)}
                className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 py-2 text-xs font-black text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition"
              >
                <FileText className="h-3.5 w-3.5" />
                Histórico
              </button>

              <button
                type="button"
                onClick={() => onOpenEdit(person)}
                className="flex items-center justify-center gap-1 rounded-xl bg-orange-500 py-2 text-xs font-black text-white hover:bg-orange-600 transition shadow-sm shadow-orange-500/20"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Editar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
