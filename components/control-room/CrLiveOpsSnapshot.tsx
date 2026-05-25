import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Gavel, Radio, ShieldAlert, RefreshCw } from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import CrKpiCard from "./CrKpiCard";

type Snapshot = {
  activeAuctions: number;
  bidEventsToday: number;
  suspicious: number;
  activeSessions: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("ar-SA").format(n);
}

export default function CrLiveOpsSnapshot() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const settled = await Promise.allSettled([
        dasmBff.get("admin/auctions/stats"),
        dasmBff.get("admin/bids/events/stats", { params: { date_from: today, date_to: today } }),
        dasmBff.get("admin/sessions/stats"),
      ]);

      const auctions =
        settled[0].status === "fulfilled"
          ? (settled[0].value.data?.data ?? settled[0].value.data)
          : null;
      const bids =
        settled[1].status === "fulfilled"
          ? (settled[1].value.data?.data ?? settled[1].value.data)
          : null;
      const sessions =
        settled[2].status === "fulfilled"
          ? (settled[2].value.data?.data ?? settled[2].value.data)
          : null;

      const byType = (bids?.by_event_type ?? {}) as Record<string, number>;
      const todayEvents = Object.values(byType).reduce((s, v) => s + Number(v || 0), 0);
      const susp = bids?.suspicious ?? {};
      const suspicious =
        (susp.abnormal_rejection_rate?.is_abnormal ? 1 : 0) +
        (Array.isArray(susp.repeated_rejections) ? susp.repeated_rejections.length : 0) +
        (Array.isArray(susp.high_frequency_bidders) ? susp.high_frequency_bidders.length : 0) +
        (Array.isArray(susp.rapid_auto_bid_loops) ? susp.rapid_auto_bid_loops.length : 0);

      setData({
        activeAuctions: Number(auctions?.active ?? 0),
        bidEventsToday: todayEvents,
        suspicious,
        activeSessions: Number(sessions?.active ?? 0),
      });
    } catch {
      setError("تعذر قراءة لقطة العمليات الحية");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="cr-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="cr-section-title">لقطة العمليات الحية</p>
          <p className="cr-section-sub">مزادات · مزايدات · جلسات — من DASM Core</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <Link
            href="/admin/control-room/monitoring"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Radio className="h-4 w-4" />
            غرفة العمليات الكاملة
          </Link>
        </div>
      </div>

      {error ? <p className="cr-alert-warning text-sm">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CrKpiCard
          title="مزادات نشطة"
          value={loading ? "—" : fmt(data?.activeAuctions ?? 0)}
          icon={Gavel}
          tone="emerald"
          loading={loading}
        />
        <CrKpiCard
          title="أحداث مزايدات اليوم"
          value={loading ? "—" : fmt(data?.bidEventsToday ?? 0)}
          icon={Radio}
          tone="sky"
          loading={loading}
        />
        <CrKpiCard
          title="جلسات نشطة"
          value={loading ? "—" : fmt(data?.activeSessions ?? 0)}
          icon={Radio}
          tone="amber"
          loading={loading}
        />
        <CrKpiCard
          title="مؤشرات اشتباه"
          value={loading ? "—" : fmt(data?.suspicious ?? 0)}
          icon={ShieldAlert}
          tone={(data?.suspicious ?? 0) > 0 ? "red" : "emerald"}
          loading={loading}
        />
      </div>
    </section>
  );
}
