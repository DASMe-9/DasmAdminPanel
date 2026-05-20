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

  useEffect(() => {
    if (!hydrated) return;
    void initializeFromStorage();
  }, [hydrated, initializeFromStorage]);

  useEffect(() => {
    if (!hydrated || !initialized) return;
    if (!isLoggedIn) {
      router.replace("/auth/login");
      return;
    }
    router.replace("/admin/control-room");
  }, [hydrated, initialized, isLoggedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
      جاري التوجيه...
    </div>
  );
}
