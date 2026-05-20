import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import platformApi from "@/lib/platformApi";

/**
 * يقيّد لوحة الإدارة القديمة على أدوار المنصة الإدارية (staff) فقط.
 * مراجعو الطابور دون دور staff يُوجَّهون إلى الكنترول روم.
 * التحقق النهائي للصلاحيات يبقى مسؤولية DASM-Platform (API).
 */
export default function AdminDashboardGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hydrated, token, isAdmin, isModerator, isProgrammer } = useAuth();
  const isStaff = isAdmin || isModerator || isProgrammer;

  const [ready, setReady] = useState(false);
  const [reviewerQueue, setReviewerQueue] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    if (isStaff) {
      setReviewerQueue(false);
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await platformApi.get(
          "/api/admin/approval-requests/capabilities"
        );
        const ok = res.data?.data?.can_access_queue === true;
        if (!cancelled) setReviewerQueue(ok);
      } catch {
        if (!cancelled) setReviewerQueue(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, isStaff, token]);

  useEffect(() => {
    if (!ready) return;

    if (!token) {
      router.replace(
        "/auth/login?returnUrl=" + encodeURIComponent("/admin/control-room")
      );
      return;
    }

    if (isStaff) return;

    if (reviewerQueue) {
      router.replace("/admin/control-room");
      return;
    }

    router.replace("/auth/login");
  }, [ready, token, isStaff, reviewerQueue, router]);

  if (!hydrated || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm rtl p-6">
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  if (!token || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm rtl p-6">
        إعادة التوجيه...
      </div>
    );
  }

  return <>{children}</>;
}
