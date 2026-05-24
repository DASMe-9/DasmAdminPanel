import { useEffect } from "react";
import { useRouter } from "next/router";

export default function EcommerceLegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/control-room/stores");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 rtl">
      جاري التوجيه إلى مركز المتاجر…
    </div>
  );
}
