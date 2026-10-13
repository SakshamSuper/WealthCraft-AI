import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MarketTicker from "@/components/MarketTicker";

export const metadata: Metadata = {
  title: "WealthCraft.AI - Smart Wealth & Portfolio Intelligence",
  description: "Production-ready AI and ML powered Mutual Fund recommendation, Stock Screener & Portfolio optimization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased selection:bg-[#00D09C]/30 selection:text-[#00D09C]" suppressHydrationWarning>
        <div className="min-h-screen flex flex-col bg-[#0D0F12]">
          <Navbar />
          <MarketTicker />
          
          {/* Main Content Area */}
          <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="py-6 border-t border-white/5 text-center text-xs text-slate-500 bg-[#0D0F12]">
            <p>© {new Date().getFullYear()} WealthCraft AI. All Rights Reserved. Empowering smart investments with machine learning & agentic intelligence.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
