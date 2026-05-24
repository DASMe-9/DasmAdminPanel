import dasmBff from "@/lib/dasmBffClient";

export type DashboardStats = {
  pending_cars: number;
  live_auctions: number;
  pending_approvals: number;
  open_alerts: number;
  active_sessions: number;
};

function unwrapData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.data && typeof root.data === "object") return root.data as T;
  return root as T;
}

function readTotal(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const root = payload as Record<string, unknown>;
  const meta = root.meta as Record<string, unknown> | undefined;
  if (meta && typeof meta.total === "number") return meta.total;
  const data = root.data;
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (typeof nested.total === "number") return nested.total;
  }
  return 0;
}

const EMPTY: DashboardStats = {
  pending_cars: 0,
  live_auctions: 0,
  pending_approvals: 0,
  open_alerts: 0,
  active_sessions: 0,
};

/** يجمع مؤشرات لوحة المراقبة من endpoints حقيقية (لا overview وهمي). */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const settled = await Promise.allSettled([
    dasmBff.get("admin/cars/stats"),
    dasmBff.get("admin/auctions/stats"),
    dasmBff.get("admin/approval-requests", {
      params: { status: "pending", per_page: 1 },
    }),
    dasmBff.get("admin/alerts", { params: { status: "open", per_page: 1 } }),
    dasmBff.get("admin/sessions/stats"),
  ]);

  const next = { ...EMPTY };

  if (settled[0].status === "fulfilled") {
    const cars = unwrapData<{ pending?: number }>(settled[0].value.data);
    next.pending_cars = Number(cars?.pending ?? 0);
  }

  if (settled[1].status === "fulfilled") {
    const auctions = unwrapData<{ active?: number }>(settled[1].value.data);
    next.live_auctions = Number(auctions?.active ?? 0);
  }

  if (settled[2].status === "fulfilled") {
    next.pending_approvals = readTotal(settled[2].value.data);
  }

  if (settled[3].status === "fulfilled") {
    next.open_alerts = readTotal(settled[3].value.data);
  }

  if (settled[4].status === "fulfilled") {
    const sessions = unwrapData<{ active?: number }>(settled[4].value.data);
    next.active_sessions = Number(sessions?.active ?? 0);
  }

  return next;
}
