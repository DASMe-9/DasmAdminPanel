import { useCallback, useEffect, useState } from "react";
import { Activity, Clock, Filter, RefreshCw, Search, User } from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import CrPageHeader from "@/components/control-room/CrPageHeader";

type PlatformActivity = {
  id: string;
  platform: "dasm" | "shipping" | "inspection" | "control-room" | string;
  event_type: string;
  actor_id?: number;
  actor_name?: string;
  actor_role?: string;
  target_type?: string;
  target_id?: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

const PLATFORM_LABELS: Record<string, { label: string; color: string }> = {
  dasm: { label: "داسم", color: "bg-blue-100 text-blue-700" },
  shipping: { label: "الشحن", color: "bg-green-100 text-green-700" },
  inspection: { label: "الفحص", color: "bg-purple-100 text-purple-700" },
  "control-room": { label: "الكنترول روم", color: "bg-amber-100 text-amber-700" },
};

const EVENT_ICONS: Record<string, string> = {
  login: "🔐",
  logout: "🚪",
  car_approved: "✅",
  car_rejected: "❌",
  auction_started: "🔨",
  auction_ended: "🏁",
  user_created: "👤",
  payment: "💳",
  withdrawal: "💸",
  store_suspended: "⛔",
  store_activated: "✅",
  alert_resolved: "🛡️",
};

function ActivityRow({ activity }: { activity: PlatformActivity }) {
  const platform = PLATFORM_LABELS[activity.platform] ?? {
    label: activity.platform,
    color: "bg-gray-100 text-gray-600",
  };
  const icon = EVENT_ICONS[activity.event_type] ?? "📌";

  return (
    <tr className="cr-table-row text-sm">
      <td className="px-4 py-3">
        <span className="text-base">{icon}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${platform.color}`}>
          {platform.label}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{activity.description}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {activity.actor_name ? (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {activity.actor_name}
            {activity.actor_role && (
              <span className="text-gray-400">({activity.actor_role})</span>
            )}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(activity.created_at).toLocaleString("ar-SA")}
        </span>
      </td>
    </tr>
  );
}

function ActivitiesBody({ access }: { access: ControlRoomAccessLevel }) {
  const [activities, setActivities] = useState<PlatformActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchActivities = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: "50" });
      if (platformFilter !== "all") params.set("platform", platformFilter);
      const res = await dasmBff.get(`admin/platform-activities?${params}`);
      const d = res.data?.data ?? res.data ?? {};
      const rawItems = Array.isArray(d) ? d : d.data ?? [];
      const items: PlatformActivity[] = (rawItems as Array<Record<string, unknown>>).map((a) => ({
        id: String(a.id),
        platform: String(a.platform ?? "dasm"),
        event_type: String(a.event_type ?? ""),
        actor_id: a.user && typeof a.user === "object" ? Number((a.user as Record<string, unknown>).id) : undefined,
        actor_name:
          a.user && typeof a.user === "object"
            ? String((a.user as Record<string, unknown>).name ?? "")
            : undefined,
        description: String(a.summary ?? a.description ?? ""),
        metadata: (a.metadata as Record<string, unknown>) ?? undefined,
        created_at: String(a.occurred_at ?? a.created_at ?? new Date().toISOString()),
      }));

      if (p === 1) {
        setActivities(items);
      } else {
        setActivities((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === 50);
      setPage(p);
    } catch {
      if (p === 1) setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [platformFilter]);

  useEffect(() => { void fetchActivities(1); }, [fetchActivities]);

  const filtered = activities.filter((a) => {
    if (!search) return true;
    return (
      a.description.includes(search) ||
      a.actor_name?.includes(search) ||
      a.event_type.includes(search)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <CrPageHeader
        icon={Activity}
        title="سجل الأنشطة"
        subtitle="أحداث المنصات الموثّقة عبر DASM Core"
        actions={
          <button
            type="button"
            onClick={() => void fetchActivities(1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        }
      />

      <div className="cr-filter-bar">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="بحث في الأنشطة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 pl-3 py-2 rounded-xl border border-gray-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            aria-label="فلتر المنصة"
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
          >
            <option value="all">كل المنصات</option>
            <option value="dasm">داسم</option>
            <option value="shipping">الشحن</option>
            <option value="inspection">الفحص</option>
            <option value="control-room">الكنترول روم</option>
          </select>
        </div>
        <span className="text-xs text-slate-400">{filtered.length} نشاط</span>
      </div>

      <div className="cr-panel-flush">
        {loading && activities.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            جاري تحميل السجل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {activities.length === 0 ? "لا توجد أنشطة مسجّلة بعد" : "لا توجد نتائج للبحث"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="cr-table-head text-xs">
                    <th className="px-4 py-3 text-right font-medium w-8"></th>
                    <th className="px-4 py-3 text-right font-medium">المنصة</th>
                    <th className="px-4 py-3 text-right font-medium">الوصف</th>
                    <th className="px-4 py-3 text-right font-medium">المنفّذ</th>
                    <th className="px-4 py-3 text-right font-medium">التوقيت</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="px-4 py-3 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => void fetchActivities(page + 1)}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {loading ? "جاري التحميل..." : "تحميل المزيد"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <ActivitiesBody access={access} />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
