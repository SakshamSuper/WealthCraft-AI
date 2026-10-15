"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors for diagnostics
    console.error("WealthCraft caught client-side exception:", error);
  }, [error]);

  const handleClearCacheAndReset = () => {
    if (typeof window !== "undefined") {
      try {
        // Clear temporary state but preserve watchlist
        const keysToRemove = ["wealthcraft_token", "stockify_token"];
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn("Failed to clear cache:", e);
      }
      reset();
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel bg-slate-950/70 border border-red-500/20 p-6 rounded-2xl shadow-2xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle size={28} />
        </div>

        <div>
          <h2 className="text-xl font-heading font-bold text-white mb-1">
            Application State Recovered
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            A temporary client-side calculation or network rendering error occurred. The application has isolated the component to protect your active session.
          </p>
          {error?.message && (
            <div className="mt-3 p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-red-300/80 text-left overflow-x-auto max-h-24">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
          
          <button
            onClick={handleClearCacheAndReset}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck size={14} />
            Reset State
          </button>
        </div>

        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-400 transition-colors"
          >
            <Home size={12} />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
