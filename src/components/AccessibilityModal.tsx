import React, { useState } from 'react';
import {
  ShieldAlert,
  Check,
  X,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  triggerAndroidAccessibilitySettings,
  triggerAndroidOverlaySettings,
  triggerAndroidBackgroundOverlayPermission,
  requestRealDevicePermissions,
} from '../utils/nativeBridge';

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
  const [accessibilityOpened, setAccessibilityOpened] = useState(false);
  const [overlayOpened, setOverlayOpened] = useState(false);
  const [backgroundOverlayOpened, setBackgroundOverlayOpened] = useState(false);
  const [devicePermsGranted, setDevicePermsGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isOpen) return null;

  const handleOpenAccessibility = () => {
    triggerAndroidAccessibilitySettings();
    setAccessibilityOpened(true);
  };

  const handleOpenOverlay = () => {
    triggerAndroidOverlaySettings();
    setOverlayOpened(true);
  };

  const handleOpenBackgroundOverlay = () => {
    triggerAndroidBackgroundOverlayPermission();
    setBackgroundOverlayOpened(true);
  };

  const handleGrantAllAndActivate = async () => {
    setIsRequesting(true);
    triggerAndroidAccessibilitySettings();
    triggerAndroidOverlaySettings();
    triggerAndroidBackgroundOverlayPermission();
    await requestRealDevicePermissions();
    setAccessibilityOpened(true);
    setOverlayOpened(true);
    setBackgroundOverlayOpened(true);
    setDevicePermsGranted(true);
    setIsRequesting(false);
    onAllow();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Izin Aksesibilitas & Panel Melayang Luar Aplikasi
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Aplikasi <span className="text-slate-200 font-medium">yamasy</span> membutuhkan izin
              berikut agar panel melayang dapat dibawa keluar aplikasi (tampil di atas aplikasi lain)
              dan bot klik otomatis tetap berjalan lancar.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#090d16] border border-slate-800 space-y-3 text-xs text-slate-300">
          {/* 1. Aksesibilitas */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-slate-200">1. Layanan Aksesibilitas Android</p>
              <p className="text-[11px] text-slate-400">
                Mengizinkan klik otomatis & baca teks soal di layar
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAccessibility}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                accessibilityOpened
                  ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-blue-400'
              }`}
            >
              {accessibilityOpened ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Diizinkan</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Izinkan</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Tampil di Atas Aplikasi Lain (Bawa Keluar Aplikasi) */}
          <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-slate-200">
                2. Izin Panel Melayang di Luar Aplikasi
              </p>
              <p className="text-[11px] text-slate-400">
                SYSTEM_ALERT_WINDOW (Tampil di atas aplikasi lain)
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenOverlay}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                overlayOpened
                  ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-blue-400'
              }`}
            >
              {overlayOpened ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Diizinkan</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Izinkan Overlay</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Izin Berjalan di Latar Belakang Saat Keluar Aplikasi */}
          <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-slate-200">
                3. Izin Latar Belakang & Pop-up Luar APK
              </p>
              <p className="text-[11px] text-slate-400">
                FOREGROUND_SERVICE & Abaikan Optimasi Baterai
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenBackgroundOverlay}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                backgroundOverlayOpened
                  ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-blue-400'
              }`}
            >
              {backgroundOverlayOpened ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Diizinkan</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Izinkan</span>
                </>
              )}
            </button>
          </div>

          <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Status Service Panel Luar Aplikasi</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-400">
              {devicePermsGranted ? 'Aktif' : 'Siap Diaktifkan'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRequesting}
            className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Batal</span>
          </button>
          <button
            type="button"
            onClick={handleGrantAllAndActivate}
            disabled={isRequesting}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isRequesting ? 'Mengaktifkan...' : 'Izinkan Semua Akses'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
