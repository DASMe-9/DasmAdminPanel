import type { ElementType } from "react";

export type CrKpiTone = "emerald" | "sky" | "amber" | "red" | "blue" | "purple" | "indigo";

const TONE_CLASSES: Record<CrKpiTone, string> = {
  emerald:
    "text-emerald-700 bg-emerald-100 ring-emerald-200/60 dark:text-emerald-200 dark:bg-emerald-500/15 dark:ring-emerald-500/20",
  sky: "text-sky-700 bg-sky-100 ring-sky-200/60 dark:text-sky-200 dark:bg-sky-500/15 dark:ring-sky-500/20",
  amber:
    "text-amber-700 bg-amber-100 ring-amber-200/60 dark:text-amber-200 dark:bg-amber-500/15 dark:ring-amber-500/20",
  red: "text-red-700 bg-red-100 ring-red-200/60 dark:text-red-200 dark:bg-red-500/15 dark:ring-red-500/20",
  blue: "text-blue-700 bg-blue-100 ring-blue-200/60 dark:text-blue-200 dark:bg-blue-500/15 dark:ring-blue-500/20",
  purple:
    "text-purple-700 bg-purple-100 ring-purple-200/60 dark:text-purple-200 dark:bg-purple-500/15 dark:ring-purple-500/20",
  indigo:
    "text-indigo-700 bg-indigo-100 ring-indigo-200/60 dark:text-indigo-200 dark:bg-indigo-500/15 dark:ring-indigo-500/20",
};

interface CrKpiCardProps {
  title: string;
  value: string | number;
  helper?: string;
  icon: ElementType;
  tone?: CrKpiTone;
  loading?: boolean;
}

export default function CrKpiCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "blue",
  loading = false,
}: CrKpiCardProps) {
  return (
    <section className="cr-stat-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="cr-stat-label">{title}</p>
          <p className={`cr-stat-value mt-2 ${loading ? "animate-pulse opacity-70" : ""}`}>
            {value}
          </p>
          {helper ? (
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              {helper}
            </p>
          ) : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${TONE_CLASSES[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </section>
  );
}
