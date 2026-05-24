import Link from "next/link";
import { LayoutGrid, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardHero() {
  const { user, isAdmin, isModerator, isProgrammer } = useAuth();

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.name ?? user?.email ?? "فريق داسم";

  const roleLabel = isAdmin
    ? "مدير النظام"
    : isModerator
    ? "مشرف العمليات"
    : isProgrammer
    ? "فريق التقنية"
    : "مراجع تشغيلي";

  return (
    <section className="cr-hero">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_#fff_0,_transparent_45%)] pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-2">
          <p className="text-sm md:text-base text-blue-100/90 font-medium">
            مرحباً، {displayName}
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            لوحة المراقبة المركزية
          </h1>
          <p className="text-sm md:text-base text-blue-100/80 max-w-xl leading-relaxed">
            {roleLabel} — راقب المزادات، الموافقات، المتاجر، والبث من نقطة واحة
            موثوقة مرتبطة بـ{" "}
            <span className="font-semibold text-white">api.dasm.com.sa</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/admin/control-room/monitoring"
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-semibold backdrop-blur transition"
          >
            <LayoutGrid className="h-4 w-4" />
            المراقبة الحية
          </Link>
          <Link
            href="/admin/control-room/command-center"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-blue-800 hover:bg-blue-50 px-4 py-2.5 text-sm font-bold shadow-sm transition"
          >
            <Shield className="h-4 w-4" />
            مركز القيادة
          </Link>
        </div>
      </div>
    </section>
  );
}
