import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
};

function baseUrl(): string | null {
  const b =
    process.env.DASM_PLATFORM_API_URL || process.env.NEXT_PUBLIC_PLATFORM_API_URL;
  return b?.replace(/\/$/, "") || null;
}

/**
 * قائمة المسارات المسموح بها عبر BFF proxy.
 * مبدأ: أقل الصلاحيات — نفتح فقط ما يحتاجه الكنترول روم.
 */
function isPathAllowed(subPath: string, method: string): boolean {
  // الموافقات (القديمة)
  if (subPath.startsWith("admin/approval-requests")) return true;
  if (subPath.startsWith("admin/approval-group")) return method === "GET";

  // السيارات المعلقة + الإدارة
  if (subPath.startsWith("admin/cars")) return true;

  // المراقبة الحية
  if (subPath.startsWith("admin/monitoring")) return true;
  if (subPath.startsWith("admin/live-auctions")) return method === "GET";
  if (subPath.startsWith("admin/auctions")) return method === "GET";
  if (subPath.startsWith("admin/bids/events")) return method === "GET";
  if (subPath.startsWith("admin/sessions")) return method === "GET";

  // الأنشطة والسجلات (قراءة فقط)
  if (subPath.startsWith("admin/platform-activities")) return method === "GET";
  if (subPath.startsWith("admin/activity-logs")) return method === "GET";
  if (subPath.startsWith("admin/audit-logs")) return method === "GET";

  // المستخدمون — قراءة وإجراءات تشغيلية فقط. الحذف محصور في لوحة DASM Core.
  if (subPath.startsWith("admin/users")) {
    if (method === "GET") return true;
    if (method === "POST" && /^admin\/users\/\d+\/(activate|reject|toggle-status)$/.test(subPath)) return true;
    return false;
  }

  if (method === "POST" && /^admin\/dealers\/\d+\/approve-verification$/.test(subPath)) return true;
  if (method === "POST" && /^admin-panel\/users\/\d+\/verify-email$/.test(subPath)) return true;

  // آراء المستخدمين (Control Room inbox)
  if (subPath.startsWith("admin/platform-feedback")) return true;

  // بروفايل المستخدم الحالي
  if (subPath === "user/profile") return method === "GET";

  // المتاجر الإلكترونية
  if (subPath.startsWith("admin/ecommerce")) return true;
  if (subPath.startsWith("admin/stores")) return true;

  // متاجر داسم الجديدة (Storefront SaaS)
  if (subPath.startsWith("stores/public")) return method === "GET";
  if (subPath.startsWith("stores/my-store")) return true;

  // الشحن والفحص — مراقبة
  if (subPath.startsWith("admin/shipments")) return method === "GET";
  if (subPath.startsWith("admin/inspections")) return method === "GET";

  // التنبيهات الذكية والتقارير
  if (subPath.startsWith("admin/alerts")) return true;
  if (subPath.startsWith("admin/reports") && method === "GET") return true;
  if (subPath.startsWith("admin/analytics") && method === "GET") return true;

  // اتخاذ قرارات الاعتدال
  if (subPath.startsWith("admin/moderation")) return true;

  // شركاء النمو
  if (subPath.startsWith("admin/growth-partners")) return true;

  // شرائح العمولات (قراءة + حساب)
  if (subPath.startsWith("admin/commission-tiers")) return true;

  // الأدوار والصلاحيات
  if (subPath.startsWith("admin/roles")) return method === "GET";
  if (subPath.startsWith("admin/permissions")) return method === "GET";
  if (subPath.startsWith("admin/staff")) return method === "GET";

  // SSO verify (لتبادل التوكن)
  if (subPath === "sso/verify") return method === "POST";

  // Session 29 — Stream chat + config + video sources
  if (subPath.startsWith("streams/")) return method === "GET"; // public read
  if (subPath.startsWith("moderator/streams/")) return true;   // moderator write

  // Session 30 — Broadcast listing (for stream management index)
  if (subPath.startsWith("admin/all-broadcasts")) return method === "GET";
  if (subPath === "admin/broadcast") return method === "GET";

  return false;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const segments = req.query.path;
  if (!segments || !Array.isArray(segments)) {
    return res.status(400).json({ message: "مسار غير صالح" });
  }

  const auth = req.headers.authorization;
  if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "يجب تسجيل الدخول" });
  }

  const base = baseUrl();
  if (!base) {
    return res.status(500).json({ message: "تكوين خادم المنصة غير مكتمل" });
  }

  const subPath = segments.join("/");
  if (!isPathAllowed(subPath, req.method || "GET")) {
    return res.status(403).json({ message: "المسار غير مسموح عبر الوكيل" });
  }

  const urlObj = new URL(req.url || "", "http://localhost");
  const search = urlObj.search || "";
  const targetUrl = `${base}/api/${subPath}${search}`;

  const headers: Record<string, string> = {
    Authorization: auth,
    Accept: "application/json",
  };

  /** يُمرَّر مع approve/reject لتمييز مصدر القرار في DASM (audit) */
  const isApprovalDecisionPost =
    req.method === "POST" &&
    (subPath.endsWith("/approve") || subPath.endsWith("/reject"));
  if (isApprovalDecisionPost) {
    headers["X-Decision-Source"] = "bff_admin_panel";
  }

  const ct = req.headers["content-type"];
  if (
    ct &&
    req.method !== "GET" &&
    req.method !== "HEAD"
  ) {
    headers["Content-Type"] = Array.isArray(ct) ? ct[0] : ct;
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (req.body === undefined || req.body === null) {
      init.body = "{}";
    } else if (typeof req.body === "string") {
      init.body = req.body;
    } else {
      init.body = JSON.stringify(req.body);
    }
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const text = await upstream.text();
    const upstreamCt = upstream.headers.get("content-type") || "";

    res.status(upstream.status);

    if (upstreamCt.includes("application/json")) {
      try {
        return res.json(JSON.parse(text));
      } catch {
        return res.send(text);
      }
    }
    return res.send(text);
  } catch (e) {
    console.error("[dasm-proxy]", e);
    return res.status(502).json({ message: "تعذر الاتصال بخدمة المنصة" });
  }
}
