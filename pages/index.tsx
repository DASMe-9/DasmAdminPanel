"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";

/**
 * نقطة الجذر: بوابة الدخول الرسمية أولاً.
 * غير مسجّل أو جلسة غير مكتملة → /auth/login
 * طاقم كنترول روم مؤكّد → /admin/control-room (لوحة المراقبة)
 */
export default function Home() {
  const router = useRouter();
  const {
    hydrated,
    initialized,
    loading,
    isLoggedIn,
    token,
    user,
    isControlRoomStaff,
    initializeFromStorage,
    logout,
  } = useAuth();
  const incomingSsoToken =
    typeof router.query.sso_token === "string"
      ? router.query.sso_token
      : typeof router.query.token === "string"
      ? router.query.token
      : null;
  const hasSsoToken = Boolean(incomingSsoToken);

  useEffect(() => {
    if (!router.isReady || !incomingSsoToken) return;
    const params = new URLSearchParams();
    params.set("sso_token", incomingSsoToken);
    params.set(
      "returnUrl",
      typeof router.query.returnUrl === "string"
        ? router.query.returnUrl
        : "/admin/control-room"
    );
    router.replace(`/auth/sso-callback?${params.toString()}`);
  }, [incomingSsoToken, router]);

  useEffect(() => {
    if (!hydrated) return;
    void initializeFromStorage();
  }, [hydrated, initializeFromStorage]);

  useEffect(() => {
    if (hasSsoToken) return;
    if (!hydrated || !initialized) return;

    // لا توكن → صفحة الدخول (الخطوة الأولى المتوقعة)
    if (!token || !isLoggedIn) {
      router.replace("/auth/login");
      return;
    }

    // توكن بدون بروفايل: انتظر أو نظّف الجلسة
    if (!user) {
      if (loading) return;
      void logout({ skipRequest: true, redirectToLogin: true });
      return;
    }

    // طاقم staff مؤكّد → لوحة المراقبة
    if (isControlRoomStaff) {
      router.replace("/admin/control-room");
      return;
    }

    // باقي الأدوار: يمرّون ببوابة الدخول التي تتحقق من طابور الموافقات
    router.replace("/auth/login");
  }, [
    hasSsoToken,
    hydrated,
    initialized,
    loading,
    token,
    isLoggedIn,
    user,
    isControlRoomStaff,
    router,
    logout,
  ]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
      جاري التوجيه...
    </div>
  );
}
