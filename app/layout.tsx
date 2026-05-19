import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigasjon from "@/components/Navigasjon";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallerBanner from "@/components/InstallerBanner";
import { createClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "VinIverdagen",
  description: "Vinklubbens digitale stue",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VinIverdagen",
  },
};

export const viewport: Viewport = {
  themeColor: "#7d2c3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let medlem = null;
  if (user) {
    const { data } = await supabase
      .from("medlemmer")
      .select("id, navn, godkjent, er_admin, bilde_url")
      .eq("id", user.id)
      .single();
    medlem = data;
  }

  return (
    <html lang="nb">
      <body>
        <ServiceWorkerRegister />
        {medlem && <InstallerBanner />}
        {medlem && <Navigasjon medlem={medlem} />}
        <main className="min-h-screen">{children}</main>
        <footer className="mt-24 py-8 text-center text-sm text-ink-700/60 font-sans">
          <div className="gold-line w-32 mx-auto mb-4" />
          VinIverdagen · {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
