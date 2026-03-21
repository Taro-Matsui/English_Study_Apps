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

const GTM_ID = 'GTM-PWNWXD23'
const GTM_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`
const GTM_NOSCRIPT = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: GTM_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <noscript dangerouslySetInnerHTML={{ __html: GTM_NOSCRIPT }} />
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
