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
      <div className="relative space-y-2">
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
    </section>
  );
}
