"use client";

import React, { useState, useEffect } from "react";
import {
  DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME,
  DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME,
} from "./contract-types";
import { X, Clock } from "lucide-react";

interface ContractTimeDefaultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  onSave: (checkIn: string, checkOut: string) => void;
}

export function ContractTimeDefaultsModal({
  isOpen,
  onClose,
  defaultCheckInTime,
  defaultCheckOutTime,
  onSave,
}: ContractTimeDefaultsModalProps) {
  const [checkIn, setCheckIn] = useState(defaultCheckInTime || DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME);
  const [checkOut, setCheckOut] = useState(defaultCheckOutTime || DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME);

  useEffect(() => {
    if (isOpen) {
      setCheckIn(defaultCheckInTime || DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME);
      setCheckOut(defaultCheckOutTime || DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME);
    }
  }, [isOpen, defaultCheckInTime, defaultCheckOutTime]);

  if (!isOpen) return null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onSave(checkIn, checkOut);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Horários Padrão de Temporada
              </h3>
              <p className="text-[11px] text-slate-500">
                Pré-definidos para novos contratos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Entrada (Check-in) Padrão
            </label>
            <input
              type="time"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Saída (Check-out) Padrão
            </label>
            <input
              type="time"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-orange-600 px-5 py-2 text-xs font-black text-white hover:bg-orange-700 transition"
            >
              Salvar Padrão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
