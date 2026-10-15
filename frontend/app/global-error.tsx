"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0D0F12] text-white antialiased">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#181B20] border border-red-500/20 p-6 rounded-2xl shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle size={28} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                WealthCraft AI State Error
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected global layout exception was caught.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => reset()}
                className="w-full py-2.5 px-4 bg-[#00D09C] hover:bg-[#00B386] text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
