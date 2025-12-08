import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/Layout/Header";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsInitializer } from "@/components/settings-initializer";

export const metadata: Metadata = {
  title: "전력/온도 모니터링",
  description: "실시간 전력/온도 모니터링 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className="h-screen overflow-hidden"
    >
      <body
        className={cn(
          "h-screen flex flex-col bg-background font-sans antialiased overflow-hidden"
        )}
      >
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <SettingsInitializer />
          <Header />
          <main className="flex-1 w-full overflow-auto">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
