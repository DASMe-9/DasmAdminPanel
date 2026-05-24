import { useEffect } from "react";
import { useRouter } from "next/router";

/** legacy — كان صفحة WordPress/WooCommerce وهمية */
export default function ShowroomDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/control-room/stores");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 rtl">
      جاري التوجيه إلى مركز متاجر داسم…
    </div>
  );
}
