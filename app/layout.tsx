import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings";
import { UserProvider } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";

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
  title: "Phrase Up",
  description: "英語フレーズを実務で使えるレベルまで習得するアプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Phrase Up",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

const FOUC_SCRIPT = `try{var t=JSON.parse(localStorage.getItem('app_settings')||'{}').colorTheme;if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <SettingsProvider>
            <ThemeProvider>
              <UserProvider>
                {children}
                <BottomNav />
              </UserProvider>
            </ThemeProvider>
          </SettingsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
