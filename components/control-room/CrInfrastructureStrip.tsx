import { useCallback, useEffect, useState } from "react";
import { Database, HardDrive, Radio, RefreshCw, Server } from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import CrStatusPill from "./CrStatusPill";

type InfraSummary = {
  database?: { ok?: boolean; latency_ms?: number };
  cache?: { ok?: boolean; latency_ms?: number };
  redis?: { ok?: boolean | null; latency_ms?: number | null };
  api_health?: { ok?: boolean };
};

function pillTone(ok: boolean | null | undefined): "ok" | "warning" | "muted" {
  if (ok === true) return "ok";
  if (ok === false) return "warning";
  return "muted";
}

export default function CrInfrastructureStrip() {
  const [data, setData] = useState<InfraSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dasmBff.get("admin/monitoring/summary");
      const root = res.data?.data ?? res.data ?? {};
      setData({
        database: root.database ?? root.db,
        cache: root.cache,
        redis: root.redis,
        api_health: root.api_health ?? root.endpoints?.[0],
      });
    } catch {
      setError("تعذر قراءة ملخص البنية التحتية");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="cr-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <p className="cr-section-title">صحة البنية التحتية (DASM Core)</p>
          <p className="cr-section-sub">قاعدة البيانات · الكاش · Redis · API</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>
      {error ? (
        <p className="cr-alert-warning">{error}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <CrStatusPill tone={pillTone(data?.database?.ok)}>
            <Database className="h-4 w-4" />
            DB {data?.database?.ok ? "سليم" : data?.database?.ok === false ? "تعطل" : "…"}
            {data?.database?.latency_ms != null ? ` · ${data.database.latency_ms}ms` : ""}
          </CrStatusPill>
          <CrStatusPill tone={pillTone(data?.cache?.ok)}>
            <HardDrive className="h-4 w-4" />
            Cache {data?.cache?.ok ? "سليم" : data?.cache?.ok === false ? "تعطل" : "…"}
          </CrStatusPill>
          <CrStatusPill tone={pillTone(data?.redis?.ok ?? null)}>
            <Server className="h-4 w-4" />
            Redis{" "}
            {data?.redis?.ok === true
              ? "سليم"
              : data?.redis?.ok === false
              ? "تعطل"
              : "غ/م"}
          </CrStatusPill>
          <CrStatusPill tone={pillTone(data?.api_health?.ok ?? true)}>
            <Radio className="h-4 w-4" />
            API Core
          </CrStatusPill>
        </div>
      )}
    </section>
  );
}
