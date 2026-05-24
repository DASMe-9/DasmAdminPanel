import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import { usePlatformHealth, type HealthStatus } from "@/hooks/usePlatformHealth";

const STATUS_DOT: Record<HealthStatus, string> = {
  online: "bg-emerald-500",
  degraded: "bg-amber-400",
  offline: "bg-red-500",
  checking: "bg-slate-300 animate-pulse dark:bg-slate-600",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  online: "متصل",
  degraded: "بطيء",
  offline: "متوقف",
  checking: "فحص…",
};

interface PlatformPulseBarProps {
  showCommandLink?: boolean;
}

export default function PlatformPulseBar({ showCommandLink = true }: PlatformPulseBarProps) {
  const { health, loading, refresh, onlineCount } = usePlatformHealth();

  return (
    <section className="cr-pulse-bar">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <p className="cr-section-title">نبض المنظومة</p>
          <p className="cr-section-sub mt-0.5">
            {health.length > 0
              ? `${onlineCount} من ${health.length} منصات متصلة`
              : "جاري فحص حالة المنصات…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showCommandLink ? (
            <Link
              href="/admin/control-room/command-center"
              className="text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
            >
              مركز القيادة ←
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PLATFORMS.filter((p) => p.id !== "control").map((p) => {
          const h = health.find((x) => x.id === p.id);
          const status = h?.status ?? "checking";
          return (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 hover:bg-white hover:border-slate-200 transition dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              <span className="text-lg leading-none">{p.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate dark:text-slate-100">
                  {p.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {STATUS_LABEL[status]}
                  {h?.latency ? ` · ${h.latency}ms` : ""}
                </p>
              </div>
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[status]}`}
                aria-hidden
              />
            </a>
          );
        })}
      </div>
    </section>
  );
}

export { usePlatformHealth };
