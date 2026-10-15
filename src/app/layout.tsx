import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "سفره — دستیار آشپزی قدم‌به‌قدم",
  description: "با چیزهایی که داری چی می‌تونی بپزی؟ لیست خرید هوشمند و آشپزی مرحله‌به‌مرحله با تایمر.",
  manifest: "/manifest.json",
  applicationName: "سفره",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "سفره" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#234d3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto min-h-dvh w-full max-w-lg bg-cream md:shadow-[0_0_70px_-35px_rgba(24,39,29,0.28)] md:ring-1 md:ring-stone-200/70">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
