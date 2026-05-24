import type { NextApiRequest, NextApiResponse } from "next";

/** POST /api/stores/orders/[id]/status — تحديث حالة الطلب */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "يجب تسجيل الدخول" });

  const base = process.env.DASM_PLATFORM_API_URL || process.env.NEXT_PUBLIC_PLATFORM_API_URL;
  if (!base) return res.status(500).json({ message: "تكوين خادم المنصة غير مكتمل" });

  const id = req.query.id;
  if (!id || Array.isArray(id)) return res.status(400).json({ message: "معرّف الطلب مطلوب" });

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/admin/store-orders/${id}/status`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(req.body ?? {}),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    return res.status(500).json({ success: false, message });
  }
}
