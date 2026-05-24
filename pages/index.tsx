"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";

/**
 * نقطة الجذر: لا تعيد التوجيه إلى لوحة قديمة.
 * غير مسجّل → /auth/login | مسجّل → الكنترول روم الرسمي.
 */
export default function Home() {
  const router = useRouter();
  const { hydrated, initialized, isLoggedIn, initializeFromStorage } =
    useAuth();
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
    if (!isLoggedIn) {
      router.replace("/auth/login");
      return;
    }
    router.replace("/admin/control-room");
  }, [hasSsoToken, hydrated, initialized, isLoggedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
      جاري التوجيه...
    </div>
  );
}
