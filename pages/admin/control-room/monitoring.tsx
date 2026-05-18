import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Car,
  Circle,
  Clock3,
  ExternalLink,
  Gavel,
  Gauge,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Signal,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";

type AuctionStats = {
  active?: number;
  failed?: number;
  cancelled?: number;
  scheduled?: number;
};

type CarStats = {
  in_auction?: number;
};

type BidStats = {
  by_event_type?: Record<string, number>;
  suspicious?: {
    abnormal_rejection_rate?: {
      is_abnormal?: boolean;
      rate_pct?: number;
      threshold_pct?: number;
    };
    repeated_rejections?: Array<{ bidder_id: number; rejected_count: number }>;
    high_frequency_bidders?: Array<{ bidder_id: number; events_count: number }>;
    rapid_auto_bid_loops?: Array<{ auction_id: number; loop_count: number }>;
  };
};

type BidEvent = {
  id: number;
  event_type: string;
  server_ts_utc: string;
  reason_code?: string | null;
  auction_id?: number | null;
  bid_amount?: number | null;
  bidder_code?: string | null;
};

type SessionStats = {
  active?: number;
  upcoming?: number;
};

type SessionRow = {
  id: number;
  name: string;
  session_date: string;
  status: string;
  type: string;
};

type OperationsData = {
  auctions: AuctionStats | null;
  cars: CarStats | null;
  bids: BidStats | null;
  recentEvents: BidEvent[];
  sessions: SessionStats | null;
  activeScheduledSessions: SessionRow[];
};

const EVENT_LABELS: Record<string, string> = {
  bid_placed: "مزايدة جديدة",
  bid_rejected: "مزايدة مرفوضة",
  autobid_fired: "مزايدة تلقائية",
  auction_started: "بدء مزاد",
  auction_ended: "انتهاء مزاد",
};

const emptyData: OperationsData = {
  auctions: null,
  cars: null,
  bids: null,
  recentEvents: [],
  sessions: null,
  activeScheduledSessions: [],
};

const DASM_BASE = "https://www.dasm.com.sa";

function unwrapData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (!data || typeof data !== "object") return null;
  return data as T;
}

function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "0";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("ar-SA").format(numeric);
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
  return `${formatNumber(value)} ر.س`;
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function eventLabel(eventType: string) {
  return EVENT_LABELS[eventType] ?? eventType.replaceAll("_", " ");
}

function eventTone(eventType: string) {
  if (eventType.includes("reject") || eventType.includes("fail")) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (eventType.includes("auto")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (eventType.includes("placed")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: React.ElementType;
  tone: "emerald" | "sky" | "amber" | "red";
}) {
  const classes = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{helper}</p>
        </div>
        <div className={`rounded-xl border p-2.5 ${classes[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </section>
  );
}

function HealthPill({
  tone,
  children,
}: {
  tone: "live" | "ok" | "warning" | "muted";
  children: React.ReactNode;
}) {
  const classes = {
    live: "border-red-200 bg-red-50 text-red-700",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    muted: "border-gray-200 bg-gray-50 text-gray-600",
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${classes[tone]}`}>
      {children}
    </span>
  );
}

function MonitoringBody({ access }: { access: ControlRoomAccessLevel }) {
  const [data, setData] = useState<OperationsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const settled = await Promise.allSettled([
        dasmBff.get("admin/auctions/stats"),
        dasmBff.get("admin/cars/stats"),
        dasmBff.get("admin/bids/events/stats", { params: { date_from: today, date_to: today } }),
        dasmBff.get("admin/bids/events", { params: { per_page: 80 } }),
        dasmBff.get("admin/sessions/stats"),
        dasmBff.get("admin/sessions/active-scheduled"),
      ]);

      const failures = settled.filter((item) => item.status === "rejected").length;
      const auctions = settled[0].status === "fulfilled" ? unwrapData<AuctionStats>(settled[0].value.data) : null;
      const cars = settled[1].status === "fulfilled" ? unwrapData<CarStats>(settled[1].value.data) : null;
      const bids = settled[2].status === "fulfilled" ? unwrapData<BidStats>(settled[2].value.data) : null;
      const recentEventsRaw =
        settled[3].status === "fulfilled" ? settled[3].value.data?.data?.data : [];
      const sessions =
        settled[4].status === "fulfilled" && settled[4].value.data?.data
          ? (settled[4].value.data.data as SessionStats)
          : null;
      const activeScheduledSessions =
        settled[5].status === "fulfilled" && Array.isArray(settled[5].value.data?.data)
          ? (settled[5].value.data.data as SessionRow[])
          : [];

      setData({
        auctions,
        cars,
        bids,
        recentEvents: Array.isArray(recentEventsRaw) ? (recentEventsRaw as BidEvent[]) : [],
        sessions,
        activeScheduledSessions,
      });
      setLastRefresh(new Date());
      if (failures > 0) {
        setError(`تعذر تحميل ${formatNumber(failures)} مصدر من مصادر غرفة العمليات.`);
      }
    } catch {
      setData(emptyData);
      setError("تعذر الاتصال بمصادر غرفة عمليات المزادات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void fetchData();
    }, 45_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const stats = useMemo(() => {
    const byType = data.bids?.by_event_type ?? {};
    const todayEvents = Object.values(byType).reduce((sum, value) => sum + Number(value || 0), 0);
    const rejected = Number(byType.bid_rejected ?? 0);
    const placed = Number(byType.bid_placed ?? 0);
    const auto = Number(byType.autobid_fired ?? 0);
    const stopped = Number(data.auctions?.failed ?? 0) + Number(data.auctions?.cancelled ?? 0);
    const suspicious =
      (data.bids?.suspicious?.abnormal_rejection_rate?.is_abnormal ? 1 : 0) +
      (data.bids?.suspicious?.repeated_rejections?.length ?? 0) +
      (data.bids?.suspicious?.high_frequency_bidders?.length ?? 0) +
      (data.bids?.suspicious?.rapid_auto_bid_loops?.length ?? 0);

    return { todayEvents, rejected, placed, auto, stopped, suspicious };
  }, [data]);

  const activeSessions = Number(data.sessions?.active ?? 0);
  const canSeeScheduled = access === "full" || access === "ops";
  const selectedEvent =
    data.recentEvents.find((event) => event.id === selectedEventId) ?? data.recentEvents[0] ?? null;
  const selectedAuctionEvents = selectedEvent?.auction_id
    ? data.recentEvents.filter((event) => event.auction_id === selectedEvent.auction_id).slice(0, 5)
    : data.recentEvents.slice(0, 5);

  return (
    <div className="max-w-7xl space-y-6" dir="rtl">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Gavel className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-950">غرفة عمليات المزادات</h1>
              <p className="text-sm text-gray-500">قراءة تشغيلية مباشرة من DASM Core للمزادات والجلسات وأحداث المزايدات</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HealthPill tone={stats.stopped > 0 ? "warning" : "live"}>
              <Circle className="h-2.5 w-2.5 fill-current" />
              Live
            </HealthPill>
            <HealthPill tone={error ? "warning" : "ok"}>
              <Signal className="h-4 w-4" />
              API {error ? "جزئي" : "سليم"}
            </HealthPill>
            <HealthPill tone={activeSessions > 0 ? "ok" : "muted"}>
              <Radio className="h-4 w-4" />
              جلسات نشطة {formatNumber(activeSessions)}
            </HealthPill>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>آخر تحديث: {lastRefresh.toLocaleTimeString("ar-SA")}</span>
          <span>مصادر حقيقية: المزادات، السيارات، أحداث المزايدات، الجلسات</span>
          <span>الوصول: {access === "full" ? "كامل" : access === "ops" ? "تشغيلي" : "طابور"}</span>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="المزادات النشطة الآن"
          value={loading ? "-" : formatNumber(data.auctions?.active ?? 0)}
          helper={`المجدولة: ${formatNumber(data.auctions?.scheduled ?? data.sessions?.upcoming ?? 0)}`}
          icon={Gavel}
          tone="emerald"
        />
        <KpiCard
          title="السيارات في المزاد"
          value={loading ? "-" : formatNumber(data.cars?.in_auction ?? 0)}
          helper="من مصدر السيارات الإداري"
          icon={Car}
          tone="sky"
        />
        <KpiCard
          title="أحداث المزايدات اليوم"
          value={loading ? "-" : formatNumber(stats.todayEvents)}
          helper={`قبول ${formatNumber(stats.placed)} · رفض ${formatNumber(stats.rejected)} · تلقائي ${formatNumber(stats.auto)}`}
          icon={Gauge}
          tone="amber"
        />
        <KpiCard
          title="مؤشرات تحتاج متابعة"
          value={loading ? "-" : formatNumber(stats.stopped + stats.suspicious)}
          helper={`متوقفة/فاشلة ${formatNumber(stats.stopped)} · اشتباه ${formatNumber(stats.suspicious)}`}
          icon={ShieldAlert}
          tone={stats.stopped + stats.suspicious > 0 ? "red" : "emerald"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr,0.9fr]">
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <h2 className="font-bold text-gray-950">تدفق المزايدات المباشر</h2>
            </div>
            <span className="text-xs text-gray-400">{formatNumber(data.recentEvents.length)} حدث</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">جاري تحميل بيانات غرفة العمليات...</div>
          ) : data.recentEvents.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">لا توجد أحداث مزايدات حديثة.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold">الوقت</th>
                    <th className="px-4 py-3 text-right font-semibold">الحدث</th>
                    <th className="px-4 py-3 text-right font-semibold">المزاد</th>
                    <th className="px-4 py-3 text-right font-semibold">المزايد</th>
                    <th className="px-4 py-3 text-right font-semibold">القيمة</th>
                    <th className="px-4 py-3 text-right font-semibold">السبب</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEvents.slice(0, 12).map((event) => (
                    <tr
                      key={event.id}
                      className={`cursor-pointer border-t border-gray-100 hover:bg-gray-50 ${
                        selectedEvent?.id === event.id ? "bg-blue-50/70" : ""
                      }`}
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <td className="px-4 py-3 text-gray-500">{formatTime(event.server_ts_utc)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${eventTone(event.event_type)}`}>
                          {eventLabel(event.event_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">#{event.auction_id ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{event.bidder_code ?? "النظام"}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(event.bid_amount ?? null)}</td>
                      <td className="px-4 py-3 text-gray-500">{event.reason_code ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="font-bold text-gray-950">قائمة التنبيهات</h2>
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
              {formatNumber(stats.stopped + stats.suspicious)}
            </span>
          </div>

          <div className="space-y-3">
            {stats.stopped > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p className="font-bold">مزادات متوقفة أو فاشلة</p>
                <p className="mt-1 text-xs">يوجد {formatNumber(stats.stopped)} مزاد يحتاج مراجعة تشغيلية.</p>
              </div>
            )}
            {data.bids?.suspicious?.abnormal_rejection_rate?.is_abnormal && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-bold">نسبة رفض غير طبيعية</p>
                <p className="mt-1 text-xs">
                  النسبة {formatNumber(data.bids.suspicious.abnormal_rejection_rate.rate_pct)}%
                  مقابل حد {formatNumber(data.bids.suspicious.abnormal_rejection_rate.threshold_pct)}%.
                </p>
              </div>
            )}
            {stats.stopped === 0 && stats.suspicious === 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-bold">لا توجد مؤشرات حرجة حاليًا</p>
                <p className="mt-1 text-xs">المصادر التشغيلية لا تعرض تنبيهًا حرجًا في القراءة الحالية.</p>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                ملخص اليوم
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white p-2">
                  <p className="font-bold text-gray-950">{formatNumber(stats.placed)}</p>
                  <p className="text-gray-400">مقبولة</p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <p className="font-bold text-gray-950">{formatNumber(stats.rejected)}</p>
                  <p className="text-gray-400">مرفوضة</p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <p className="font-bold text-gray-950">{formatNumber(stats.auto)}</p>
                  <p className="text-gray-400">تلقائية</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-gray-950">تفاصيل الحدث المحدد</h2>
          </div>

          {!selectedEvent ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
              اختر حدثًا من تدفق المزايدات لعرض تفاصيل التحقيق.
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`rounded-2xl border p-3 ${eventTone(selectedEvent.event_type)}`}>
                <p className="text-xs font-bold">نوع الحدث</p>
                <p className="mt-1 text-sm font-bold">{eventLabel(selectedEvent.event_type)}</p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-gray-50 p-3">
                  <dt className="text-xs text-gray-400">رقم المزاد</dt>
                  <dd className="mt-1 font-bold text-gray-900">#{selectedEvent.auction_id ?? "-"}</dd>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3">
                  <dt className="text-xs text-gray-400">وقت الخادم</dt>
                  <dd className="mt-1 font-bold text-gray-900">{formatTime(selectedEvent.server_ts_utc)}</dd>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3">
                  <dt className="text-xs text-gray-400">المزايد</dt>
                  <dd className="mt-1 font-bold text-gray-900">{selectedEvent.bidder_code ?? "النظام"}</dd>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3">
                  <dt className="text-xs text-gray-400">القيمة</dt>
                  <dd className="mt-1 font-bold text-gray-900">{formatCurrency(selectedEvent.bid_amount ?? null)}</dd>
                </div>
              </dl>
              <div className="rounded-2xl bg-gray-50 p-3 text-sm">
                <p className="text-xs text-gray-400">سبب/رمز الحدث</p>
                <p className="mt-1 font-semibold text-gray-800">{selectedEvent.reason_code ?? "لا يوجد سبب مسجل"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-gray-950">إجراءات التحقيق الآمنة</h2>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {[
              { href: `${DASM_BASE}/admin/auction-operations-room`, label: "فتح غرفة المنصة الأساسية" },
              { href: `${DASM_BASE}/admin/bids-logs`, label: "مراجعة سجل المزايدات" },
              { href: `${DASM_BASE}/admin/sessions`, label: "إدارة جلسات المزاد" },
              { href: `${DASM_BASE}/admin/visibility`, label: "إدارة ظهور خدمة المزادات" },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-800 hover:border-blue-200 hover:bg-blue-50"
              >
                {action.label}
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-bold text-gray-500">آخر أحداث لنفس المزاد</p>
            <div className="space-y-2">
              {selectedAuctionEvents.length === 0 ? (
                <p className="text-xs text-gray-400">لا توجد أحداث مرتبطة.</p>
              ) : (
                selectedAuctionEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-right text-xs hover:bg-blue-50"
                  >
                    <span className="font-bold text-gray-800">{eventLabel(event.event_type)}</span>
                    <span className="text-gray-400">{formatTime(event.server_ts_utc)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {canSeeScheduled && (
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-blue-600" />
              <h2 className="font-bold text-gray-950">الجلسات النشطة والمجدولة</h2>
            </div>
            <span className="text-xs text-gray-400">{formatNumber(data.activeScheduledSessions.length)} جلسة</span>
          </div>
          {data.activeScheduledSessions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">لا توجد جلسات نشطة أو مجدولة في القراءة الحالية.</div>
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {data.activeScheduledSessions.slice(0, 9).map((session) => (
                <div key={session.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-gray-950">{session.name}</p>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                      {session.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{session.type}</p>
                  <p className="mt-1 text-xs text-gray-400">{session.session_date}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function MonitoringPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <MonitoringBody access={access} />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
