import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import CrPageHeader from "@/components/control-room/CrPageHeader";
import {
  buildStatusSessionsParams,
  formatDt,
  presenceBadgeClass,
  roleLabel,
  type AdminUserStatusSessionRow,
} from "@/lib/admin-user-status-sessions";

function PresenceIcon({ label }: { label: string }) {
  if (label === "داخل الآن") return <Wifi className="h-3.5 w-3.5 shrink-0" />;
  if (label === "خامل") return <Clock className="h-3.5 w-3.5 shrink-0" />;
  return <WifiOff className="h-3.5 w-3.5 shrink-0" />;
}

function displayName(u: AdminUserStatusSessionRow) {
  const n = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return n || u.email || `#${u.id}`;
}

function UsersStatusBody({ access }: { access: ControlRoomAccessLevel }) {
  const [rows, setRows] = useState<AdminUserStatusSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const searchTimer = useRef<number | null>(null);

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [search]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildStatusSessionsParams({
        page: p,
        perPage: 25,
        search: debouncedSearch,
        statusFilter,
        roleFilter,
        sessionStatusFilter: sessionFilter,
      });
      const res = await dasmBff.get("admin/users/status-sessions", { params });
      const root = res.data;
      if (root?.status === "error") {
        throw new Error(root.message ?? "خطأ من الخادم");
      }
      const paginator = root?.data ?? root;
      const data = Array.isArray(paginator?.data) ? paginator.data : [];
      setRows(data as AdminUserStatusSessionRow[]);
      setLastPage(typeof paginator?.last_page === "number" ? paginator.last_page : 1);
      setTotal(typeof paginator?.total === "number" ? paginator.total : data.length);
      setPage(p);
    } catch (e: unknown) {
      const msg =
        (e as { message?: string })?.message ??
        "تعذر تحميل حالة المستخدمين — تحقق من صلاحية users.view وتطبيق migration الجلسات";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, roleFilter, sessionFilter]);

  useEffect(() => {
    if (access !== "full") return;
    void load(1);
  }, [access, debouncedSearch, statusFilter, roleFilter, sessionFilter, load]);

  if (access !== "full") {
    return (
      <div className="cr-alert-warning max-w-2xl">
        حالة المستخدمين والجلسات متاحة لمدير النظام والمشرفين فقط.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <CrPageHeader
        icon={Activity}
        title="حالة المستخدمين والجلسات"
        subtitle="Observability تشغيلي — presence، IP مختصر، الجلسات الأخيرة (DASM Core)"
        actions={
          <>
            <Link
              href="/admin/control-room/users"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              قائمة الحسابات
            </Link>
            <button
              type="button"
              onClick={() => void load(page)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </>
        }
      />

      <div className="cr-filter-bar flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، البريد، الهاتف…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="فلتر الحالة الإدارية"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="pending">معلق (أعمال)</option>
          <option value="rejected">مرفوض</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="فلتر الدور"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">كل الأدوار</option>
          <option value="user">مستخدم</option>
          <option value="dealer">تاجر</option>
          <option value="venue_owner">معرض</option>
          <option value="admin">مدير</option>
        </select>
        <select
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          aria-label="فلتر الجلسة"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">كل الجلسات</option>
          <option value="online">داخل الآن</option>
          <option value="idle">خامل</option>
          <option value="offline">خارج</option>
        </select>
        <span className="text-xs text-slate-500">{total} مستخدم</span>
      </div>

      {error ? <p className="cr-alert-error">{error}</p> : null}

      <div className="cr-table-wrap">
        {loading && rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">جاري تحميل الحالة التشغيلية…</p>
        ) : rows.length === 0 ? (
          <p className="cr-empty m-4">لا توجد نتائج.</p>
        ) : (
          <table className="w-full min-w-[900px] text-sm text-right">
            <thead className="cr-table-head">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">المستخدم</th>
                <th className="px-4 py-3 font-semibold">الدور</th>
                <th className="px-4 py-3 font-semibold">Presence</th>
                <th className="px-4 py-3 font-semibold">آخر نشاط</th>
                <th className="px-4 py-3 font-semibold">الجهاز / IP</th>
                <th className="px-4 py-3 font-semibold">جلسات</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const so = u.session_observability;
                const open = expandedId === u.id;
                return (
                  <Fragment key={u.id}>
                    <tr key={u.id} className="cr-table-row">
                      <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{displayName(u)}</p>
                        <p className="text-xs text-slate-500">{u.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{roleLabel(u.type)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${presenceBadgeClass(so?.presence_label_ar ?? "")}`}
                        >
                          <PresenceIcon label={so?.presence_label_ar ?? ""} />
                          {so?.presence_label_ar ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDt(so?.last_seen_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <p>{so?.device_browser_label ?? "—"}</p>
                        <p className="font-mono">{so?.ip_masked ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{so?.open_sessions_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(open ? null : u.id)}
                          className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1"
                        >
                          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          الجلسات
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr key={`${u.id}-sessions`} className="bg-slate-50/80 dark:bg-slate-900/40">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-600">
                              آخر دخول: {formatDt(so?.last_login_at)} · خروج: {formatDt(so?.last_logout_at)} ·{" "}
                              {so?.session_kind_label_ar}
                            </p>
                            {(so?.recent_sessions ?? []).length === 0 ? (
                              <p className="text-xs text-slate-400">لا توجد جلسات مسجّلة.</p>
                            ) : (
                              <ul className="grid gap-2 md:grid-cols-2">
                                {so.recent_sessions.slice(0, 4).map((s) => (
                                  <li
                                    key={s.id}
                                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs"
                                  >
                                    <p className="font-mono text-slate-500">{s.session_key.slice(0, 12)}…</p>
                                    <p>{s.device_browser_label}</p>
                                    <p>{s.location_label} · {s.ip_masked}</p>
                                    <p className="text-slate-400">
                                      {formatDt(s.started_at)} → {s.is_open ? "مفتوحة" : formatDt(s.ended_at)}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700"
          >
            السابق
          </button>
          <span className="text-sm text-slate-500">
            صفحة {page} من {lastPage}
          </span>
          <button
            type="button"
            disabled={page >= lastPage || loading}
            onClick={() => void load(page + 1)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

export default function ControlRoomUsersStatusPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <UsersStatusBody access={access} />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
