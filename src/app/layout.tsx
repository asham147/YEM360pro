import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/yem/providers";
import { PWA } from "@/components/yem/pwa";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// spec §9 typography: Cairo (Tajawal alternative) — rounded bold Arabic identity
const arabicFont = Cairo({
  variable: "--font-yem-arabic",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "YEM360 V8 — عالمك الرقمي في منصة واحدة",
  description:
    "منصة تواصل اجتماعي متكاملة بالإصدار المذهل V8: منشورات، قصص، ريلز، رسائل، مجموعات، قنوات بث، سوق، إعلانات — Your Digital World in One Platform.",
  keywords: ["YEM360", "V8", "تواصل اجتماعي", "social media", "منصة", "network"],
  authors: [{ name: "YEM360" }],
  manifest: "/manifest.json",
  other: { "application-version": "V8" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YEM360",
  },
};

export const viewport: Viewport = {
  themeColor: "#1765D8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${arabicFont.variable} ${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <PWA />
        </Providers>
      </body>
    </html>
  );
}
