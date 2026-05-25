import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, TrendingUp, Zap, Shield, Eye } from "lucide-react";
import dasmBff from "@/lib/dasmBffClient";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import CrPageHeader from "@/components/control-room/CrPageHeader";
import CrKpiCard from "@/components/control-room/CrKpiCard";

type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";

type SmartAlert = {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: string;
  status: "open" | "acknowledged" | "resolved";
  ai_score?: number;        // نسبة ثقة AI 0-100
  affected_entity?: string; // مثل: user_id, auction_id
  created_at: string;
  resolved_at?: string;
};

type AiInsight = {
  id: string;
  type: "anomaly" | "trend" | "recommendation";
  title: string;
  body: string;
  confidence: number;
  generated_at: string;
};

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bg: string }> = {
  critical: { label: "حرج", color: "text-red-700", bg: "bg-red-100" },
  high: { label: "عالي", color: "text-orange-700", bg: "bg-orange-100" },
  medium: { label: "متوسط", color: "text-amber-700", bg: "bg-amber-100" },
  low: { label: "منخفض", color: "text-blue-700", bg: "bg-blue-100" },
  info: { label: "معلومة", color: "text-gray-600", bg: "bg-gray-100" },
};

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  access,
}: {
  alert: SmartAlert;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  access: ControlRoomAccessLevel;
}) {
  const cfg = SEVERITY_CONFIG[alert.severity];

  return (
    <div className={`cr-panel space-y-3 ${alert.severity === "critical" ? "ring-1 ring-red-200 dark:ring-red-500/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${cfg.bg}`}>
            <AlertTriangle className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{alert.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{alert.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
          {alert.ai_score !== undefined && (
            <span className="text-xs text-gray-400">ثقة AI: {alert.ai_score}%</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(alert.created_at).toLocaleString("ar-SA")}
          </span>
          {alert.affected_entity && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {alert.affected_entity}
            </span>
          )}
          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{alert.category}</span>
        </div>

        {alert.status === "open" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAcknowledge(alert.id)}
              className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            >
              تأكيد الاستلام
            </button>
            {access === "full" && (
              <button
                type="button"
                onClick={() => onResolve(alert.id)}
                className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" />
                حلّ
              </button>
            )}
          </div>
        )}
        {alert.status === "acknowledged" && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">تم الاستلام</span>
        )}
        {alert.status === "resolved" && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            محلول
          </span>
        )}
      </div>
    </div>
  );
}

function SmartAlertsBody({ access }: { access: ControlRoomAccessLevel }) {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"open" | "all" | "insights">("open");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dasmBff.get("admin/monitoring/summary");
      const root = res.data?.data ?? res.data ?? {};

      const rawAlerts = [
        ...(Array.isArray(root.active_alerts) ? root.active_alerts : []),
        ...(Array.isArray(root.recent_alerts) ? root.recent_alerts : []),
      ] as Array<Record<string, unknown>>;

      const seen = new Set<number>();
      const mapped: SmartAlert[] = [];
      for (const a of rawAlerts) {
        const id = Number(a.id);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const severity = String(a.severity ?? "medium") as AlertSeverity;
        const statusRaw = String(a.status ?? "active");
        mapped.push({
          id: String(id),
          title: String(a.title_ar ?? a.alert_type ?? "تنبيه"),
          description: String(a.reason_ar ?? ""),
          severity: ["critical", "high", "medium", "low", "info"].includes(severity)
            ? severity
            : "medium",
          category: String(a.alert_type ?? "monitoring"),
          status:
            statusRaw === "active"
              ? "open"
              : statusRaw === "acknowledged"
              ? "acknowledged"
              : statusRaw === "resolved"
              ? "resolved"
              : "open",
          created_at: String(a.started_at ?? a.last_seen_at ?? new Date().toISOString()),
        });
      }
      setAlerts(mapped);

      const incidents = Array.isArray(root.incidents) ? root.incidents : [];
      const hints = Array.isArray(root.correlation_hints) ? root.correlation_hints : [];
      const triage = root.guided_triage;
      const derived: AiInsight[] = [];

      for (const inc of incidents.slice(0, 5)) {
        derived.push({
          id: `inc-${String((inc as Record<string, unknown>).at ?? derived.length)}`,
          type: "anomaly",
          title: String((inc as Record<string, unknown>).message_ar ?? "حادث"),
          body: `مستوى: ${String((inc as Record<string, unknown>).level ?? "—")}`,
          confidence: 90,
          generated_at: String((inc as Record<string, unknown>).at ?? new Date().toISOString()),
        });
      }
      for (const h of hints.slice(0, 3)) {
        derived.push({
          id: `hint-${derived.length}`,
          type: "recommendation",
          title: String((h as Record<string, unknown>).title_ar ?? "تلميح تشغيلي"),
          body: String((h as Record<string, unknown>).detail_ar ?? ""),
          confidence: 75,
          generated_at: new Date().toISOString(),
        });
      }
      if (triage && typeof triage === "object") {
        derived.push({
          id: "triage",
          type: "recommendation",
          title: "توجيه triage",
          body: String((triage as Record<string, unknown>).summary_ar ?? JSON.stringify(triage)),
          confidence: 80,
          generated_at: new Date().toISOString(),
        });
      }
      setInsights(derived);
    } catch {
      // keep state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await dasmBff.post("admin/monitoring/alert-action", {
        alert_id: Number(alertId),
        action: "acknowledge",
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "acknowledged" as const } : a))
      );
    } catch {
      alert("فشل تأكيد الاستلام");
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await dasmBff.post("admin/monitoring/alert-action", {
        alert_id: Number(alertId),
        action: "resolve",
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "resolved" as const } : a))
      );
    } catch {
      alert("فشل إغلاق التنبيه");
    }
  };

  const openAlerts = alerts.filter((a) => a.status === "open");
  const criticalCount = alerts.filter((a) => a.severity === "critical" && a.status === "open").length;

  const displayedAlerts =
    activeTab === "open"
      ? alerts.filter((a) => a.status === "open")
      : activeTab === "all"
      ? alerts
      : [];

  const INSIGHT_ICONS: Record<string, React.ElementType> = {
    anomaly: AlertTriangle,
    trend: TrendingUp,
    recommendation: Zap,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <CrPageHeader
        icon={Shield}
        title="التنبيهات الذكية"
        subtitle="تنبيهات production monitoring + triage من admin/monitoring/summary"
        meta={
          criticalCount > 0 ? (
            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-semibold animate-pulse">
              {criticalCount} حرج
            </span>
          ) : undefined
        }
        actions={
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(SEVERITY_CONFIG)
          .filter(([k]) => k !== "info")
          .map(([sev, cfg]) => {
            const count = openAlerts.filter((a) => a.severity === sev).length;
            const tone =
              sev === "critical"
                ? "red"
                : sev === "high"
                ? "amber"
                : sev === "medium"
                ? "amber"
                : "blue";
            return (
              <CrKpiCard
                key={sev}
                title={cfg.label}
                value={loading ? "—" : count}
                icon={AlertTriangle}
                tone={tone as "red" | "amber" | "blue"}
                loading={loading}
              />
            );
          })}
      </div>

      <div className="cr-tabs">
        {([
          { id: "open", label: `مفتوحة (${openAlerts.length})` },
          { id: "all", label: "الكل" },
          { id: "insights", label: `رؤى AI (${insights.length})` },
        ] as { id: typeof activeTab; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`cr-tab ${activeTab === tab.id ? "cr-tab-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* التنبيهات */}
      {activeTab !== "insights" && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-400">جاري تحميل التنبيهات...</div>
          ) : displayedAlerts.length === 0 ? (
            <div className="cr-empty">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">لا توجد تنبيهات {activeTab === "open" ? "مفتوحة" : ""} حالياً</p>
              <p className="text-xs text-gray-400 mt-1">كل شيء يعمل بشكل طبيعي</p>
            </div>
          ) : (
            displayedAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                access={access}
              />
            ))
          )}
        </div>
      )}

      {/* رؤى AI */}
      {activeTab === "insights" && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-400">جاري تحليل البيانات...</div>
          ) : insights.length === 0 ? (
            <div className="cr-empty">
              <Zap className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">لا توجد رؤى ذكية متاحة حالياً</p>
              <p className="text-xs text-gray-400 mt-1">يحتاج النظام بيانات كافية لتوليد التحليلات</p>
            </div>
          ) : (
            insights.map((insight) => {
              const Icon = INSIGHT_ICONS[insight.type] ?? TrendingUp;
              return (
                <div key={insight.id} className="cr-panel space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900">{insight.title}</p>
                        <span className="text-xs text-gray-400 shrink-0">ثقة: {insight.confidence}%</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{insight.body}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(insight.generated_at).toLocaleString("ar-SA")}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function SmartAlertsPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <SmartAlertsBody access={access} />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
