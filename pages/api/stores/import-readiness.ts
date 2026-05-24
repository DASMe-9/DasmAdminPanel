import type { NextApiRequest, NextApiResponse } from "next";

/**
 * GET /api/stores/import-readiness — Salla/Shopify env + schema (+ optional pilot slug)
 * BFF → DASM Platform GET /api/admin/stores/import-readiness
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "يجب تسجيل الدخول" });

  const base = process.env.DASM_PLATFORM_API_URL || process.env.NEXT_PUBLIC_PLATFORM_API_URL;
  if (!base) return res.status(500).json({ message: "تكوين خادم المنصة غير مكتمل" });

  const params = new URLSearchParams();
  const slug = req.query.slug;
  if (typeof slug === "string" && slug.trim() !== "") {
    params.set("slug", slug.trim());
  }

  const qs = params.toString();
  const url = `${base.replace(/\/$/, "")}/api/admin/stores/import-readiness${qs ? `?${qs}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: auth,
      },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    return res.status(500).json({ success: false, message });
  }
}
