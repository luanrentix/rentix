"use client";

export default function ToggleSwitch({ label, checked, onChange, disabled = false }: {
  label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  return <label className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
    <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} className="peer sr-only" />
    <span aria-hidden="true" className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[var(--primary-color)] peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary-color)] peer-focus-visible:ring-offset-2 dark:bg-slate-700" />
    {label}
  </label>;
}
