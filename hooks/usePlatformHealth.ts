import { useCallback, useEffect, useState } from "react";
import { PLATFORMS } from "@/lib/platforms";

export type HealthStatus = "online" | "degraded" | "offline" | "checking";

export type PlatformHealth = {
  id: string;
  status: HealthStatus;
  latency?: number;
};

async function probePlatform(
  p: (typeof PLATFORMS)[number]
): Promise<PlatformHealth> {
  const start = Date.now();
  try {
    const endpoint =
      p.id === "control"
        ? p.url
        : `${p.apiUrl.replace(/\/$/, "")}/api/health`;
    const resp = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    return {
      id: p.id,
      status: resp.ok ? "online" : "degraded",
      latency: Date.now() - start,
    };
  } catch {
    return { id: p.id, status: "offline", latency: Date.now() - start };
  }
}

export function usePlatformHealth(intervalMs = 60_000) {
  const [health, setHealth] = useState<PlatformHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const external = PLATFORMS.filter((p) => p.id !== "control");
    const results = await Promise.all(external.map(probePlatform));
    setHealth(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), intervalMs);
    return () => window.clearInterval(id);
  }, [refresh, intervalMs]);

  const onlineCount = health.filter((h) => h.status === "online").length;

  return { health, loading, refresh, onlineCount, total: health.length };
}
