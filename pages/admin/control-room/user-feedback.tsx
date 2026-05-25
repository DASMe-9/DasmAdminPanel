import { useCallback, useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Star } from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import CrPageHeader from "@/components/control-room/CrPageHeader";
import { toast } from "react-hot-toast";

type FeedbackRow = {
  id: number;
  body: string;
  rating?: number | null;
  name?: string | null;
  email?: string | null;
  status: string;
  source?: string;
  admin_notes?: string | null;
  created_at: string;
  user?: { id: number; first_name?: string; last_name?: string; email?: string } | null;
};

function FeedbackBody({ access }: { access: ControlRoomAccessLevel }) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { per_page: "50" };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await dasmBff.get("admin/platform-feedback", { params });
      const paginator = res.data?.data ?? res.data;
      const data = Array.isArray(paginator?.data) ? paginator.data : [];
      setRows(data as FeedbackRow[]);
    } catch {
      toast.error("تعذر تحميل آراء المستخدمين");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    if (access !== "full") return;
    void load();
  }, [access, load]);

  const updateRow = async (id: number, patch: { status?: string; admin_notes?: string }) => {
    try {
      await dasmBff.patch(`admin/platform-feedback/${id}`, patch);
      toast.success("تم التحديث");
      await load();
    } catch {
      toast.error("تعذر تحديث الرأي");
    }
  };

  if (access !== "full") {
    return <div className="cr-alert-warning max-w-2xl">آراء المستخدمين للطاقم الإداري فقط.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <CrPageHeader
        icon={MessageSquare}
        title="آراء واقتراحات المستخدمين"
        subtitle="يُستقبل من الصفحة الرئيسية — مراجعة يدوية من Control Room"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        }
      />

      <div className="cr-filter-bar flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="فلتر الحالة"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="pending">قيد المراجعة</option>
          <option value="reviewed">تمت المراجعة</option>
          <option value="archived">مؤرشف</option>
          <option value="all">الكل</option>
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في النص أو البريد…"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-w-[200px] dark:border-slate-700 dark:bg-slate-900"
        />
        <span className="text-xs text-slate-500">{rows.length} رأي</span>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-sm text-slate-500 p-8 text-center">جاري التحميل…</p>
      ) : rows.length === 0 ? (
        <div className="cr-empty">لا توجد آراء في هذا الفلتر.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="cr-panel space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">
                    {row.name || row.user?.email || "زائر"} · #{row.id}
                  </p>
                  <p className="text-xs text-slate-500">{row.email ?? row.user?.email ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {row.rating ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {row.rating}/5
                    </span>
                  ) : null}
                  <span className="text-xs rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
                    {row.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {row.body}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(row.created_at).toLocaleString("ar-SA")} · {row.source ?? "homepage"}
              </p>
              <textarea
                value={notesDraft[row.id] ?? row.admin_notes ?? ""}
                onChange={(e) => setNotesDraft((m) => ({ ...m, [row.id]: e.target.value }))}
                rows={2}
                placeholder="ملاحظات الإدارة…"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void updateRow(row.id, {
                      status: "reviewed",
                      admin_notes: notesDraft[row.id] ?? row.admin_notes ?? undefined,
                    })
                  }
                  className="text-xs font-semibold rounded-lg bg-emerald-600 text-white px-3 py-1.5"
                >
                  تمت المراجعة
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void updateRow(row.id, {
                      status: "archived",
                      admin_notes: notesDraft[row.id] ?? row.admin_notes ?? undefined,
                    })
                  }
                  className="text-xs font-semibold rounded-lg border border-slate-200 px-3 py-1.5"
                >
                  أرشفة
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserFeedbackPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <FeedbackBody access={access} />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
