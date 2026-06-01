import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import platformApi from "@/lib/platformApi";
import { CrButton } from "@/components/ui/cr-button";
import { useAuth } from "@/hooks/useAuth";
import {
  Car,
  ClipboardList,
  UserCog,
  Radio,
  ShoppingBag,
  AlertTriangle,
  Activity,
  TrendingUp,
  Users,
  Gavel,
  RefreshCw,
} from "lucide-react";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import DashboardHero from "@/components/control-room/DashboardHero";
import PlatformPulseBar from "@/components/control-room/PlatformPulseBar";
import { fetchDashboardStats, type DashboardStats } from "@/lib/fetchDashboardStats";

const DASM_BASE = "https://www.dasm.com.sa";

/* ─── Types ─── */
const CAR_TYPES = [
  { value: "luxury", label: "سيارة فارهة" },
  { value: "classic", label: "كلاسيكية" },
  { value: "caravan", label: "كرافان" },
  { value: "truck", label: "شاحنة" },
  { value: "company", label: "سيارة شركة" },
  { value: "government", label: "حكومية" },
  { value: "individual", label: "فردية" },
];

type CarRow = {
  id: number;
  owner_name: string;
  model: string;
  status: string;
  images: string[];
  reports: string[];
  market?: string;
  type?: string;
};

type Stats = DashboardStats;

function formatStat(value: number | undefined, loading: boolean) {
  if (loading) return "…";
  if (value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ar-SA").format(value);
}

type StatTone = {
  icon: string;
  iconDark: string;
};

const STAT_TONES: Record<string, StatTone> = {
  amber: {
    icon: "text-amber-700 bg-amber-100 ring-amber-200/60",
    iconDark: "dark:text-amber-200 dark:bg-amber-500/15 dark:ring-amber-500/20",
  },
  green: {
    icon: "text-emerald-700 bg-emerald-100 ring-emerald-200/60",
    iconDark: "dark:text-emerald-200 dark:bg-emerald-500/15 dark:ring-emerald-500/20",
  },
  blue: {
    icon: "text-blue-700 bg-blue-100 ring-blue-200/60",
    iconDark: "dark:text-blue-200 dark:bg-blue-500/15 dark:ring-blue-500/20",
  },
  red: {
    icon: "text-red-700 bg-red-100 ring-red-200/60",
    iconDark: "dark:text-red-200 dark:bg-red-500/15 dark:ring-red-500/20",
  },
  purple: {
    icon: "text-purple-700 bg-purple-100 ring-purple-200/60",
    iconDark: "dark:text-purple-200 dark:bg-purple-500/15 dark:ring-purple-500/20",
  },
  indigo: {
    icon: "text-indigo-700 bg-indigo-100 ring-indigo-200/60",
    iconDark: "dark:text-indigo-200 dark:bg-indigo-500/15 dark:ring-indigo-500/20",
  },
};

/* ─── Overview Stats ─── */
function OverviewStats({ access }: { access: ControlRoomAccessLevel }) {
  const [stats, setStats] = useState<Stats>({
    pending_cars: 0,
    live_auctions: 0,
    pending_approvals: 0,
    open_alerts: 0,
    active_sessions: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const cards: Array<{
    label: string;
    value: number;
    icon: typeof Car;
    tone: keyof typeof STAT_TONES;
    href: string;
  }> = [
    {
      label: "سيارات بانتظار المراجعة",
      value: stats.pending_cars,
      icon: Car,
      tone: "amber",
      href: "/admin/control-room",
    },
    {
      label: "مزادات حية الآن",
      value: stats.live_auctions,
      icon: Radio,
      tone: "green",
      href: "/admin/control-room/monitoring",
    },
    {
      label: "موافقات معلقة",
      value: stats.pending_approvals,
      icon: ClipboardList,
      tone: "blue",
      href: "/admin/control-room/approval-requests",
    },
    {
      label: "تنبيهات مفتوحة",
      value: stats.open_alerts,
      icon: AlertTriangle,
      tone: "red",
      href: "/admin/control-room/smart-alerts",
    },
    ...(access === "full"
      ? [
          {
            label: "جلسات نشطة",
            value: stats.active_sessions,
            icon: Users,
            tone: "purple" as const,
            href: `${DASM_BASE}/admin/sessions`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="cr-section-title">مؤشرات سريعة</h2>
          <p className="cr-section-sub">أرقام حية من API المنصة — تتحدّث عند الطلب</p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const tone = STAT_TONES[card.tone];
          const isExternal = card.href.startsWith("http");
          const inner = (
            <>
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${tone.icon} ${tone.iconDark}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className={`cr-stat-value ${loading ? "animate-pulse opacity-70" : ""}`}>
                {formatStat(card.value, loading)}
              </p>
              <p className="cr-stat-label mt-1">{card.label}</p>
            </>
          );

          if (isExternal) {
            return (
              <a
                key={card.label}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                className="cr-stat-card block group"
              >
                {inner}
              </a>
            );
          }

          return (
            <Link key={card.label} href={card.href} className="cr-stat-card block group">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Quick Links ─── */
function QuickLinks({ access }: { access: ControlRoomAccessLevel }) {
  const links = [
    { href: "/admin/control-room/monitoring", label: "المراقبة الحية", icon: Radio, desc: "حالة المزادات والبث اللحظي" },
    { href: "/admin/control-room/approval-requests", label: "طابور الموافقات", icon: ClipboardList, desc: "حسابات تجارية وطلبات الصلاحيات" },
    { href: "/admin/control-room/kyc-review", label: "مراجعة KYC", icon: UserCog, desc: "توثيق التجار وأصحاب المعارض" },
    { href: "/admin/control-room/activities", label: "سجل الأنشطة", icon: Activity, desc: "أنشطة المنصات المرتبطة" },
    { href: "/admin/control-room/stores", label: "المتاجر الإلكترونية", icon: ShoppingBag, desc: "ربط وإدارة متاجر store.dasm.com.sa" },
    { href: "/admin/control-room/smart-alerts", label: "التنبيهات الذكية", icon: AlertTriangle, desc: "تحليل المخاطر والشذوذ" },
    ...(access === "full" ? [
      { href: "/reports", label: "التقارير", icon: TrendingUp, desc: "تقارير الأداء والمبيعات" },
      { href: "/admin/control-room/users", label: "المستخدمون", icon: Users, desc: "إدارة المستخدمين والأدوار" },
    ] : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="cr-section-title">الأقسام</h2>
        <p className="cr-section-sub">اختصارات تشغيلية لأهم غرف العمل</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="cr-link-card group">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 ring-1 ring-blue-200/60 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/20">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="cr-link-title group-hover:text-blue-800 dark:group-hover:text-blue-200">
                  {link.label}
                </p>
                <p className="cr-link-desc">{link.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Pending Cars (full access only) ─── */
function PendingCarsSection() {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCars, setSelectedCars] = useState<number[]>([]);
  const [carTypes, setCarTypes] = useState<{ [id: number]: string }>({});

  const fetchPendingCars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await platformApi.get("/api/admin/live-market-staging/pending-cars");
      const payload = res.data as { data?: CarRow[] };
      setCars(Array.isArray(payload?.data) ? payload.data : []);
    } catch {
      setCars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPendingCars(); }, [fetchPendingCars]);

  const handleApprove = async (carId: number) => {
    const type = carTypes[carId] || "luxury";
    await platformApi.post("/api/admin/live-market-staging/approve-to-instant", {
      id: carId,
      type,
      market: "instant",
    });
    void fetchPendingCars();
  };

  const handleMoveToLiveMarket = async () => {
    if (selectedCars.length === 0) return;
    await platformApi.post("/api/admin/live-market-staging/move-selected-to-live", {
      car_ids: selectedCars,
    });
    void fetchPendingCars();
    setSelectedCars([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gavel className="w-5 h-5 text-blue-600" />
        <h2 className="text-sm font-semibold text-gray-700">السيارات بانتظار الموافقة</h2>
        {cars.length > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            {cars.length} سيارة
          </span>
        )}
      </div>
      {loading && <p className="text-sm text-gray-400">جاري التحميل...</p>}
      {!loading && cars.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          لا توجد سيارات معلقة حالياً
        </div>
      )}
      {cars.length > 0 && (
        <>
          <CrButton disabled={selectedCars.length === 0} onClick={handleMoveToLiveMarket} className="text-sm">
            نقل المحدد للحراج المباشر ({selectedCars.length})
          </CrButton>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                  <th className="p-3 text-right font-medium">اختيار</th>
                  <th className="p-3 text-right font-medium">المالك</th>
                  <th className="p-3 text-right font-medium">الموديل</th>
                  <th className="p-3 text-right font-medium">الصور</th>
                  <th className="p-3 text-right font-medium">التصنيف</th>
                  <th className="p-3 text-right font-medium">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <tr key={car.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedCars.includes(car.id)}
                        onChange={(e) =>
                          setSelectedCars((prev) =>
                            e.target.checked ? [...prev, car.id] : prev.filter((id) => id !== car.id)
                          )
                        }
                        aria-label={`اختيار ${car.model}`}
                      />
                    </td>
                    <td className="p-3 font-medium text-gray-900">{car.owner_name}</td>
                    <td className="p-3 text-gray-700">{car.model}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {car.images?.slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={carTypes[car.id] || ""}
                        onChange={(e) => setCarTypes((prev) => ({ ...prev, [car.id]: e.target.value }))}
                        aria-label="التصنيف"
                        className="border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-sm"
                      >
                        <option value="">اختر</option>
                        {CAR_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <CrButton
                        variant="success"
                        onClick={() => handleApprove(car.id)}
                        disabled={!carTypes[car.id]}
                        size="sm"
                      >
                        اعتماد
                      </CrButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Page Body ─── */
function DashboardBody({ access }: { access: ControlRoomAccessLevel }) {
  const { isSuperAdmin } = useAuth();

  return (
    <div className="space-y-8 max-w-7xl">
      <DashboardHero />
      <PlatformPulseBar />
      <OverviewStats access={access} />
      <QuickLinks access={access} />

      {/* طابور الموافقات السريع */}
      <div className="space-y-4">
        <div>
          <h2 className="cr-section-title">العمليات التشغيلية</h2>
          <p className="cr-section-sub">مسارات الموافقات والمراجعة السريعة</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/admin/control-room/approval-requests" className="cr-link-card">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-500/15 dark:text-amber-200">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="cr-link-title">طابور الموافقات</p>
              <p className="cr-link-desc">
                حسابات تجارية (تاجر / مالك معرض / مستثمر) وطلبات صلاحيات مجلس السوق
              </p>
            </div>
          </Link>
          {isSuperAdmin && (
            <Link
              href="/admin/control-room/approval-group"
              className="cr-link-card border-blue-200/80 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-800 ring-1 ring-blue-200/70 dark:bg-blue-500/15 dark:text-blue-200">
                <UserCog className="w-6 h-6" />
              </div>
              <div>
                <p className="cr-link-title">مجموعة الموافقات</p>
                <p className="cr-link-desc">إدارة الأعضاء والقدرات (مدير النظام فقط)</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {access === "full" && <PendingCarsSection />}
    </div>
  );
}

/* ─── Export ─── */
export default function ControlRoomIndexPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <DashboardBody access={access} />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
