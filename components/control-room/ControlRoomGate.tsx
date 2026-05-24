import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import dasmBff from "@/lib/dasmBffClient";

type GateState =
  | "loading"
  | "allowed_full" // أدمن / مشرف / مبرمج — كامل الصلاحيات
  | "allowed_ops" // مشغّل — صلاحيات محدودة
  | "allowed_queue" // مراجع خارجي يملك can_access_queue
  | "forbidden"
  | "error"
  | "redirect_login";

export type ControlRoomAccessLevel = "full" | "ops" | "queue";

interface ControlRoomGateProps {
  children: (access: ControlRoomAccessLevel) => React.ReactNode;
}

export default function ControlRoomGate({ children }: ControlRoomGateProps) {
  const router = useRouter();
  const {
    hydrated,
    initialized,
    loading,
    token,
    user,
    isAdmin,
    isModerator,
    isProgrammer,
    isOperator,
    logout,
  } = useAuth();
  const isFullStaff = isAdmin || isModerator || isProgrammer;

  const [gateState, setGateState] = useState<GateState>("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!hydrated || !initialized) return;

    // انتظر انتهاء جلب البروفايل قبل أي قرار (تجنّب 403 مؤقت لطاقم staff)
    if (token && !user && loading) return;

    // توكن بدون بروفايل بعد التهيئة = جلسة منتهية أو تالفة
    if (token && !user) {
      void logout({ skipRequest: true, redirectToLogin: true });
      setGateState("redirect_login");
      return;
    }

    // أدمن / مشرف / مبرمج → دخول كامل
    if (isFullStaff) {
      setGateState("allowed_full");
      return;
    }

    // مشغّل → دخول محدود
    if (isOperator) {
      setGateState("allowed_ops");
      return;
    }

    // غير مسجّل → توجيه للدخول
    if (!token) {
      setGateState("redirect_login");
      router.replace(
        "/auth/login?returnUrl=" + encodeURIComponent(router.asPath)
      );
      return;
    }

    // فحص صلاحيات طابور الموافقات لبقية الأدوار
    let cancelled = false;
    setGateState("loading");

    (async () => {
      try {
        const res = await dasmBff.get("admin/approval-requests/capabilities");
        const data = res.data?.data ?? res.data;
        const ok = data?.can_access_queue === true;
        if (cancelled) return;
        setGateState(ok ? "allowed_queue" : "forbidden");
      } catch (e: unknown) {
        if (cancelled) return;
        const status = (e as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401) {
          setGateState("redirect_login");
          router.replace(
            "/auth/login?returnUrl=" + encodeURIComponent(router.asPath)
          );
          return;
        }
        // 403 = لا صلاحية (ليس خطأ شبكة)
        if (status === 403) {
          setGateState("forbidden");
          return;
        }
        setGateState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    initialized,
    loading,
    user,
    isFullStaff,
    isOperator,
    token,
    retryKey,
  ]);

  if (!hydrated || !initialized || gateState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm rtl p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (gateState === "redirect_login") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm rtl p-6">
        جاري التوجيه لتسجيل الدخول...
      </div>
    );
  }

  if (gateState === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 rtl p-6 text-center max-w-md mx-auto">
        <p className="text-red-800 font-medium">
          تعذر التحقق من الصلاحيات. تحقق من الاتصال أو حاول لاحقاً.
        </p>
        <button
          type="button"
          className="px-4 py-2 rounded-xl border border-gray-300 text-sm hover:bg-gray-50"
          onClick={() => setRetryKey((k) => k + 1)}
        >
          إعادة المحاولة
        </button>
        <button
          type="button"
          className="text-sm text-blue-600 underline"
          onClick={() => void logout({ redirectToLogin: true })}
        >
          تسجيل الدخول من جديد
        </button>
      </div>
    );
  }

  if (gateState === "forbidden") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 rtl p-6 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl mx-auto">
          🔒
        </div>
        <p className="text-lg font-semibold text-amber-900">غير مصرّح</p>
        <p className="text-amber-800 text-sm leading-relaxed">
          لا تملك صلاحية الدخول إلى الكنترول روم. تواصل مع مدير داسم للحصول على
          الوصول.
        </p>
        <button
          type="button"
          className="mt-2 text-sm text-blue-600 underline"
          onClick={() => router.replace("/auth/login")}
        >
          تسجيل الدخول بحساب آخر
        </button>
      </div>
    );
  }

  const access: ControlRoomAccessLevel =
    gateState === "allowed_full"
      ? "full"
      : gateState === "allowed_ops"
      ? "ops"
      : "queue";

  return <>{children(access)}</>;
}

export { ControlRoomGate };
