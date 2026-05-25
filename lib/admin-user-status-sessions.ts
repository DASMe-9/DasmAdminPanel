/** Types + badge helpers for GET admin/users/status-sessions */

export interface SessionObservabilityPayload {
  has_session_row: boolean;
  presence_label_ar: string;
  last_seen_at: string | null;
  last_login_at: string | null;
  last_logout_at: string | null;
  session_duration_label_ar: string;
  location_label: string;
  device_browser_label: string;
  ip_masked: string;
  session_kind_label_ar: string;
  open_sessions_count: number;
  recent_sessions: Array<{
    id: number;
    session_key: string;
    status: string;
    started_at: string | null;
    last_seen_at: string | null;
    ended_at: string | null;
    location_label: string;
    device_browser_label: string;
    ip_masked: string;
    is_open: boolean;
  }>;
}

export type AdminUserStatusSessionRow = {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  type?: string;
  status?: string;
  user_code?: string;
  email_verified_at?: string | null;
  session_observability: SessionObservabilityPayload;
};

export function buildStatusSessionsParams(opts: {
  page: number;
  perPage: number;
  search: string;
  statusFilter: string;
  roleFilter: string;
  sessionStatusFilter: string;
}): Record<string, string> {
  const params: Record<string, string> = {
    page: String(opts.page),
    per_page: String(opts.perPage),
  };
  const s = opts.search.trim();
  if (s) params.search = s;

  if (opts.statusFilter === "pending") {
    params.pending_business_only = "1";
  } else if (opts.statusFilter === "active") {
    params.status = "active";
  } else if (opts.statusFilter === "rejected") {
    params.status = "rejected";
  }

  if (opts.roleFilter !== "all") {
    params.type = opts.roleFilter;
  }

  if (opts.sessionStatusFilter !== "all") {
    params.session_status = opts.sessionStatusFilter;
  }

  return params;
}

export function presenceBadgeClass(label: string): string {
  if (label === "داخل الآن") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold";
  }
  if (label === "خامل") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
}

export function roleLabel(role?: string): string {
  const map: Record<string, string> = {
    super_admin: "مدير رئيسي",
    admin: "مدير",
    programmer: "مبرمج",
    moderator: "مشرف",
    dealer: "تاجر",
    venue_owner: "معرض",
    investor: "مستثمر",
    user: "مستخدم",
  };
  return role ? map[role] ?? role : "—";
}

export function formatDt(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" });
}
