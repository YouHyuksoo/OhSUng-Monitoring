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
    <html lang="ko" suppressHydrationWarning className="h-screen overflow-hidden">
      <body className={cn("h-screen flex flex-col bg-background font-sans antialiased overflow-hidden")}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <SettingsProvider>
            <PLCConnectionProvider>
              <Header />
              <main className="flex-1 w-full overflow-auto">{children}</main>
            </PLCConnectionProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
