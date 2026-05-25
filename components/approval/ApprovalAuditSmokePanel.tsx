import Link from "next/link";
import { ScrollText } from "lucide-react";

const SMOKE_STEPS = [
  "فتح طابور الموافقات بدون 403",
  "عرض تفاصيل طلب pending + سجل التدقيق",
  "approve/reject حسب الصلاحية",
  "التحقق من request_approved/rejected في السجل",
];

export default function ApprovalAuditSmokePanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ScrollText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-white">مسار smoke — سجل التدقيق (#209–#215)</p>
            <p className="text-xs text-slate-500 mt-1">
              كل قرار يُسجَّل في <code className="text-[11px] bg-white dark:bg-slate-800 px-1 rounded">approval_request_logs</code>{" "}
              — افتح تفاصيل أي طلب لعرض timeline كامل.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
              {SMOKE_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
        <a
          href="https://github.com/DASMe-platform/DASM-Platform/blob/master/docs/operations/CONTROL_ROOM_APPROVAL_SMOKE_PATH.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
        >
          الدليل الكامل ↗
        </a>
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        مصدر القرار من Control Room يُميَّز في audit عبر{" "}
        <code>X-Decision-Source: bff_admin_panel</code>
      </p>
    </section>
  );
}
