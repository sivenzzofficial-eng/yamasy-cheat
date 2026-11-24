import React, { useEffect } from 'react';
import { Box, Loader2 } from 'lucide-react';

interface WelcomeLoadingScreenProps {
  onComplete: () => void;
}

export default function WelcomeLoadingScreen({ onComplete }: WelcomeLoadingScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#090d16] text-slate-100 px-4 py-8">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md text-center">
        {/* Gambar Kotak Besar */}
        <div
          data-testid="big-welcome-box"
          className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl bg-[#111827] border-2 border-blue-500/40 flex flex-col items-center justify-center shadow-2xl mb-6 relative"
        >
          <Box className="w-24 h-24 text-blue-400 stroke-[1.5]" />
          <span className="mt-3 text-xs font-mono text-slate-400">YAMASY</span>
        </div>

        <h2 className="text-3xl font-bold tracking-wide text-white mb-3">WELCOME</h2>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Menyiapkan Dashboard...</span>
        </div>
      </div>

      <footer className="text-center py-2">
        <span className="text-xs text-slate-100/25 select-none">copyright by given</span>
      </footer>
    </div>
  );
}
