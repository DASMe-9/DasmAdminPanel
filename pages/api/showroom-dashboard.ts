import type { NextApiRequest, NextApiResponse } from "next";

/**
 * GET /api/showroom-dashboard — بروكسي لبيانات المعرض الحقيقية (لا بيانات MAZ001 وهمية).
 * يتطلب Bearer token لحساب venue_owner على منصة DASM.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
  }

  const base =
    process.env.DASM_PLATFORM_API_URL || process.env.NEXT_PUBLIC_PLATFORM_API_URL;
  if (!base) {
    return res.status(500).json({ success: false, error: "تكوين خادم المنصة غير مكتمل" });
  }

  const apiBase = base.replace(/\/$/, "");
  const headers = {
    Accept: "application/json",
    Authorization: auth,
  };

  try {
    const [profileRes, walletRes] = await Promise.all([
      fetch(`${apiBase}/api/exhibitor/profile`, { headers }),
      fetch(`${apiBase}/api/exhibitor/wallet`, { headers }),
    ]);

    const profileJson = await profileRes.json().catch(() => ({}));
    const walletJson = await walletRes.json().catch(() => ({}));

    if (!profileRes.ok) {
      return res.status(profileRes.status).json({
        success: false,
        error: profileJson?.message || "تعذّر جلب بيانات المعرض",
      });
    }

    const profile = profileJson?.data ?? {};
    const wallet = walletJson?.data ?? {};
    const venueId = profile?.id ?? profile?.venue_id ?? profile?.slug ?? "unknown";

    const showroomData = {
      showroom_id: String(venueId),
      showroom_name: profile?.venue_name ?? profile?.name ?? "",
      owner_name: profile?.owner_name ?? profile?.contact_name ?? "",
      contact: {
        phone: profile?.phone ?? profile?.contact_phone ?? "",
        email: profile?.email ?? "",
      },
      wallet_balance: wallet?.balance_sar ?? wallet?.balance ?? 0,
      subscription_plan: profile?.subscription_plan ?? null,
      stats: profile?.stats ?? {
        listed_cars: profile?.listed_cars_count ?? 0,
        sold_cars: profile?.sold_cars_count ?? 0,
        live_auctions: profile?.live_auctions_count ?? 0,
        pending_approvals: profile?.pending_approvals_count ?? 0,
        views_last_30_days: profile?.views_last_30_days ?? 0,
      },
      rating: profile?.rating ?? { average: 0, total_reviews: 0, distribution: {} },
      reviews: profile?.reviews ?? [],
      cars: profile?.cars ?? [],
      transactions: profile?.recent_transactions ?? [],
      actions: {
        upload_new_car: `/exhibitor/all-cars`,
        edit_car: `/exhibitor/all-cars`,
        withdraw_balance: `/exhibitor/wallet`,
        renew_subscription: `/exhibitor/subscription`,
        view_reports: `/exhibitor/accounting`,
      },
      _source: "dasm-platform-api",
    };

    return res.status(200).json({ success: true, data: showroomData });
  } catch (error) {
    console.error("showroom-dashboard proxy error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch showroom data",
    });
  }
}
