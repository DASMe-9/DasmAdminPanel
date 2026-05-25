import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  RefreshCw,
  Search,
  Users,
  Activity,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import { useAuth } from "@/hooks/useAuth";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import CrPageHeader from "@/components/control-room/CrPageHeader";
import { roleLabel } from "@/lib/admin-user-status-sessions";
import { toast } from "react-hot-toast";

const DASM_BASE = "https://www.dasm.com.sa";

type UserRow = {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  type?: string;
  status?: string;
  is_active?: boolean;
  created_at?: string;
};

type UsersMeta = {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

function displayName(u: UserRow) {
  const n = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  if (n) return n;
  if (u.name) return u.name;
  return "—";
}

function extractList(payload: unknown): UserRow[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (Array.isArray(data)) return data as UserRow[];
  if (data && typeof data === "object") {
    const nested = (data as Record<string, unknown>).data;
    if (Array.isArray(nested)) return nested as UserRow[];
  }
  return [];
}

function extractMeta(payload: unknown): UsersMeta | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as Record<string, unknown>).data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as UsersMeta;
  }
  return null;
}

function UsersBody({ access }: { access: ControlRoomAccessLevel }) {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<UsersMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  const loadUsers = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: p,
        per_page: 20,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await dasmBff.get("admin/users", { params });
      const body = res.data?.data ?? res.data;
      setUsers(extractList(body ?? res.data));
      setMeta(extractMeta(body ?? res.data));
      setPage(p);
    } catch {
      setError("تعذر تحميل قائمة المستخدمين. تحقق من الصلاحية users.view.");
      setUsers([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    if (access !== "full") return;
    void loadUsers(1);
  }, [access, loadUsers]);

  const handleDelete = async (u: UserRow) => {
    if (!isSuperAdmin) return;
    if (u.type === "super_admin") {
      toast.error("لا يمكن حذف مدير النظام الرئيسي");
      return;
    }
    const ok = window.confirm(
      `حذف المستخدم #${u.id} (${displayName(u)})؟\n\nهذا إجراء نهائي — متاح لـ super_admin فقط.`
    );
    if (!ok) return;

    setDeletingId(u.id);
    try {
      await dasmBff.delete(`admin/users/${u.id}`);
      toast.success("تم حذف المستخدم");
      await loadUsers(page);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "تعذر حذف المستخدم";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  if (access !== "full") {
    return (
      <div className="cr-alert-warning max-w-2xl">
        إدارة المستخدمين متاحة لمدير النظام والمشرفين فقط.
      </div>
    );
  }

  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? users.length;

  return (
    <div className="space-y-6 max-w-7xl">
      <CrPageHeader
        icon={Users}
        title="إدارة المستخدمين"
        subtitle="قراءة وتصفية من DASM Core — الحذف لـ super_admin فقط"
        actions={
          <>
            <Link
              href="/admin/control-room/users-status"
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
            >
              <Activity className="h-4 w-4" />
              حالة الجلسات
            </Link>
            <a
              href={`${DASM_BASE}/admin/users`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ExternalLink className="h-4 w-4" />
              لوحة داسم الكاملة
            </a>
            <button
              type="button"
              onClick={() => void loadUsers(page)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </>
        }
      />

      {isSuperAdmin && (
        <div className="cr-alert-warning flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            حذف الحسابات متاح لـ <strong>super_admin</strong> فقط ويمر عبر BFF إلى DASM Core مع{" "}
            <code className="text-xs">super_admin.guard</code>.
          </span>
        </div>
      )}

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
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="فلتر النوع"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">كل الأنواع</option>
          <option value="user">مستخدم</option>
          <option value="dealer">تاجر</option>
          <option value="venue_owner">معرض</option>
          <option value="admin">مدير</option>
          <option value="moderator">مشرف</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="فلتر الحالة"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="pending">معلق</option>
          <option value="rejected">مرفوض</option>
          <option value="suspended">موقوف</option>
        </select>
        <span className="text-xs text-slate-500">{total} مستخدم</span>
      </div>

      {error ? <p className="cr-alert-error">{error}</p> : null}

      <div className="cr-table-wrap">
        {loading && users.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">جاري تحميل المستخدمين…</p>
        ) : users.length === 0 ? (
          <p className="cr-empty m-4">لا توجد نتائج مطابقة.</p>
        ) : (
          <table className="w-full min-w-[860px] text-sm text-right">
            <thead className="cr-table-head">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">البريد</th>
                <th className="px-4 py-3 font-semibold">النوع</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">التسجيل</th>
                {isSuperAdmin ? <th className="px-4 py-3 font-semibold">إجراء</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="cr-table-row">
                  <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    {displayName(u)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{roleLabel(u.type)}</td>
                  <td className="px-4 py-3 text-xs">{u.status ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("ar-SA") : "—"}
                  </td>
                  {isSuperAdmin ? (
                    <td className="px-4 py-3">
                      {u.type !== "super_admin" ? (
                        <button
                          type="button"
                          disabled={deletingId === u.id}
                          onClick={() => void handleDelete(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === u.id ? "…" : "حذف"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">محمي</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => void loadUsers(page - 1)}
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
            onClick={() => void loadUsers(page + 1)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700"
          >
            التالي
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        للتعديل، التفعيل، أو إعادة تعيين كلمة المرور:{" "}
        <Link
          href={`${DASM_BASE}/admin/users`}
          target="_blank"
          className="text-blue-600 hover:underline dark:text-blue-300"
        >
          لوحة إدارة المستخدمين في داسم ↗
        </Link>
        {" · "}
        <Link href="/admin/control-room/users-status" className="text-blue-600 hover:underline dark:text-blue-300">
          حالة الجلسات والـ presence
        </Link>
      </p>
    </div>
  );
}

export default function ControlRoomUsersPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <UsersBody access={access} />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
