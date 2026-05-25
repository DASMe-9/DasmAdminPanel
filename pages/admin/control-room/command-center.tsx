import Head from "next/head";
import { RefreshCw, Shield } from "lucide-react";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import { ControlRoomGate } from "@/components/control-room/ControlRoomGate";
import CrPageHeader from "@/components/control-room/CrPageHeader";
import PlatformPulseBar from "@/components/control-room/PlatformPulseBar";
import CrInfrastructureStrip from "@/components/control-room/CrInfrastructureStrip";
import CrLiveOpsSnapshot from "@/components/control-room/CrLiveOpsSnapshot";
import { INTERNAL_LINKS, PLATFORMS } from "@/lib/platforms";
import { usePlatformHealth } from "@/hooks/usePlatformHealth";

const QUICK_LINKS = [
  { label: "لوحة أدمن داسم", href: INTERNAL_LINKS.dasmAdmin, icon: "🏛️", tone: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-200" },
  { label: "غرفة التحكم (داسم)", href: INTERNAL_LINKS.dasmControlRoom, icon: "🎛️", tone: "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200" },
  { label: "مركز الأمان", href: INTERNAL_LINKS.dasmSecurityCenter, icon: "🔒", tone: "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-200" },
  { label: "المراقبة الحية", href: "/admin/control-room/monitoring", icon: "📡", tone: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200" },
  { label: "متاجر داسم", href: INTERNAL_LINKS.storesExplore, icon: "🏪", tone: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200" },
  { label: "لوحة الشحن", href: INTERNAL_LINKS.shippingDashboard, icon: "🚚", tone: "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-200" },
  { label: "لوحة الفحص", href: INTERNAL_LINKS.inspectionDashboard, icon: "🔍", tone: "bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-200" },
  { label: "GitHub", href: INTERNAL_LINKS.github, icon: "🐙", tone: "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200" },
  { label: "Vercel", href: INTERNAL_LINKS.vercel, icon: "▲", tone: "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200" },
  { label: "Render", href: INTERNAL_LINKS.render, icon: "🖥️", tone: "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200" },
  { label: "Cloudflare", href: INTERNAL_LINKS.cloudflare, icon: "☁️", tone: "bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-200" },
];

function CommandCenterBody() {
  const { health, loading, refresh, onlineCount, total } = usePlatformHealth();
  const lastRefresh = new Date();

  const getHealth = (id: string) => health.find((h) => h.id === id);

  const statusDot = (id: string) => {
    const s = getHealth(id)?.status;
    if (s === "online") return "bg-emerald-500 animate-pulse";
    if (s === "degraded") return "bg-amber-400";
    if (s === "offline") return "bg-red-500";
    return "bg-slate-300 animate-pulse";
  };

  return (
    <div className="space-y-6 rtl max-w-7xl">
      <CrPageHeader
        variant="hero"
        icon={Shield}
        title="مركز القيادة المركزي"
        subtitle="مراقبة جميع منصات داسم — مصدر الحقيقة الوحيد للحالة التشغيلية"
        meta={
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-sm font-semibold">
            {loading ? "جاري الفحص…" : `${onlineCount} / ${total} منصات متصلة`}
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        }
        footer={
          <p className="text-xs text-blue-100/80">
            آخر تحديث: {lastRefresh.toLocaleTimeString("ar-SA")}
          </p>
        }
      />

      <PlatformPulseBar showCommandLink={false} />
      <CrInfrastructureStrip />
      <CrLiveOpsSnapshot />

      <section className="cr-panel">
        <h2 className="cr-section-title mb-4">روابط سريعة — لوحات المراقبة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("/") ? undefined : "_blank"}
              rel={link.href.startsWith("/") ? undefined : "noopener noreferrer"}
              className={`cr-quick-link ${link.tone}`}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </a>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.filter((p) => p.id !== "control").map((platform) => (
          <section key={platform.id} className="cr-panel">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{platform.icon}</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{platform.name}</h3>
              <span className={`w-2 h-2 rounded-full ${statusDot(platform.id)}`} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{platform.description}</p>
            {platform.id === "dasm" && (
              <div className="space-y-2 text-xs">
                {[
                  { href: "/admin/control-room/monitoring", label: "📡 المراقبة الحية" },
                  { href: "/admin/control-room/auctions", label: "⚖️ إدارة المزادات" },
                  { href: "/admin/control-room/live-stream", label: "📺 إدارة البث" },
                  { href: "/admin/control-room/approval-requests", label: "✅ طابور الموافقات" },
                  { href: "/admin/control-room/user-feedback", label: "💬 آراء المستخدمين" },
                  { href: "/admin/control-room/users-status", label: "👥 حالة الجلسات" },
                  { href: "/admin/control-room/activities", label: "📋 سجل العمليات" },
                  { href: "/admin/control-room/smart-alerts", label: "🤖 التنبيهات الذكية" },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                  >
                    <span>{item.label}</span>
                    <span className="text-slate-400">→</span>
                  </a>
                ))}
              </div>
            )}
            {platform.id === "stores" && (
              <div className="space-y-2 text-xs">
                <a href="/admin/control-room/stores" className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60">
                  <span>🏪 إدارة المتاجر</span><span className="text-slate-400">→</span>
                </a>
                <a href="/admin/control-room/ecommerce" className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60">
                  <span>📊 إحصائيات التجارة</span><span className="text-slate-400">→</span>
                </a>
              </div>
            )}
            {(platform.id === "shipping" || platform.id === "inspection") && (
              <a
                href={
                  platform.id === "shipping"
                    ? INTERNAL_LINKS.shippingDashboard
                    : INTERNAL_LINKS.inspectionDashboard
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs dark:bg-slate-800/60"
              >
                <span>{platform.id === "shipping" ? "📦 لوحة الشحن" : "🔧 لوحة الفحص"}</span>
                <span>↗</span>
              </a>
            )}
          </section>
        ))}
      </div>

      <section className="rounded-2xl bg-slate-900 p-6 text-white dark:ring-1 dark:ring-slate-700">
        <h2 className="text-sm font-bold mb-3">بنية منظومة داسم</h2>
        <pre className="font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{`┌─────────────────────────────────────────────────────┐
│           الكنترول روم (أنت هنا)                    │
│         control.dasm.com.sa — مركز القيادة          │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│ داسم     │ متاجر    │ شحن      │ فحص      │ بث      │
├──────────┴──────────┴──────────┴──────────┴─────────┤
│              API Layer (api.dasm.com.sa)             │
├─────────────────────────────────────────────────────┤
│        PostgreSQL · Render (Backend) · Vercel       │
└─────────────────────────────────────────────────────┘`}</pre>
      </section>
    </div>
  );
}

export default function CommandCenterPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <Head>
            <title>مركز القيادة — الكنترول روم</title>
          </Head>
          <CommandCenterBody />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
