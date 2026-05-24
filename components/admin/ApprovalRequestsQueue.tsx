import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import { CrButton } from "@/components/ui/cr-button";
import { CrInput } from "@/components/ui/cr-input";
import CrPageHeader from "@/components/control-room/CrPageHeader";
import { toast } from "react-hot-toast";
import {
  useApprovalCapabilities,
  resolveApprovalDecisionCaps,
} from "@/hooks/useApprovalCapabilities";

type TargetUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  type?: string;
};

type ApprovalRow = {
  id: number;
  request_type: string;
  status: string;
  payload?: Record<string, unknown> | null;
  notes?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  resolution_seconds?: number | null;
  resolution_duration_human?: string | null;
  target_user?: TargetUser | null;
  reviewed_by?: { first_name?: string; last_name?: string; email?: string } | null;
};

function summaryForRow(row: ApprovalRow): string {
  if (row.request_type === "business_account") {
    const p = row.payload || {};
    const name =
      (p.company_or_venue_name as string) ||
      [row.target_user?.first_name, row.target_user?.last_name]
        .filter(Boolean)
        .join(" ");
    const reg = p.commercial_registry as string | undefined;
    const at = p.account_type as string | undefined;
    return [at, name, reg ? `سجل: ${reg}` : null].filter(Boolean).join(" — ");
  }
  if (row.request_type === "council_permission") {
    const b = (row.payload?.bundle as string) || "";
    return `حزمة صلاحيات: ${b}`;
  }
  return row.request_type;
}

export default function ApprovalRequestsQueue() {
  const { caps, loading: capsLoading, error: capsErr, refresh: refreshCaps } =
    useApprovalCapabilities();
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setListErr(null);
    try {
      const params: Record<string, string | number> = { per_page: 50 };
      if (statusFilter.trim()) params.status = statusFilter.trim();
      const res = await dasmBff.get("admin/approval-requests", { params });
      const paginated = res.data?.data;
      setRows(paginated?.data ?? []);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      let msg = "تعذر تحميل الطلبات من المنصة.";
      if (status === 401) {
        msg = "انتهت الجلسة أو غير مصرّح — يرجى تسجيل الدخول مجدداً.";
      } else if (status === 403) {
        msg = "لا تملك صلاحية عرض طابور الموافقات.";
      }
      setListErr(msg);
      toast.error(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const act = async (id: number, action: "approve" | "reject") => {
    try {
      const notes = rejectNotes[id]?.trim() || undefined;
      if (action === "reject") {
        await dasmBff.post(`admin/approval-requests/${id}/reject`, {
          notes,
        });
      } else {
        await dasmBff.post(`admin/approval-requests/${id}/approve`);
      }
      toast.success(action === "approve" ? "تمت الموافقة" : "تم الرفض");
      setRejectNotes((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
      await loadRows();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "تعذر تنفيذ الإجراء";
      toast.error(msg);
    }
  };

  const decision = resolveApprovalDecisionCaps(caps);

  const canAct = (row: ApprovalRow) => {
    if (!caps?.can_access_queue) return false;
    if (row.status !== "pending") return false;
    if (row.request_type === "business_account")
      return decision.canApproveBusiness;
    if (row.request_type === "council_permission")
      return decision.canApproveCouncil;
    return false;
  };

  if (capsLoading) {
    return (
      <p className="text-gray-500 text-sm rtl">جاري التحقق من الصلاحيات...</p>
    );
  }

  if (capsErr) {
    return (
      <div className="cr-alert-error p-6 rtl space-y-3">
        <p>{capsErr}</p>
        <CrButton type="button" variant="outline" onClick={() => refreshCaps()}>
          إعادة المحاولة
        </CrButton>
      </div>
    );
  }

  if (caps && !caps.can_access_queue) {
    return (
      <div className="cr-alert-warning p-6 rtl space-y-2">
        <p className="font-semibold">لا يمكنك الوصول إلى طابور الموافقات</p>
        <p className="text-sm">
          يجب أن يمنحك DASM صلاحية{" "}
          <code className="text-xs bg-amber-100 px-1 rounded">can_access_queue</code>{" "}
          (مثلاً عبر عضوية مجموعة الموافقات).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rtl">
      <CrPageHeader
        icon={ClipboardCheck}
        title="طابور الموافقات التشغيلي"
        subtitle="المصدر: DASM فقط — لا توجد بيانات محلية للقرارات أو البريد."
        actions={
          <CrButton type="button" variant="outline" onClick={() => void loadRows()}>
            تحديث
          </CrButton>
        }
      />

      <div className="cr-filter-bar">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">تصفية بالحالة (إن وُجدت)</label>
          <select
            aria-label="تصفية حسب حالة الطلب"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm min-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">الكل</option>
            <option value="pending">معلّق</option>
            <option value="approved">موافق</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>
        <CrButton
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => void loadRows()}
        >
          تطبيق
        </CrButton>
      </div>

      {listErr ? <div className="cr-alert-error">{listErr}</div> : null}

      {loading ? (
        <p className="text-slate-500 text-sm">جاري التحميل...</p>
      ) : (
        <div className="cr-table-wrap">
          <table className="w-full text-sm text-right min-w-[900px]">
            <thead className="cr-table-head">
              <tr>
                <th className="p-3 font-semibold">#</th>
                <th className="p-3 font-semibold">النوع</th>
                <th className="p-3 font-semibold">المستخدم</th>
                <th className="p-3 font-semibold">ملخص</th>
                <th className="p-3 font-semibold">الحالة</th>
                <th className="p-3 font-semibold">المدة</th>
                <th className="p-3 font-semibold">التاريخ</th>
                <th className="p-3 font-semibold">المراجع</th>
                <th className="p-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="cr-table-row align-top"
                >
                  <td className="p-3">{row.id}</td>
                  <td className="p-3 whitespace-nowrap">{row.request_type}</td>
                  <td className="p-3">
                    <div className="font-medium text-gray-900">
                      {[row.target_user?.first_name, row.target_user?.last_name]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {row.target_user?.email}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {row.target_user?.type}
                    </div>
                  </td>
                  <td className="p-3 max-w-[240px]">
                    <span className="break-words">{summaryForRow(row)}</span>
                    {row.notes ? (
                      <div className="text-xs text-gray-500 mt-1">
                        ملاحظات: {row.notes}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">{row.status}</td>
                  <td className="p-3 text-xs text-gray-600 whitespace-nowrap">
                    {row.status !== "pending" && row.resolution_duration_human
                      ? row.resolution_duration_human
                      : "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs text-gray-600">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString("ar-SA")
                      : "—"}
                  </td>
                  <td className="p-3 text-xs text-gray-800">
                    {row.reviewed_by
                      ? [
                          row.reviewed_by.first_name,
                          row.reviewed_by.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      : "—"}
                  </td>
                  <td className="p-3 space-y-2 min-w-[220px]">
                    <Link
                      href={`/admin/control-room/approval-requests/${row.id}`}
                      className="inline-flex items-center justify-center w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
                    >
                      مراجعة كاملة والسجل
                    </Link>
                    {row.status === "pending" && canAct(row) ? (
                      <>
                        <CrInput
                          placeholder="ملاحظات الرفض (اختياري)"
                          value={rejectNotes[row.id] || ""}
                          onChange={(e) =>
                            setRejectNotes((m) => ({
                              ...m,
                              [row.id]: e.target.value,
                            }))
                          }
                          className="h-8 text-xs"
                        />
                        <div className="flex flex-wrap gap-2">
                          <CrButton
                            type="button"
                            size="sm"
                            className="h-8"
                            onClick={() => act(row.id, "approve")}
                          >
                            موافقة سريعة
                          </CrButton>
                          <CrButton
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-8"
                            onClick={() => act(row.id, "reject")}
                          >
                            رفض سريع
                          </CrButton>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs block">
                        {row.status !== "pending"
                          ? "—"
                          : "لا صلاحية قرار على هذا النوع"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 ? (
            <p className="p-6 text-center text-gray-500 text-sm">
              لا توجد طلبات مطابقة.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
