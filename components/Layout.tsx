import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import {
  HomeIcon,
  UserGroupIcon,
  VideoCameraIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  UserPlusIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  MegaphoneIcon,
  BellIcon,
  Bars3Icon,
  ChevronLeftIcon,
  SparklesIcon,
  CreditCardIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';

import { clearSession, getSession, getUser, getUserDisplayName, isExpired } from '../utils/authStorage';

const DASM_ADS_DASHBOARD_URL = 'https://dasme-ads-laravel.vercel.app/dashboard';

export default function Layout({ title, children }: any) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  const navigation = useMemo(
    () => [
      { name: 'الكنترول روم', href: '/admin/control-room', icon: HomeIcon },
      { name: 'السيارات', href: '/cars', icon: TruckIcon },
      { name: 'إدارة السيارات', href: '/car-management', icon: WrenchScrewdriverIcon },
      { name: 'المستخدمين', href: '/users', icon: UserGroupIcon },
      { name: 'إدارة الموظفين', href: '/employees', icon: UserPlusIcon },
      { name: 'تأمين بلس', href: '/insurance-plus', icon: ShieldCheckIcon },
      { name: 'المتاجر الإلكترونية', href: '/showroom-dashboard', icon: BuildingStorefrontIcon },
      { name: 'Buyer-to-Seller Broadcast', href: '/broadcast', icon: MegaphoneIcon },
      { name: 'Seller-to-Buyer Broadcast', href: '/seller-broadcast', icon: MegaphoneIcon },
      { name: 'عروض مخصصة', href: '/buyer-notifications', icon: BellIcon },
      { name: 'إدارة البث', href: '/live-stream', icon: VideoCameraIcon },
      { name: 'المزادات', href: '/auctions', icon: CurrencyDollarIcon },
      { name: 'قنوات YouTube', href: '/youtube-channels', icon: VideoCameraIcon },
      { name: 'شركاء النمو (Mr.20%)', href: '/growth-partners', icon: SparklesIcon },
      { name: 'الباقات والأسعار', href: '/subscriptions', icon: CreditCardIcon },
      { name: 'خصومات المؤسسين', href: '/subscriptions/founder-discounts', icon: GiftIcon },
      { name: 'لوحة الإعلانات', href: DASM_ADS_DASHBOARD_URL, icon: MegaphoneIcon, external: true },
      { name: 'التقارير', href: '/reports', icon: ChartBarIcon },
      { name: 'الإعدادات', href: '/settings', icon: Cog6ToothIcon },
    ],
    []
  );

  const currentTitle =
    navigation.find((item) => item.href === router.pathname)?.name || title || 'لوحة التحكم';

  const user = getUser();
  const userName = getUserDisplayName(user);

  useEffect(() => {
    const path = router.pathname;
    if (path === '/login' || path === '/auth/login') {
      setReady(true);
      return;
    }

    const s = getSession();
    const u = getUser();

    // قبول توكن platformAuthStore ('token') في كل الصفحات
    if (typeof window !== 'undefined') {
      const platformToken = localStorage.getItem('token');
      if (platformToken) {
        setReady(true);
        return;
      }
    }

    if (!s || !u || isExpired(s)) {
      clearSession();
      router.replace(`/auth/login?returnUrl=${encodeURIComponent(router.asPath)}`);
      return;
    }

    const userType = (u.type || '').toLowerCase();
    if (userType !== 'super_admin') {
      clearSession();
      router.replace(`/auth/login?returnUrl=${encodeURIComponent(router.asPath)}`);
      return;
    }

    setReady(true);
  }, [router.pathname, router.asPath]);

  const isActive = (href: string) => router.pathname === href;

  const SidebarContent = (
    <div className="h-full flex flex-col bg-white border-l border-gray-100">
      <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold">D</span>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-gray-900">DASM</div>
              <div className="text-xs text-gray-500">Admin Panel</div>
            </div>
          )}
        </div>

        <button
          className="hidden md:inline-flex p-2 rounded-xl hover:bg-gray-50 transition"
          onClick={() => setCollapsed((v) => !v)}
          aria-label="collapse sidebar"
        >
          <ChevronLeftIcon className={`h-5 w-5 text-gray-500 transition ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-700 font-bold">
                {(userName || 'U').slice(0, 1).toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">{userName || '—'}</div>
                <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-3 pb-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const active = !item.external && isActive(item.href);
            const linkClassName = [
              'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
              active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50',
            ].join(' ');
            const iconClassName = ['h-5 w-5', active ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'].join(' ');
            if (item.external) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className={linkClassName}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={iconClassName} />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </a>
              );
            }
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={linkClassName}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={iconClassName} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-gray-100">
        <Link
          href="/logout"
          className="flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
        >
          <span>خروج</span>
        </Link>
      </div>
    </div>
  );

  if (!ready) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-6 py-4 text-sm text-gray-600">
          جاري التحميل...
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <Head>
        <title>{currentTitle}</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="h-screen flex">
        <div className={`hidden md:block ${collapsed ? 'w-20' : 'w-72'} transition-all duration-200`}>
          {SidebarContent}
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] shadow-2xl">
              {SidebarContent}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100">
            <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden p-2 rounded-xl hover:bg-gray-50 transition"
                  onClick={() => setMobileOpen(true)}
                  aria-label="open menu"
                >
                  <Bars3Icon className="h-6 w-6 text-gray-700" />
                </button>

                <div>
                  <div className="text-lg font-extrabold text-gray-900">{currentTitle}</div>
                  <div className="text-xs text-gray-500">لوحة التحكم</div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-gray-50 border border-gray-100 px-3 py-2">
                  <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-700 font-bold">
                      {(userName || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-bold text-gray-900 max-w-[200px] truncate">{userName || '—'}</div>
                    <div className="text-xs text-gray-500 max-w-[200px] truncate">{user?.email || ''}</div>
                  </div>
                </div>

                <Link
                  href="/logout"
                  className="inline-flex items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                >
                  خروج
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-4 sm:p-6">
                {children}
              </div>
            </div>
          </main>

          <footer className="px-4 sm:px-6 py-3 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} DASM
          </footer>
        </div>
      </div>
    </div>
  );
}
