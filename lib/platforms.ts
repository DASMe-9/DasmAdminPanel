/**
 * تكوين مركزي لكل منصات داسم
 * الكنترول روم = مصدر الحقيقة الوحيد للمراقبة والإدارة
 */

export interface Platform {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  url: string;
  apiUrl: string;
  status: "connected" | "pending" | "offline";
  description: string;
}

export const PLATFORMS: Platform[] = [
  {
    id: "dasm",
    name: "داسم الرئيسية",
    nameEn: "DASM Platform",
    icon: "🏛️",
    color: "blue",
    url: "https://www.dasm.com.sa",
    apiUrl: "https://api.dasm.com.sa",
    status: "connected",
    description: "منصة المزادات والتداول — المنصة الأم",
  },
  {
    id: "stores",
    name: "متاجر داسم",
    nameEn: "DASM Stores",
    icon: "🏪",
    color: "emerald",
    url: "https://store.dasm.com.sa",
    apiUrl: "https://api.dasm.com.sa",
    status: "connected",
    description: "Storefront SaaS — متاجر إلكترونية للمعارض والتجار",
  },
  {
    id: "shipping",
    name: "شحن داسم",
    nameEn: "DASM Shipping",
    icon: "🚚",
    color: "purple",
    url: "https://shipping.dasm.com.sa",
    apiUrl: "https://api.dasm.com.sa",
    status: "connected",
    description: "إدارة الشحن والتوصيل",
  },
  {
    id: "inspection",
    name: "فحص داسم",
    nameEn: "DASM Inspection",
    icon: "🔍",
    color: "orange",
    url: "https://dasm-inspection.vercel.app",
    apiUrl: "https://api.dasm.com.sa",
    status: "connected",
    description: "الفحص الفني للمركبات",
  },
  {
    id: "control",
    name: "الكنترول روم",
    nameEn: "Control Room",
    icon: "🛡️",
    color: "slate",
    url: "https://control.dasm.com.sa",
    apiUrl: "https://api.dasm.com.sa",
    status: "connected",
    description: "مركز القيادة والمراقبة المركزي",
  },
];

/** روابط سريعة لكل المنصات الداخلية */
export const INTERNAL_LINKS = {
  // داسم الرئيسية
  dasmAdmin: "https://www.dasm.com.sa/admin",
  dasmControlRoom: "https://control.dasm.com.sa/admin/control-room",
  dasmSecurityCenter: "https://www.dasm.com.sa/admin/security",
  dasmMonitoring: "https://www.dasm.com.sa/admin/monitoring",

  // المتاجر
  storesExplore: "https://store.dasm.com.sa/explore",
  storesDashboard: "https://store.dasm.com.sa/dashboard",

  // الشحن
  shippingDashboard: "https://shipping.dasm.com.sa",

  // الفحص
  inspectionDashboard: "https://dasm-inspection.vercel.app",

  // خارجي
  github: "https://github.com/DASMe-9",
  vercel: "https://vercel.com/dasme-projects",
  render: "https://dashboard.render.com",
  supabase: "https://supabase.com/dashboard/project/ttkhiatwayvlfksvehzm",
  cloudflare: "https://dash.cloudflare.com",
};
