import type { Metadata } from "next";
import "@/styles/globals.css";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { QueryProvider } from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "StockPilot AI - Indian Equity Market Decision Support & Analysis",
  description:
    "Next-generation multi-user portfolio decision-support system for NSE/BSE equities featuring technical analysis, fundamentals, and transparent ML insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased selection:bg-primary selection:text-white">
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>{children}</QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
