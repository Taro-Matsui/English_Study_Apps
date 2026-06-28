import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GoogleTagManager } from "@next/third-parties/google";
import { LanguageProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings";
import { UserProvider } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Pick",
  description: "実際の会話・文書から英語フレーズをPickして学ぶアプリ",
  icons: {
    // iOS Safari ホーム画面アイコン → pick_logo.png を使用（apple-icon.tsx より優先）
    apple: [{ url: '/pick_logo.png', sizes: '1024x1024', type: 'image/png' }],
    icon: [
      { url: '/pick_logo.png', sizes: '512x512', type: 'image/png' },
      { url: '/pick_logo.png', sizes: '1024x1024', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pick",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f6f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* AdSense 所有権確認・広告配信（直接埋め込み） */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3375981541016037"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <SettingsProvider>
            <UserProvider>
              {children}
              <BottomNav />
            </UserProvider>
          </SettingsProvider>
        </LanguageProvider>
      </body>
      <GoogleTagManager gtmId="GTM-PWNWXD23" />
    </html>
  );
}
