import { useRouter } from 'next/router';
import { useMemo, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { clearSession, setSession } from '../utils/authStorage';
import supabase from '../utils/supabaseClient';

type LoginResponse = {
  access_token: string;
  token_type?: string;
  expires_at?: string;
  user: {
    id: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email: string;
    type?: string;
    [key: string]: any;
  };
};

/**
 * غير رسمي: الافتراضي يعيد التوجيه إلى /auth/login.
 * ?legacy=1 — دخول Supabase (طوارئ)
 * ?legacy=session — دخول الجلسة عبر API (super_admin + authStorage)
 */
export default function LoginPage() {
  const router = useRouter();
  const rawLegacy = router.query.legacy;
  const legacyMode = rawLegacy === '1' || rawLegacy === 'session';

  const nextPath = useMemo(() => {
    const n = router.query.next;
    return typeof n === 'string' && n.startsWith('/') ? n : '/admin/control-room';
  }, [router.query.next]);

  useEffect(() => {
    if (!router.isReady) return;
    if (legacyMode) return;
    const next = router.query.next;
    const qs = new URLSearchParams();
    if (typeof next === 'string' && next.startsWith('/')) {
      qs.set('returnUrl', next);
    }
    const q = qs.toString();
    router.replace(`/auth/login${q ? `?${q}` : ''}`);
  }, [router, legacyMode]);

  if (!router.isReady || !legacyMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500 text-sm px-6 text-center">
        جاري التوجيه إلى بوابة الدخول الرسمية (/auth/login)...
      </div>
    );
  }

  if (rawLegacy === '1') {
    return <LegacySupabaseLogin />;
  }

  return <LegacySessionLogin nextPath={nextPath} />;
}

function LegacySupabaseLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setErrorMsg('فشل الدخول. تحقق من البيانات.');
      return;
    }

    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (adminError || !adminData) {
      setErrorMsg('ليست لديك صلاحية الدخول كمشرف.');
      return;
    }

    router.push('/admin/control-room');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center"
      >
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          وضع legacy (?legacy=1) — للطوارئ. المسار الرسمي:{' '}
          <a href="/auth/login" className="underline font-medium">
            /auth/login
          </a>
        </p>
        <h2 className="text-2xl font-bold mb-6">دخول المشرفين (Supabase)</h2>

        {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}

        <input
          type="email"
          placeholder="الإيميل"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />

        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 p-2 border rounded"
          required
        />

        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 transition"
        >
          دخول
        </button>
      </form>
    </div>
  );
}

function LegacySessionLogin({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      clearSession();

      const data = await apiFetch<LoginResponse>('/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const userType = (data?.user?.type || '').toLowerCase();
      if (userType !== 'super_admin') {
        setErrorMsg('لا تمتلك صلاحية الدخول.');
        return;
      }

      setSession({
        access_token: data.access_token,
        token_type: data.token_type || 'Bearer',
        expires_at: data.expires_at,
        user: data.user,
      });

      router.replace(nextPath);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'تعذر تسجيل الدخول. تحقق من البيانات.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#0B1220] relative overflow-hidden">
      <p className="absolute top-3 left-3 right-3 z-10 text-center text-xs text-amber-200/90 bg-amber-900/40 border border-amber-500/30 rounded-xl px-3 py-2">
        وضع legacy (?legacy=session). المسار الرسمي: /auth/login
      </p>
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-center">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <svg className="h-6 w-6 text-indigo-200" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3l8 4v6c0 5-3.5 9-8 9s-8-4-8-9V7l8-4z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.5 12.2l1.8 1.8 3.7-4.2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="mt-4 text-center text-2xl font-extrabold text-white">تسجيل الدخول</h1>
              <p className="mt-2 text-center text-sm text-white/60">أدخل بياناتك للمتابعة إلى لوحة التحكم</p>

              {errorMsg && (
                <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">الإيميل</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/40 transition"
                    placeholder="name@domain.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">كلمة المرور</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/40 transition"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-indigo-600 text-white py-3 font-semibold hover:bg-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'جاري المتابعة...' : 'دخول'}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-white/40">© {new Date().getFullYear()} DASM</div>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-white/40">
            إذا واجهت مشكلة في الدخول، تأكد من البريد وكلمة المرور أو تواصل مع مدير النظام.
          </div>
        </div>
      </div>
    </div>
  );
}
