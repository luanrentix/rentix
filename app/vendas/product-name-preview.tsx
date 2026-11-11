"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ProductPhoto from "./product-photo";

export default function ProductNamePreview({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  function show() {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(240, window.innerWidth - 24);
    const height = Math.min(300, window.innerHeight - 24);
    setPosition({
      width,
      left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.right + 12)),
      top: Math.max(12, Math.min(window.innerHeight - height - 12, rect.top)),
    });
  }
  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", key);
    };
  }, [position]);
  if (!photoUrl) return <span className="font-normal text-slate-900 dark:text-white">{name}</span>;
  return <>
    <button ref={trigger} type="button" aria-label={name + " — visualizar foto"} aria-describedby={position ? id : undefined}
      onMouseEnter={show} onMouseLeave={() => setPosition(null)} onFocus={show} onBlur={() => setPosition(null)} onClick={show}
      className="text-left font-normal text-slate-900 outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] dark:text-white">
      {name}
    </button>
    {position && createPortal(<div id={id} role="tooltip" style={position} className="pointer-events-none fixed z-[160] max-h-[calc(100dvh-24px)] overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="h-52 max-h-[55dvh] w-full [&>span]:h-full [&>span]:w-full"><ProductPhoto src={photoUrl} name={name} large /></div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</p>
    </div>, document.body)}
  </>;
}
