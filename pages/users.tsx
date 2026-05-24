import { useEffect } from "react";
import { useRouter } from "next/router";

/** legacy — يُوجَّه إلى الكنترول روم بدون Layout القديم */
export default function UsersLegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/control-room/users");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 rtl">
      جاري التوجيه إلى إدارة المستخدمين…
    </div>
  );
}
