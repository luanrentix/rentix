"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageOff, X } from "lucide-react";
import { getMediaUrl } from "@/services/api";

export default function ProductPhoto({
  src,
  name,
  large = false,
  preview = false,
}: {
  src?: string | null;
  name: string;
  large?: boolean;
  preview?: boolean;
}) {
  const [failedSource, setFailedSource] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const url = src ? getMediaUrl(src) : "";
  if (!url) return null;
  const photo = (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 ${large ? "h-24 w-24" : "h-12 w-12"}`}
    >
      {failedSource === url ? (
        <ImageOff
          aria-label="Imagem indisponível"
          size={20}
          className="text-slate-400"
        />
      ) : (
        <Image
          unoptimized
          src={url}
          alt={`Foto de ${name}`}
          width={large ? 96 : 48}
          height={large ? 96 : 48}
          className="h-full w-full object-contain"
          onError={() => setFailedSource(url)}
        />
      )}
    </span>
  );
  if (!preview) return photo;
  return <>
    <button type="button" aria-label={`Ampliar foto de ${name}`} onClick={() => dialogRef.current?.showModal()} className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] [&>span]:h-9 [&>span]:w-9 [&>span]:rounded-lg">
      {photo}
    </button>
    <dialog ref={dialogRef} aria-label={`Foto de ${name}`} onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) dialogRef.current?.close(); }} className="fixed inset-0 m-auto w-[min(92vw,36rem)] max-w-none rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
        <button type="button" aria-label="Fechar foto" onClick={() => dialogRef.current?.close()} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
      </div>
      <div className="h-[min(65dvh,32rem)] [&>span]:h-full [&>span]:w-full"><ProductPhoto src={src} name={name} large /></div>
    </dialog>
  </>;
}
