import type { NextApiRequest, NextApiResponse } from "next";

/**
 * POST /api/stores/action — { storeId, action: "suspend" | "activate" }
 * يمر عبر DASM API بدل Supabase المباشر (SAMA compliance).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "يجب تسجيل الدخول" });

  const { storeId, action } = req.body as { storeId: number; action: string };
  if (!storeId || !action) return res.status(400).json({ message: "storeId و action مطلوبان" });

  const base = process.env.DASM_PLATFORM_API_URL || process.env.NEXT_PUBLIC_PLATFORM_API_URL;
  if (!base) return res.status(500).json({ message: "تكوين خادم المنصة غير مكتمل" });

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/admin/stores/${storeId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": auth,
      },
      body: JSON.stringify({ action }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
