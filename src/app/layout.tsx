import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/Layout/Header";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/lib/settings-context";
import { PLCConnectionProvider } from "@/lib/plc-connection-context";

export const metadata: Metadata = {
  title: "PLC Monitoring System",
  description: "Real-time PLC Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <SettingsProvider>
            <PLCConnectionProvider>
              <Header />
              <main className="w-full">{children}</main>
            </PLCConnectionProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
