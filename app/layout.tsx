import type { Metadata } from "next";
import localFont from "next/font/local";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { cookies } from "next/headers";
import { ThemePreference } from "@/components/theme-toggle";
import { THEME_COOKIE, parseTheme, themeAttribute, type Theme } from "@/lib/theme";
import "./globals.css";

// Fonts are self-hosted from app/fonts (latin, variable woff2) so the build
// never has to reach Google Fonts (#1431).

// Platform typeface from the redesign handoff. Mono stays Geist.
const manrope = localFont({
  src: "./fonts/manrope-latin.woff2",
  variable: "--font-manrope",
  weight: "400 800",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// The signed-in app's typeface (globals.css switches to it under the app
// shell). Loaded here so dialogs and toasts, which render on <body>, get it too.
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ziki",
    template: "%s · Ziki",
  },
  description: "Agent Roll Call: a design demo on a copy of the Ziki UI, with mock data.",
};

/** This device's last choice, else the device's own setting. Rendered on <html> so the first paint is already right. */
async function currentTheme(): Promise<Theme> {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await currentTheme();
  return (
    <html lang="en" data-theme={themeAttribute(theme)} className="overflow-x-clip" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${geistMono.variable} ${inter.variable} min-h-screen overflow-x-clip antialiased`}
      >
        <ThemePreference theme={theme}>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </ThemePreference>
      </body>
    </html>
  );
}
