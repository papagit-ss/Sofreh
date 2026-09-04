import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "آشپز — دستیار آشپزی قدم‌به‌قدم",
  description: "با چیزهایی که داری چی می‌تونی بپزی؟ لیست خرید هوشمند و آشپزی مرحله‌به‌مرحله با تایمر.",
  manifest: "/manifest.json",
  applicationName: "آشپز",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "آشپز" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#e2531d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <div className="mx-auto min-h-dvh w-full max-w-lg bg-cream md:border-x md:border-stone-200">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
