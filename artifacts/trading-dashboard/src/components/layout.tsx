import { ReactNode } from "react";
import { MarketSummaryBar } from "./market-summary-bar";
import { AlertBanner } from "./alert-banner";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-mono">
      <MarketSummaryBar />
      <AlertBanner />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
