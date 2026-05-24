import type { NextApiRequest, NextApiResponse } from "next";

/** GET /api/stores/orders/list — طلبات المتاجر (BFF → Laravel admin/store-orders) */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "يجب تسجيل الدخول" });

  const base = process.env.DASM_PLATFORM_API_URL || process.env.NEXT_PUBLIC_PLATFORM_API_URL;
  if (!base) return res.status(500).json({ message: "تكوين خادم المنصة غير مكتمل" });

  const params = new URLSearchParams();
  for (const key of ["status", "payment_status", "store_id", "search", "from", "to", "page", "per_page", "channel"] as const) {
    const v = req.query[key];
    if (v && typeof v === "string") params.set(key, v);
  }

  try {
    const url = `${base.replace(/\/$/, "")}/api/admin/store-orders?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: auth },
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    return res.status(500).json({ success: false, message });
  }
}
