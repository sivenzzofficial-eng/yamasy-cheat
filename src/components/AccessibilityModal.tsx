import React from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';

interface AccessibilityModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onCancel: () => void;
}

export default function AccessibilityModal({
  isOpen,
  onAllow,
  onCancel,
}: AccessibilityModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Izin Akses Aksesibilitas & Panel Melayang
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Aplikasi <span className="text-slate-200 font-medium">yamasy</span> meminta akses
              aksesibilitas dan izin tampil di atas layar agar memudahkan klik otomatis serta
              mengetik jawaban sehingga bot dapat beroperasi dengan lancar.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#090d16] border border-slate-800 space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span>Layanan Klik Otomatis (Aksesibilitas)</span>
            <span className="font-mono text-blue-400">Diperlukan</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Panel Melayang (Overlay Layar)</span>
            <span className="font-mono text-blue-400">Diperlukan</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Batal</span>
          </button>
          <button
            type="button"
            onClick={onAllow}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Izinkan Aksesibilitas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
