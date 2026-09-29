"use client";

import React from "react";
import {
  Building2,
  UserRound,
  MessageCircle,
  FileText,
  Edit2,
  Mail,
} from "lucide-react";
import type { Person } from "./person-types";
import { openWhatsAppMessage } from "./person-types";

interface PersonTableProps {
  people: Person[];
  isLoading: boolean;
  onOpenHistory: (person: Person) => void;
  onOpenEdit: (person: Person) => void;
}

export function PersonTable({
  people,
  isLoading,
  onOpenHistory,
  onOpenEdit,
}: PersonTableProps) {
  return (
    <div className="hidden lg:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
        <thead className="border-b border-slate-200 bg-orange-50/80 text-sm font-black text-slate-700">
          <tr>
            <th className="px-5 py-4 font-black">Pessoa / Contato</th>
            <th className="px-5 py-4 font-black">Telefone / WhatsApp</th>
            <th className="px-5 py-4 font-black">Documento (CPF/CNPJ)</th>
            <th className="px-5 py-4 font-black">Classificação</th>
            <th className="px-5 py-4 font-black">Situação</th>
            <th className="px-5 py-4 text-right font-black">Ações</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          {isLoading && (
            <>
              {[1, 2, 3, 4, 5].map((item) => (
                <tr key={item} className="border-b border-slate-200">
                  <td className="px-5 py-4">
                    <div className="h-4 w-48 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-2 h-3 w-32 animate-pulse rounded-full bg-slate-100" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-32 animate-pulse rounded-full bg-slate-100" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="ml-auto h-8 w-28 animate-pulse rounded-xl bg-slate-100" />
                  </td>
                </tr>
              ))}
            </>
          )}

          {!isLoading &&
            people.map((person) => {
              const isCompany = person.type === "company";
              const isActive = person.status === "active";
              const hasPhone = Boolean(person.phone && person.phone.trim());

              return (
                <tr
                  key={person.id}
                  className={`border-b border-slate-200 transition duration-150 hover:bg-orange-50/25 ${
                    !isActive ? "bg-slate-50/60 opacity-80" : ""
                  }`}
                >
                  {/* Nome da Pessoa com Destaque Hover Negrito Pesado (900) e Laranja */}
                  <td className="px-5 py-4">
                    <div
                      className="person-name-container group group/person flex flex-col cursor-pointer"
                      onClick={() => onOpenHistory(person)}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenHistory(person);
                        }}
                        className="person-name-btn block max-w-[340px] truncate text-left text-sm uppercase tracking-tight font-semibold text-slate-800 dark:text-slate-100 hover:font-black hover:text-orange-600 hover:underline group-hover:font-black group-hover:text-orange-600 group-hover:underline cursor-pointer transition-all duration-150"
                        title="Clique para ver o histórico e ficha cadastral completa"
                      >
                        {person.name}
                      </button>

                      {person.email ? (
                        <a
                          href={`mailto:${person.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-orange-600 transition"
                          title="Enviar e-mail"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[280px]">{person.email}</span>
                        </a>
                      ) : (
                        <span className="mt-0.5 text-xs font-medium text-slate-400">
                          Sem e-mail cadastrado
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Telefone com Botão de WhatsApp Direto */}
                  <td className="px-5 py-4">
                    {hasPhone ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm whitespace-nowrap">
                          {person.phone}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openWhatsAppMessage(
                              person.phone,
                              `Olá ${person.name}, tudo bem? Entramos em contato a respeito da sua locação/cadastro no sistema Contrx.`
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition hover:bg-emerald-500 hover:text-white hover:scale-105 active:scale-95 shadow-sm"
                          title="Iniciar conversa no WhatsApp"
                          aria-label="Iniciar conversa no WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Não informado
                      </span>
                    )}
                  </td>

                  {/* Documento (CPF / CNPJ) */}
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800 text-sm">
                      {person.document || "-"}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-400">
                      {isCompany
                        ? person.stateRegistration
                          ? `IE: ${person.stateRegistration}`
                          : "IE não informada"
                        : person.identityNumber
                          ? `RG: ${person.identityNumber}`
                          : "RG não informado"}
                    </div>
                  </td>

                  {/* Tipo e Uso / Perfil */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${
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
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          person.isTenant
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {person.isTenant ? "Inquilino" : "Não inquilino"}
                      </span>
                    </div>
                  </td>

                  {/* Situação (Ativo / Inativo) */}
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
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
                  </td>

                  {/* Ações Rápidas */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenHistory(person)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
                        title="Ver histórico e ficha completa"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Histórico
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenEdit(person)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
                        title="Editar cadastro"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

          {!isLoading && people.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <UserRound className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-base font-black text-slate-800">
                  Nenhuma pessoa encontrada
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Ajuste os filtros de busca ou cadastre uma nova pessoa.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
