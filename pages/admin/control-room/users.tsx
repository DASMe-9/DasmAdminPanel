import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, Search, Users } from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import CrPageHeader from "@/components/control-room/CrPageHeader";

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
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const searchTimer = useRef<number | null>(null);

  const loadUsers = useCallback(async (p = 1, query = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await dasmBff.get("admin/users", {
        params: {
          page: p,
          per_page: 20,
          ...(query.trim() ? { q: query.trim() } : {}),
        },
      });
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
  }, []);

  useEffect(() => {
    if (access !== "full") return;
    void loadUsers(1, "");
  }, [access, loadUsers]);

  useEffect(() => {
    if (access !== "full") return;
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      void loadUsers(1, q);
    }, 400);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [q, access, loadUsers]);

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
        subtitle="قراءة من DASM Core عبر BFF — للتعديل الكامل استخدم لوحة داسم الإدارية"
        actions={
          <>
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
              onClick={() => void loadUsers(page, q)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </>
        }
      />

      <div className="cr-filter-bar">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم، البريد، أو رقم المستخدم…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{total} مستخدم</span>
      </div>

      {error ? <p className="cr-alert-error">{error}</p> : null}

      <div className="cr-table-wrap">
        {loading && users.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">جاري تحميل المستخدمين…</p>
        ) : users.length === 0 ? (
          <p className="cr-empty m-4">لا توجد نتائج مطابقة.</p>
        ) : (
          <table className="w-full min-w-[760px] text-sm text-right">
            <thead className="cr-table-head">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">البريد</th>
                <th className="px-4 py-3 font-semibold">النوع</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">التسجيل</th>
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
                  <td className="px-4 py-3 text-xs">{u.type ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{u.status ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString("ar-SA")
                      : "—"}
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
            onClick={() => void loadUsers(page - 1, q)}
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
            onClick={() => void loadUsers(page + 1, q)}
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
