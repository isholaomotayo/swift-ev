import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { cookies } from "next/headers";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SITE_NAME, BRAND_TAGLINE } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - ${BRAND_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Direct global vehicle exports. Compete for quality vehicles from China, Japan, Germany & USA with total transparency and secure logistics.",
  keywords: [
    "auto export",
    "global vehicle auction",
    "car import nigeria",
    "direct vehicle export",
    "china car export",
    "japan auto auction",
    "premium car import",
    SITE_NAME,
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://autoexports.live",
  ),
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    title: `${SITE_NAME} - ${BRAND_TAGLINE}`,
    description: "Premium global vehicle procurement and export logistics.",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - ${BRAND_TAGLINE}`,
    description: "Premium global vehicle procurement and export logistics.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("ae-theme");
  const initialTheme =
    themeCookie?.value === "dark" ||
    themeCookie?.value === "light" ||
    themeCookie?.value === "system"
      ? (themeCookie.value as "dark" | "light" | "system")
      : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${sora.variable} antialiased font-sans`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getCookie(name) {
                  const value = '; ' + document.cookie;
                  const parts = value.split('; ' + name + '=');
                  if (parts.length === 2) return parts.pop().split(';').shift();
                }
                function getTheme() {
                  const cookie = getCookie('ae-theme');
                  if (cookie === 'dark' || cookie === 'light') return cookie;
                  if (cookie === 'system' || !cookie) {
                    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  return 'light';
                }
                const theme = getTheme();
                const root = document.documentElement;
                root.classList.remove('light', 'dark');
                root.classList.add(theme);
              })();
            `,
          }}
        />
        <ThemeProvider
          defaultTheme="system"
          cookieName="ae-theme"
          initialTheme={initialTheme}
        >
          <ConvexClientProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
