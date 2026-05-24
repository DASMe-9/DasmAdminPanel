import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  LayoutGrid,
  ClipboardList,
  Radio,
  AlertTriangle,
  Activity,
  ShoppingBag,
  FileText,
  Users,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  Zap,
  Shield,
  Car,
  Gavel,
  Handshake,
  Tv2,
  Bell,
  UserCog,
  Settings,
  BarChart2,
  Youtube,
  DollarSign,
  Building,
  ShieldAlert,
  Code2,
  Clock,
  Calendar,
  ScrollText,
  HeartPulse,
  TestTube,
  Key,
  CreditCard,
  TrendingUp,
  Calculator,
  ArrowDownUp,
  BarChart3,
  Tags,
  MessageSquare,
  Mail,
  ExternalLink,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ControlRoomAccessLevel } from "./ControlRoomGate";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  fullOnly?: boolean; // يظهر فقط لـ full access
  external?: boolean; // يفتح في داسم الأم
}

const DASM_BASE = "https://www.dasm.com.sa";
const DASM_ADS_DASHBOARD_URL = "https://dasme-ads-laravel.vercel.app/dashboard";

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  // ─── القيادة المركزية ───
  {
    title: "القيادة المركزية",
    items: [
      { href: "/admin/control-room/command-center", label: "مركز القيادة", icon: Shield },
      { href: "/admin/control-room", label: "لوحة المراقبة", icon: LayoutGrid },
      { href: "/admin/control-room/monitoring", label: "المراقبة الحية", icon: Radio },
    ],
  },
  // ─── العمليات ───
  {
    title: "العمليات",
    items: [
      { href: "/admin/control-room/approval-requests", label: "طابور الموافقات", icon: ClipboardList },
      { href: "/admin/control-room/activities", label: "سجل الأنشطة", icon: Activity },
      { href: "/admin/control-room/smart-alerts", label: "التنبيهات الذكية", icon: AlertTriangle },
    ],
  },
  // ─── المستخدمون والصلاحيات ───
  {
    title: "المستخدمون والصلاحيات",
    items: [
      { href: "/admin/control-room/users", label: "إدارة المستخدمين", icon: Users, fullOnly: true },
      { href: `${DASM_BASE}/admin/users/status`, label: "حالة المستخدمين", icon: Activity, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/venue-owners`, label: "ملاك المعارض", icon: Building, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/groups`, label: "إدارة القروبات", icon: Users, fullOnly: true, external: true },
    ],
  },
  // ─── السيارات والمزادات ───
  {
    title: "السيارات والمزادات",
    items: [
      { href: `${DASM_BASE}/admin/cars`, label: "السيارات", icon: Car, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/auctions`, label: "المزادات", icon: Gavel, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/pending-approvals`, label: "القوائم المعلقة", icon: Clock, fullOnly: true, external: true },
    ],
  },
  // ─── الجلسات والبث ───
  {
    title: "الجلسات والبث",
    items: [
      { href: "/admin/control-room/stream-management", label: "إدارة شات البث", icon: MessageSquare },
      { href: `${DASM_BASE}/admin/sessions`, label: "إدارة الجلسات", icon: Calendar, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/live-stream`, label: "إدارة البث", icon: Tv2, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/youtube-channels`, label: "قنوات YouTube", icon: Youtube, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/live-market-staging`, label: "تغذية الحراج المباشر", icon: Radio, fullOnly: true, external: true },
      { href: `${DASM_BASE}/auctions/auctions-1main/live-market`, label: "الحراج المباشر", icon: Radio, fullOnly: true, external: true },
      { href: `${DASM_BASE}/auctions/auctions-1main`, label: "محرك المزاد الرباعي", icon: Calendar, fullOnly: true, external: true },
    ],
  },
  // ─── متاجر داسم ───
  {
    title: "متاجر داسم",
    items: [
      { href: "/admin/control-room/stores", label: "مراقبة المتاجر", icon: ShoppingBag },
      { href: "/admin/control-room/ecommerce", label: "إحصائيات المتاجر", icon: ShoppingBag },
    ],
  },
  // ─── المدونة ومجلس السوق ───
  {
    title: "المحتوى والمجلس",
    items: [
      { href: `${DASM_BASE}/admin/blog/posts`, label: "المقالات", icon: FileText, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/blog/categories`, label: "تصنيفات المدونة", icon: Tags, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/market-council/permissions`, label: "صلاحيات مجلس السوق", icon: Shield, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/newsletter-subscribers`, label: "النشرة البريدية", icon: Mail, fullOnly: true, external: true },
    ],
  },
  // ─── السجلات والمراقبة ───
  {
    title: "السجلات والمراقبة",
    items: [
      { href: `${DASM_BASE}/admin/bids-logs`, label: "سجلات المزايدات", icon: ScrollText, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/activity-logs`, label: "سجلات النشاط", icon: FileText, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/auction-activity-log`, label: "سجل المزادات الفوري", icon: ScrollText, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/monitoring`, label: "مراقبة الإنتاج", icon: HeartPulse, fullOnly: true, external: true },
    ],
  },
  // ─── التقارير والإعدادات ───
  {
    title: "التقارير والإعدادات",
    items: [
      { href: DASM_ADS_DASHBOARD_URL, label: "لوحة الإعلانات", icon: TrendingUp, fullOnly: true, external: true },
      { href: "/reports", label: "التقارير", icon: BarChart2, fullOnly: true },
      { href: `${DASM_BASE}/similar-price-analysis`, label: "تحليل الأسعار المشابهة", icon: BarChart3, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/security`, label: "مركز الأمان", icon: ShieldAlert, fullOnly: true, external: true },
      { href: `${DASM_BASE}/admin/regions`, label: "المناطق", icon: Settings, fullOnly: true, external: true },
    ],
  },
];

interface Props {
  children: React.ReactNode;
  access: ControlRoomAccessLevel;
}

export default function ControlRoomShell({ children, access }: Props) {
  const router = useRouter();
  const { user, isAdmin, isModerator, isOperator, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("dasm-admin-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextIsDark = stored ? stored === "dark" : prefersDark;
    setIsDark(nextIsDark);
    document.documentElement.classList.toggle("dark", nextIsDark);
  }, []);

  const toggleTheme = () => {
    setIsDark((current) => {
      const next = !current;
      localStorage.setItem("dasm-admin-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  const handleLogout = async () => {
    await logout({ redirectToLogin: true });
  };

  const isActive = (href: string) =>
    router.pathname === href || router.asPath === href;

  const roleBadge = isAdmin
    ? { label: "أدمن", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200" }
    : isModerator
    ? { label: "مشرف", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200" }
    : isOperator
    ? { label: "مشغّل", color: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200" }
    : { label: "مراجع", color: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300" };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* الشعار */}
      <div className="px-4 py-5 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-base text-gray-900 dark:text-white">الكنترول روم</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">داسم — مركز القيادة</p>
          </div>
        </div>
      </div>

      {/* المستخدم */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-slate-200 shrink-0">
            {user?.first_name?.[0] ?? user?.name?.[0] ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 dark:text-slate-100 truncate">
              {user?.first_name
                ? `${user.first_name} ${user.last_name ?? ""}`.trim()
                : user?.name ?? user?.email}
            </p>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${roleBadge.color}`}>
              {roleBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* القائمة */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.fullOnly || access === "full"
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title} className="mb-1">
              <p className="cr-nav-group-title">{group.title}</p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = !item.external && isActive(item.href);
                  const linkClass = `cr-nav-link ${
                    active ? "cr-nav-link-active" : "cr-nav-link-idle"
                  }`;

                  if (item.external) {
                    return (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClass}
                        >
                          <Icon className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500" />
                          <span className="flex-1 truncate">{item.label}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-gray-300 dark:text-slate-600" />
                        </a>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={linkClass}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-600 dark:text-blue-200" : "text-gray-400 dark:text-slate-500"}`} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* الأسفل */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-slate-800 space-y-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {isDark ? "الوضع النهاري" : "الوضع الليلي"}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition dark:text-red-300 dark:hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          تسجيل خروج
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen cr-shell-bg text-gray-950 rtl flex transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar ديسكتوب */}
      <aside className="hidden md:flex flex-col w-72 cr-sidebar shrink-0 sticky top-0 h-screen overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        <SidebarContent />
      </aside>

      {/* Sidebar موبايل overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl z-50 dark:bg-slate-900">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <span className="font-bold text-sm text-gray-900 dark:text-white">القائمة</span>
              <button type="button" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* شريط علوي موبايل */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30 dark:bg-slate-900 dark:border-slate-800">
          <button type="button" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>
          <span className="font-bold text-sm text-gray-900 dark:text-white">الكنترول روم</span>
          <div className="w-5" />
        </header>

        {/* breadcrumb */}
        <div className="hidden md:flex items-center gap-1 px-6 py-3.5 text-sm text-slate-500 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400">
          <span>الكنترول روم</span>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-slate-800 font-semibold dark:text-slate-200">
            {NAV_GROUPS.flatMap((g) => g.items).find((i) => isActive(i.href))?.label ?? "الرئيسية"}
          </span>
        </div>

        {/* المحتوى */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export { ControlRoomShell };
