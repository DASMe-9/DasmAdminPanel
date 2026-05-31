import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  Users,
  Activity,
  ShieldOff,
  XCircle,
} from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
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
  email_verified_at?: string | null;
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
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<UsersMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<number | null>(null);
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

  const updateUserInList = (updated: UserRow) => {
    setUsers((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
  };

  const handleVerifyEmail = async (u: UserRow) => {
    if (!u.email) {
      toast.error("لا يوجد بريد إلكتروني لهذا المستخدم");
      return;
    }
    const ok = window.confirm(`توثيق بريد "${u.email}" يدوياً؟`);
    if (!ok) return;

    setProcessingId(u.id);
    try {
      await dasmBff.post(`admin-panel/users/${u.id}/verify-email`);
      updateUserInList({ ...u, email_verified_at: new Date().toISOString() });
      toast.success("تم توثيق البريد");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "تعذر توثيق البريد";
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleStatus = async (u: UserRow) => {
    if (u.type === "super_admin") {
      toast.error("حساب super_admin محمي");
      return;
    }
    const next = !u.is_active;
    const ok = window.confirm(`${next ? "تفعيل" : "تعطيل"} المستخدم #${u.id} (${displayName(u)})؟`);
    if (!ok) return;

    setProcessingId(u.id);
    try {
      await dasmBff.post(`admin/users/${u.id}/toggle-status`, { is_active: next });
      updateUserInList({
        ...u,
        is_active: next,
        status: next ? "active" : "rejected",
      });
      toast.success(next ? "تم تفعيل المستخدم" : "تم تعطيل المستخدم");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "تعذر تغيير حالة المستخدم";
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecision = async (u: UserRow, action: "activate" | "reject") => {
    if (u.type === "super_admin") return;
    const ok = window.confirm(`${action === "activate" ? "اعتماد" : "رفض"} المستخدم #${u.id} (${displayName(u)})؟`);
    if (!ok) return;

    setProcessingId(u.id);
    try {
      await dasmBff.post(`admin/users/${u.id}/${action}`);
      await loadUsers(page);
      toast.success(action === "activate" ? "تم اعتماد المستخدم" : "تم رفض المستخدم");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "تعذر تنفيذ الإجراء";
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveDealerVerification = async (u: UserRow) => {
    setProcessingId(u.id);
    try {
      await dasmBff.post(`admin/dealers/${u.id}/approve-verification`);
      await loadUsers(page);
      toast.success("تم اعتماد التحقق للتاجر");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "تعذر اعتماد التحقق";
      toast.error(msg);
    } finally {
      setProcessingId(null);
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
        subtitle="قراءة وتصفية وإجراءات تشغيلية من DASM Core — الحذف محصور في لوحة داسم الرئيسية"
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
                <th className="px-4 py-3 font-semibold">إجراء</th>
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a
                        href={`${DASM_BASE}/admin/users/${u.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        title="عرض التفاصيل في لوحة داسم"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        عرض
                      </a>

                      {!u.email_verified_at ? (
                        <button
                          type="button"
                          disabled={processingId === u.id}
                          onClick={() => void handleVerifyEmail(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-500/40 dark:text-blue-200 dark:hover:bg-blue-500/10"
                          title="توثيق البريد يدوياً"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          توثيق
                        </button>
                      ) : null}

                      {u.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            disabled={processingId === u.id}
                            onClick={() => void handleDecision(u, "activate")}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                            title="اعتماد المستخدم"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            اعتماد
                          </button>
                          <button
                            type="button"
                            disabled={processingId === u.id}
                            onClick={() => void handleDecision(u, "reject")}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10"
                            title="رفض المستخدم"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            رفض
                          </button>
                        </>
                      ) : null}

                      {u.type === "dealer" && u.status === "pending" ? (
                        <button
                          type="button"
                          disabled={processingId === u.id}
                          onClick={() => void handleApproveDealerVerification(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-500/40 dark:text-indigo-200 dark:hover:bg-indigo-500/10"
                          title="اعتماد تحقق التاجر"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          تحقق
                        </button>
                      ) : null}

                      {u.type !== "super_admin" ? (
                        <button
                          type="button"
                          disabled={processingId === u.id}
                          onClick={() => void handleToggleStatus(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/10"
                          title={u.is_active ? "تعطيل المستخدم" : "تفعيل المستخدم"}
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          {u.is_active ? "تعطيل" : "تفعيل"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">محمي</span>
                      )}
                    </div>
                  </td>
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
