// DasmAdminPanel/utils/api.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Backend root URL (Laravel)
 * مثال: http://127.0.0.1:8000
 */
const BACKEND_URL =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '');

/**
 * كل API عندك تحت /api
 */
const API_BASE_URL = `${BACKEND_URL}/api`;

/**
 * لو عندك Bearer Token (اختياري)
 */
const TOKEN_KEY = 'dasm_admin_token';
const PLATFORM_TOKEN_KEY = 'token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(PLATFORM_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Axios instance
 * - withCredentials مهم جدًا لإرسال Cookies (Sanctum)
 * - xsrfCookieName/xsrfHeaderName مهمين لـ CSRF في Sanctum
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

/**
 * Sanctum SPA CSRF cookie
 * لازم قبل login/register أو أي POST في Cookie Auth
 */
export async function ensureCsrfCookie(): Promise<void> {
  await axios.get(`${BACKEND_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
}

/**
 * Request Interceptor:
 * - يضيف Authorization لو عندك token (اختياري)
 * - ما يفرضش Content-Type لو FormData
 */
api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};

  // Bearer token (اختياري)
  const token = getToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // لو FormData: سيب axios يحدد الـ content-type بنفسه
  const data = (config as any).data;
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  if (isFormData) {
    // تأكد إننا مش بنجبره على application/json
    if (config.headers && 'Content-Type' in config.headers) {
      delete (config.headers as any)['Content-Type'];
    }
  } else {
    // default للـ JSON
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
  }

  return config;
});

/**
 * Response Interceptor:
 * - لو 401: امسح token (إن وجد)
 */
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      clearToken();
    }
    return Promise.reject(error);
  }
);

/**
 * Types لخيارات apiFetch
 */
export type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any; // JSON أو FormData
  data?: any; // alias لـ body (عشان توافق أكواد قديمة)
  signal?: AbortSignal;
  // لو حابب ترجّع response كامل بدل data فقط
  rawResponse?: boolean;
};

function normalizeUrl(url: string) {
  // يقبل "/admin/users" أو "admin/users"
  if (!url) return '/';
  return url.startsWith('/') ? url : `/${url}`;
}

/**
 * ✅ apiFetch (المشروع عندك كان بيعتمد عليه)
 * يرجّع data مباشرة
 */
export async function apiFetch<T = any>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase() as ApiFetchOptions['method'];
  const finalUrl = normalizeUrl(url);

  const payload = options.body !== undefined ? options.body : options.data;

  const config: AxiosRequestConfig = {
    url: finalUrl,
    method,
    params: options.params,
    headers: options.headers,
    signal: options.signal,
    data: payload,
  };

  // GET/DELETE الأفضل ما يبعتش body (بس لو موجود مش مشكلة)
  if ((method === 'GET' || method === 'DELETE') && payload !== undefined) {
    // هنحوّله params لو params مش متحدد
    if (!config.params) config.params = payload;
    delete (config as any).data;
  }

  const res: AxiosResponse<any> = await api.request(config);

  // لو API بيرجع token في login مثلاً (اختياري)
  const maybeToken =
    res.data?.token || res.data?.access_token || res.data?.data?.token || res.data?.data?.access_token;

  if (typeof maybeToken === 'string' && maybeToken.length > 10) {
    setToken(maybeToken);
  }

  if (options.rawResponse) return res as any;

  return res.data as T;
}

/**
 * ✅ extractErrorMessage (المشروع عندك كان بيعتمد عليه)
 * يتعامل مع Laravel: {message, errors}
 */
export function extractErrorMessage(error: any): string {
  // Axios error
  if (axios.isAxiosError(error)) {
    const data: any = error.response?.data;

    // Laravel validation: errors: {field: [msg1, msg2]}
    if (data?.errors && typeof data.errors === 'object') {
      const firstKey = Object.keys(data.errors)[0];
      const firstVal = firstKey ? data.errors[firstKey] : null;
      if (Array.isArray(firstVal) && firstVal[0]) return String(firstVal[0]);
    }

    // Laravel: message
    if (data?.message) return String(data.message);

    // fallback status text
    if (error.response?.status) {
      return `Request failed (${error.response.status})`;
    }

    return error.message || 'Network error';
  }

  // Normal error
  if (error instanceof Error) return error.message;

  // String
  if (typeof error === 'string') return error;

  return 'Unknown error';
}

/**
 * ✅ Default export (عشان لو فيه ملفات بتعمل import default)
 * هنخليه apiFetch عشان يكون عملي + ومش هيكسر أي import named
 */
export default apiFetch;
