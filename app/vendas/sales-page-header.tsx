import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export default function SalesPageHeader({
  title,
  description,
  icon: Icon,
  children,
  compact = false,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <header className={`flex shrink-0 gap-3 sm:flex-row sm:items-center sm:justify-between ${compact ? "flex-row items-center justify-between" : "flex-col"}`}>
      <div>
        <div className="flex items-center gap-2.5">
          <span className={`flex shrink-0 items-center justify-center bg-[var(--primary-bg-light)] text-[var(--primary-color)] ${compact ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-2xl"}`}>
            <Icon className="h-5 w-5" />
          </span>
          <h1 className={`font-black tracking-tight text-slate-900 dark:text-white ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>
            {title}
          </h1>
        </div>
        {description && <p className={`${compact ? "mt-0.5 hidden sm:block" : "mt-1"} text-xs font-semibold text-slate-500 dark:text-slate-400`}>
          {description}
        </p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </header>
  );
}
