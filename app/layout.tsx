import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { cookies } from "next/headers";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
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
  title: "Auto Auctions Africa - Premier Vehicle Auction Platform",
  description:
    "100% Online Auto Auctions. Compete for quality vehicles from China, Japan, Germany & USA. Transparent, secure, and competitive.",
  keywords: [
    "auto auction",
    "vehicle auction",
    "Nigeria cars",
    "import cars",
    "collision repair",
    "salvage cars",
    "used cars africa",
    "Auto Auctions Africa",
  ],
  authors: [{ name: "Auto Auctions Africa" }],
  creator: "Auto Auctions Africa",
  publisher: "Auto Auctions Africa",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    title: "Auto Auctions Africa - Premier Vehicle Auction Platform",
    description: "Compete for quality vehicles from China, Japan, Germany & USA.",
    siteName: "Auto Auctions Africa",
  },
  twitter: {
    card: "summary_large_image",
    title: "Auto Auctions Africa - Premier Vehicle Auction Platform",
    description: "Compete for quality vehicles from China, Japan, Germany & USA.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("voltbid-theme");
  const initialTheme = (themeCookie?.value === "dark" ||
    themeCookie?.value === "light" ||
    themeCookie?.value === "system")
    ? themeCookie.value as "dark" | "light" | "system"
    : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${sora.variable} antialiased`}
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
                  const cookie = getCookie('voltbid-theme');
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
        <ThemeProvider defaultTheme="system" cookieName="voltbid-theme" initialTheme={initialTheme}>
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
