import type { NextApiRequest, NextApiResponse } from "next";

/** GET /api/stores/orders/export — CSV export (BFF → Laravel admin/store-orders/export) */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "يجب تسجيل الدخول" });

  const base = process.env.DASM_PLATFORM_API_URL || process.env.NEXT_PUBLIC_PLATFORM_API_URL;
  if (!base) return res.status(500).json({ message: "تكوين خادم المنصة غير مكتمل" });

  const params = new URLSearchParams();
  for (const key of ["status", "payment_status", "store_id", "search", "from", "to", "channel", "limit"] as const) {
    const v = req.query[key];
    if (v && typeof v === "string") params.set(key, v);
  }

  try {
    const url = `${base.replace(/\/$/, "")}/api/admin/store-orders/export?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/csv", Authorization: auth },
    });

    if (!response.ok) {
      const errBody = await response.text();
      try {
        return res.status(response.status).json(JSON.parse(errBody));
      } catch {
        return res.status(response.status).json({ message: errBody || "فشل التصدير" });
      }
    }

    const csv = await response.text();
    const disposition =
      response.headers.get("Content-Disposition") ??
      `attachment; filename="dasm-orders-${new Date().toISOString().slice(0, 10)}.csv"`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", disposition);
    return res.status(200).send(csv);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    return res.status(500).json({ success: false, message });
  }
}
