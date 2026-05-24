import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Store,
  Package,
  ShoppingCart,
  TrendingUp,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Ban,
  ExternalLink,
  CreditCard,
  Truck,
  Globe,
  LayoutDashboard,
  Link2,
} from "lucide-react";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import CrPageHeader from "@/components/control-room/CrPageHeader";
import CrKpiCard from "@/components/control-room/CrKpiCard";
import { INTERNAL_LINKS } from "@/lib/platforms";

const STORES_BASE = "https://store.dasm.com.sa";

type ImportSummary = {
  provider: string;
  connected?: boolean;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_sync_message?: string | null;
  external_name?: string | null;
};

type StoreRow = {
  id: number;
  name: string;
  name_ar?: string;
  slug: string;
  owner_type: string;
  status: "active" | "suspended" | "draft";
  products_count: number;
  orders_count: number;
  created_at: string;
  owner?: { first_name: string; last_name: string; email: string };
  import_summary?: ImportSummary[];
};

type Stats = {
  total_stores: number;
  by_status?: { draft?: number; active?: number; suspended?: number };
  total_orders: number;
  orders_today: number;
  total_revenue: number;
  salla_connected?: number;
};

type ImportReadinessData = {
  shopify_configured: boolean;
  salla_configured: boolean;
  salla_webhook_configured: boolean;
  schema: {
    track_stock?: boolean;
    store_import_connections?: boolean;
    store_pos_integrations?: boolean;
  };
  cheerlylife?: { id: number; slug: string; status: string; owner_type?: string } | null;
  pilot_store?: {
    id: number;
    slug: string;
    status: string;
    owner_type?: string;
    products_count?: number;
    import_summary?: ImportSummary[];
  } | null;
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: "نشط", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200", icon: CheckCircle },
  draft: { label: "مسودة", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200", icon: Clock },
  suspended: { label: "موقوف", color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200", icon: Ban },
};

function sallaSummary(store: StoreRow): ImportSummary | undefined {
  return store.import_summary?.find((c) => c.provider === "salla");
}

function sallaBadge(store: StoreRow): { label: string; color: string; title?: string } {
  const salla = sallaSummary(store);
  if (!salla?.connected) {
    return { label: "غير مربوط", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
  }
  if (salla.last_sync_status === "failed") {
    return {
      label: "متصل — فشل sync",
      color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200",
      title: salla.last_sync_message ?? undefined,
    };
  }
  if (salla.last_sync_status === "partial") {
    return {
      label: "متصل — sync جزئي",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
      title: salla.last_sync_message ?? undefined,
    };
  }
  if (salla.last_sync_at) {
    return {
      label: "متصل بسلة",
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
      title: salla.last_sync_message ?? undefined,
    };
  }
  return { label: "متصل بسلة", color: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200" };
}

const OWNER_TYPE_MAP: Record<string, string> = {
  venue_owner: "معرض",
  dealer: "تاجر",
  user: "مستخدم",
  farmer: "مزارع",
  company: "شركة",
  ecommerce: "تجارة إلكترونية",
  workshop: "ورشة",
  investor: "مستثمر",
};

const QUICK_LINKS = [
  {
    label: "طلبات المتاجر",
    desc: "لوحة موحّدة — Control Room",
    href: "/admin/control-room/store-orders",
    icon: ShoppingCart,
    tone: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200",
    internal: true,
  },
  {
    label: "استكشاف المتاجر",
    desc: "واجهة العملاء العامة",
    href: INTERNAL_LINKS.storesExplore,
    icon: Globe,
    tone: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200",
  },
  {
    label: "لوحة التاجر",
    desc: "إدارة المنتجات والطلبات",
    href: INTERNAL_LINKS.storesDashboard,
    icon: LayoutDashboard,
    tone: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-200",
  },
  {
    label: "شحن داسم",
    desc: "تتبع الشحنات والتوصيل",
    href: INTERNAL_LINKS.shippingDashboard,
    icon: Truck,
    tone: "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-200",
  },
  {
    label: "المدفوعات (Paymob)",
    desc: "عبر محفظة ومنصة داسم",
    href: "https://www.dasm.com.sa/admin",
    icon: CreditCard,
    tone: "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200",
  },
];

const ECOSYSTEM = [
  {
    title: "Storefront SaaS",
    body: "متجر لكل معرض/تاجر على store.dasm.com.sa — واجهة عربية، SEO، وسلة مشتريات.",
    status: "live" as const,
  },
  {
    title: "ربط DASM Core",
    body: "تزويد تلقائي من حسابات المعارض، السيارات، والموافقات عبر api.dasm.com.sa.",
    status: "live" as const,
  },
  {
    title: "الدفع والتسوية",
    body: "Paymob + محفظة داسم — لا WordPress ولا WooCommerce.",
    status: "live" as const,
  },
  {
    title: "لوحة طلبات موحّدة",
    body: "كل طلبات المتاجر في الكنترول روم — قراءة، فلترة، KPIs (Phase 1).",
    status: "live" as const,
  },
  {
    title: "استيراد Salla / Shopify",
    body: "OAuth + استيراد — Salla لمعارض القطع؛ Shopify لـ Cheerly (مسارات منفصلة).",
    status: "live" as const,
  },
];

function readinessFlag(ok: boolean): string {
  return ok
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
    : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200";
}

function StoresBody({ access }: { access: ControlRoomAccessLevel }) {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [readiness, setReadiness] = useState<ImportReadinessData | null>(null);
  const [pilotSlug, setPilotSlug] = useState("");
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setFilter] = useState("all");
  const [actionBusy, setBusy] = useState<number | null>(null);
  const [tab, setTab] = useState<"all" | "draft">("all");

  const authHeaders = (): Record<string, string> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const loadReadiness = useCallback(async (slug?: string) => {
    setReadinessLoading(true);
    try {
      const headers = authHeaders();
      const q = slug?.trim() ? `?slug=${encodeURIComponent(slug.trim())}` : "";
      const res = await fetch(`/api/stores/import-readiness${q}`, { headers });
      const json = await res.json();
      if (json.status === "success") setReadiness(json.data as ImportReadinessData);
    } finally {
      setReadinessLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = authHeaders();
      const [sRes, stRes] = await Promise.allSettled([
        fetch(`/api/stores/list?status=${statusFilter}&search=${encodeURIComponent(search)}`, { headers }).then((r) => r.json()),
        fetch("/api/stores/stats", { headers }).then((r) => r.json()),
      ]);
      if (sRes.status === "fulfilled" && sRes.value.status === "success") {
        const page = sRes.value.data;
        setStores(Array.isArray(page) ? page : page?.data ?? []);
      }
      if (stRes.status === "fulfilled" && stRes.value.status === "success") setStats(stRes.value.data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void load();
    void loadReadiness();
  }, [load, loadReadiness]);

  const doAction = async (id: number, action: "suspend" | "activate") => {
    const label = action === "activate" ? "تفعيل" : "تعليق";
    if (!confirm(`${label} المتجر؟`)) return;
    setBusy(id);
    try {
      await fetch("/api/stores/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ storeId: id, action }),
      });
      void load();
    } finally {
      setBusy(null);
    }
  };

  const displayed = stores.filter((s) => (tab === "draft" ? s.status === "draft" : true));

  return (
    <div className="space-y-6 max-w-7xl">
      <CrPageHeader
        icon={Store}
        title="مركز متاجر داسم"
        subtitle="إدارة المتاجر الحقيقية على store.dasm.com.sa — ربط، تفعيل، مراقبة، وخدمات الدفع والشحن"
        actions={
          <button
            type="button"
            onClick={() => {
              void load();
              void loadReadiness(pilotSlug);
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        }
      />

      <section className="cr-panel">
        <p className="cr-section-title mb-3">اختصارات تشغيلية</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            const inner = (
              <>
                <span className="flex items-center gap-2 font-bold">
                  <Icon className="h-4 w-4" />
                  {link.label}
                  {"internal" in link && link.internal ? null : (
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  )}
                </span>
                <span className="text-xs opacity-80">{link.desc}</span>
              </>
            );
            const className = `cr-quick-link flex-col items-start gap-1 !py-3 ${link.tone}`;
            if ("internal" in link && link.internal) {
              return (
                <Link key={link.href} href={link.href} className={className}>
                  {inner}
                </Link>
              );
            }
            return (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                {inner}
              </a>
            );
          })}
        </div>
      </section>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <CrKpiCard title="إجمالي المتاجر" value={stats.total_stores} icon={Store} tone="indigo" loading={loading} />
          <CrKpiCard title="نشطة" value={stats.by_status?.active ?? 0} icon={CheckCircle} tone="emerald" loading={loading} />
          <CrKpiCard title="مسودة" value={stats.by_status?.draft ?? 0} icon={Clock} tone="amber" loading={loading} />
          <CrKpiCard title="موقوفة" value={stats.by_status?.suspended ?? 0} icon={Ban} tone="red" loading={loading} />
          <CrKpiCard title="طلبات اليوم" value={stats.orders_today} icon={ShoppingCart} tone="blue" loading={loading} />
          <CrKpiCard
            title="متصل بسلة"
            value={stats.salla_connected ?? 0}
            helper="متاجر OAuth"
            icon={Link2}
            tone="emerald"
            loading={loading}
          />
          <CrKpiCard
            title="إجمالي الإيرادات"
            value={`${((stats.total_revenue ?? 0) / 1000).toFixed(1)}k`}
            helper="ر.س — من API المتاجر"
            icon={TrendingUp}
            tone="purple"
            loading={loading}
          />
        </div>
      )}

      <section className="cr-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-indigo-600" />
            <p className="cr-section-title mb-0">جاهزية الاستيراد (Salla / Shopify)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={pilotSlug}
              onChange={(e) => setPilotSlug(e.target.value)}
              placeholder="slug معرض pilot (مثل alnoor-parts)"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => void loadReadiness(pilotSlug)}
              disabled={readinessLoading}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              تحقق
            </button>
          </div>
        </div>
        {readinessLoading && !readiness ? (
          <p className="text-sm text-slate-500">جاري التحقق…</p>
        ) : readiness ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${readinessFlag(readiness.salla_configured)}`}>
                Salla {readiness.salla_configured ? "مهيّأ" : "غير مهيّأ"}
              </span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${readinessFlag(readiness.salla_webhook_configured)}`}>
                Webhook Salla {readiness.salla_webhook_configured ? "✓" : "—"}
              </span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${readinessFlag(readiness.shopify_configured)}`}>
                Shopify {readiness.shopify_configured ? "مهيّأ" : "غير مهيّأ"}
              </span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${readinessFlag(!!readiness.schema?.store_import_connections)}`}>
                Schema import
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">Cheerly (`cheerlylife`)</p>
                {readiness.cheerlylife ? (
                  <p className="text-slate-600 dark:text-slate-300">
                    #{readiness.cheerlylife.id} — {readiness.cheerlylife.status}
                  </p>
                ) : (
                  <p className="text-amber-700 dark:text-amber-300">غير موجود — مسار Shopify منفصل</p>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">معرض pilot (Salla)</p>
                {readiness.pilot_store ? (
                  <>
                    <p className="text-slate-600 dark:text-slate-300">
                      {readiness.pilot_store.slug} — {readiness.pilot_store.status} — {readiness.pilot_store.products_count ?? 0} منتج
                    </p>
                    {readiness.pilot_store.import_summary?.map((row) => (
                      <p key={row.provider} className="text-xs text-slate-500 mt-1">
                        {row.provider}: {row.connected ? "متصل" : "غير متصل"}
                      </p>
                    ))}
                  </>
                ) : pilotSlug.trim() ? (
                  <p className="text-amber-700 dark:text-amber-300">slug غير موجود بعد</p>
                ) : (
                  <p className="text-slate-500">أدخل slug معرض قطع غيار للتحقق</p>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Salla لمعارض القطع/الإكسسوارات — Cheerly Shopify فقط. لا خلط بين المسارين.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">اضغط تحديث أو تحقق لعرض الحالة.</p>
        )}
      </section>

      <section className="cr-panel">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-4 w-4 text-blue-600" />
          <p className="cr-section-title">منظومة المتاجر (خدمات حقيقية)</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ECOSYSTEM.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.status === "live"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {item.status === "live" ? "شغّال" : "قريباً"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {stats && (stats.by_status?.draft ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => setTab("draft")}
          className="w-full flex items-center gap-3 cr-alert-warning text-right hover:opacity-90 transition"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">
            {stats.by_status?.draft ?? 0} متجر مسودة بانتظار التفعيل — اضغط للعرض
          </span>
        </button>
      )}

      <div className="cr-filter-bar">
        <div className="flex gap-2">
          {(["all", "draft"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                tab === t
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white border border-slate-200 text-slate-600 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              {t === "all" ? "كل المتاجر" : "مسودة فقط"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="بحث بالاسم أو slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="فلتر الحالة"
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="draft">مسودة</option>
            <option value="suspended">موقوف</option>
          </select>
          <span className="text-xs text-slate-400">{displayed.length} متجر</span>
        </div>
      </div>

      <div className="cr-table-wrap">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">جاري تحميل المتاجر من DASM Core…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="cr-empty m-4">
            <Store className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            {stores.length === 0 ? "لا توجد متاجر مسجّلة بعد على المنصة" : "لا توجد نتائج للبحث"}
          </div>
        ) : (
          <table className="w-full min-w-[960px] text-sm">
            <thead className="cr-table-head">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">المتجر</th>
                <th className="px-4 py-3 text-right font-semibold">المالك</th>
                <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold">Salla</th>
                <th className="px-4 py-3 text-right font-semibold">منتجات</th>
                <th className="px-4 py-3 text-right font-semibold">طلبات</th>
                <th className="px-4 py-3 text-right font-semibold">أُنشئ</th>
                <th className="px-4 py-3 text-right font-semibold">روابط</th>
                {access === "full" && <th className="px-4 py-3 text-right font-semibold">إجراء</th>}
              </tr>
            </thead>
            <tbody>
              {displayed.map((store) => {
                const s = STATUS_MAP[store.status] ?? STATUS_MAP.draft;
                const Icon = s.icon;
                const salla = sallaBadge(store);
                const storefront = `${STORES_BASE}/store/${store.slug}`;
                return (
                  <tr key={store.id} className="cr-table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 dark:bg-emerald-500/15">
                          {store.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{store.name}</p>
                          <p className="text-xs text-slate-400">/{store.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <p>{OWNER_TYPE_MAP[store.owner_type] ?? store.owner_type}</p>
                      {store.owner?.email ? (
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{store.owner.email}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        <Icon className="w-3 h-3" />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${salla.color}`}
                        title={salla.title}
                      >
                        <Link2 className="w-3 h-3" />
                        {salla.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        {store.products_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                        <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                        {store.orders_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(store.created_at).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={storefront}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                      >
                        المتجر
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    {access === "full" && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {store.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => void doAction(store.id, "activate")}
                              disabled={actionBusy === store.id}
                              className="text-xs px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              تفعيل
                            </button>
                          )}
                          {store.status === "active" && (
                            <button
                              type="button"
                              onClick={() => void doAction(store.id, "suspend")}
                              disabled={actionBusy === store.id}
                              className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              تعليق
                            </button>
                          )}
                          {store.status === "suspended" && (
                            <button
                              type="button"
                              onClick={() => void doAction(store.id, "activate")}
                              disabled={actionBusy === store.id}
                              className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 disabled:opacity-50"
                            >
                              إعادة تفعيل
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        المصدر: <code className="text-xs">GET /api/admin/stores</code> عبر الكنترول روم — لا بيانات WordPress أو WooCommerce.
      </p>
    </div>
  );
}

export default function StoresPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <StoresBody access={access} />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
