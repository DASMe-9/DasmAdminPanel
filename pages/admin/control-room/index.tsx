import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import platformApi from "@/lib/platformApi";
import dasmBff from "@/lib/dasmBffClient";
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

type Stats = {
  pending_cars?: number;
  live_auctions?: number;
  pending_approvals?: number;
  active_users?: number;
  open_alerts?: number;
  ecommerce_orders?: number;
};

/* ─── Overview Stats ─── */
function OverviewStats({ access }: { access: ControlRoomAccessLevel }) {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dasmBff.get("admin/monitoring/overview");
      const data = res.data?.data ?? res.data ?? {};
      setStats(data);
    } catch {
      // Stats unavailable — show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const cards = [
    { label: "سيارات بانتظار المراجعة", value: stats.pending_cars, icon: Car, color: "text-amber-600 bg-amber-50", href: "/admin/control-room" },
    { label: "مزادات حية الآن", value: stats.live_auctions, icon: Radio, color: "text-green-600 bg-green-50", href: "/admin/control-room/monitoring" },
    { label: "موافقات معلقة", value: stats.pending_approvals, icon: ClipboardList, color: "text-blue-600 bg-blue-50", href: "/admin/control-room/approval-requests" },
    { label: "تنبيهات مفتوحة", value: stats.open_alerts, icon: AlertTriangle, color: "text-red-600 bg-red-50", href: "/admin/control-room/smart-alerts" },
    ...(access === "full" ? [
      { label: "مستخدمون نشطون", value: stats.active_users, icon: Users, color: "text-purple-600 bg-purple-50", href: "/users" },
      { label: "طلبات التجارة اليوم", value: stats.ecommerce_orders, icon: ShoppingBag, color: "text-indigo-600 bg-indigo-50", href: "/admin/control-room/ecommerce" },
    ] : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">مؤشرات سريعة</h2>
        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition group"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className={`text-2xl font-bold text-gray-900 ${loading ? "animate-pulse" : ""}`}>
                {loading ? "—" : (card.value ?? "—")}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 group-hover:text-gray-700 transition">{card.label}</p>
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
    { href: "/admin/control-room/ecommerce", label: "المتاجر الإلكترونية", icon: ShoppingBag, desc: "مراقبة المتاجر والطلبات" },
    { href: "/admin/control-room/smart-alerts", label: "التنبيهات الذكية", icon: AlertTriangle, desc: "تحليل المخاطر والشذوذ" },
    ...(access === "full" ? [
      { href: "/reports", label: "التقارير", icon: TrendingUp, desc: "تقارير الأداء والمبيعات" },
      { href: "/users", label: "المستخدمون", icon: Users, desc: "إدارة المستخدمين والأدوار" },
    ] : []),
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">الأقسام</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-start gap-3 p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition"
            >
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{link.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
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
      const res = await platformApi.get("/api/admin/cars/pending");
      setCars(res.data);
    } catch {
      setCars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPendingCars(); }, [fetchPendingCars]);

  const handleApprove = async (carId: number) => {
    const type = carTypes[carId] || "luxury";
    await platformApi.post("/api/admin/cars/approve", { id: carId, type, market: "instant" });
    void fetchPendingCars();
  };

  const handleMoveToLiveMarket = async () => {
    if (selectedCars.length === 0) return;
    await platformApi.post("/api/admin/cars/move-to-live-market", { carIds: selectedCars });
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
    <div className="space-y-8 max-w-6xl">
      <OverviewStats access={access} />
      <QuickLinks access={access} />

      {/* طابور الموافقات السريع */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">العمليات التشغيلية</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/control-room/approval-requests"
            className="flex items-start gap-3 p-5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition"
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-gray-900">طابور الموافقات</p>
              <p className="text-sm text-gray-500 mt-1">
                حسابات تجارية (تاجر / مالك معرض / مستثمر) وطلبات صلاحيات مجلس السوق
              </p>
            </div>
          </Link>
          {isSuperAdmin && (
            <Link
              href="/admin/control-room/approval-group"
              className="flex items-start gap-3 p-5 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition"
            >
              <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                <UserCog className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-gray-900">مجموعة الموافقات</p>
                <p className="text-sm text-gray-500 mt-1">إدارة الأعضاء والقدرات (مدير النظام فقط)</p>
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
