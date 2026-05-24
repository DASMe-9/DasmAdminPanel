// utils/authStorage.ts
export type AuthUser = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  type?: string;
  role?: string;
  user_type?: string;
  [key: string]: any;
};

export type AuthSession = {
  access_token: string;
  token_type?: string;
  expires_at?: string;
  user: AuthUser;
};

const KEY = 'dasm_admin_session_v1';
const PLATFORM_AUTH_KEY = 'dasm-platform-auth';
const PLATFORM_TOKEN_KEY = 'token';

export function setSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

export function isExpired(session: AuthSession | null) {
  if (!session?.expires_at) return false;
  const t = Date.parse(session.expires_at);
  if (Number.isNaN(t)) return false;
  return Date.now() >= t;
}

export function getToken() {
  const s = getSession();
  if (s && !isExpired(s)) return s.access_token;
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(PLATFORM_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser() {
  const s = getSession();
  if (s && !isExpired(s)) return s.user;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLATFORM_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { user?: AuthUser | null } };
    return parsed.state?.user ?? null;
  } catch {
    return null;
  }
}

export function getUserDisplayName(u: AuthUser | null) {
  if (!u) return '';
  if (u.full_name) return u.full_name;
  const first = u.first_name ?? '';
  const last = u.last_name ?? '';
  const full = `${first} ${last}`.trim();
  return full || u.email;
}

// فحص صلاحية بشكل مرن (بدون أي كلام/توثيق في الواجهة)
export function getUserTypeLower(u: AuthUser | null) {
  const t = (u?.type ?? u?.user_type ?? u?.role ?? '').toString().trim().toLowerCase();
  return t;
}
