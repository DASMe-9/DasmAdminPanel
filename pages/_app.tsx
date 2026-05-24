import { useEffect, type ReactNode } from "react";
import type { AppProps } from "next/app";
import Script from "next/script";
import Head from "next/head";
import { Toaster } from "react-hot-toast";
import { usePlatformAuthStore } from "@/store/platformAuthStore";
import platformApi from "@/lib/platformApi";
import "../styles/globals.css";

function PlatformAuthHydration({ children }: { children: ReactNode }) {
  useEffect(() => {
    const finish = () => {
      const st = usePlatformAuthStore.getState();
      st.setHydrated(true);
      const t =
        st.token ||
        (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      if (t && typeof window !== "undefined") {
        localStorage.setItem("token", t);
        platformApi.defaults.headers.common.Authorization = `Bearer ${t}`;
        usePlatformAuthStore.setState({ token: t, isLoggedIn: true });
      }
      void usePlatformAuthStore.getState().initializeFromStorage();
    };
    const unsub = usePlatformAuthStore.persist.onFinishHydration(finish);
    if (
      typeof usePlatformAuthStore.persist.hasHydrated === "function" &&
      usePlatformAuthStore.persist.hasHydrated()
    ) {
      finish();
    }
    return unsub;
  }, []);

  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PlatformAuthHydration>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
      <Toaster position="top-center" />
      {/* DASM Talk widget — unified conversations layer (talk.dasm.com.sa) */}
      <Script src="https://talk.dasm.com.sa/widget.js" strategy="afterInteractive" />
    </PlatformAuthHydration>
  );
}
