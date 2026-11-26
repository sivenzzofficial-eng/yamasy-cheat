/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Coins, Sparkles, ShieldCheck, AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import LoginPage from './components/LoginPage';
import WelcomeLoadingScreen from './components/WelcomeLoadingScreen';
import TopUpScreen from './components/TopUpScreen';
import AccessibilityModal from './components/AccessibilityModal';
import FloatingBotPanel from './components/FloatingBotPanel';
import ExamSimulationArea from './components/ExamSimulationArea';
import AdminModal from './components/AdminModal';
import {
  INITIAL_REDEEM_CODE,
  DEFAULT_QUESTIONS,
  QuestionItem,
  RedeemState,
  COINS_PER_USE,
  deductCoinsForFeature,
  isTripleClick,
} from './utils/yamasyLogic';
import { launchExternalFloatingPanelWindow } from './utils/nativeBridge';

type ScreenView = 'login' | 'welcome_loading' | 'dashboard' | 'topup';

const STORAGE_KEYS = {
  REMEMBER_LOGIN: 'yamasy_remember_device_v1',
  REDEEM_STATE: 'yamasy_redeem_state_v1',
  QUESTIONS_DB: 'yamasy_questions_db_v2',
};

export default function App() {
  const [screen, setScreen] = useState<ScreenView>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return 'dashboard';
    }
    const remembered = localStorage.getItem(STORAGE_KEYS.REMEMBER_LOGIN);
    return remembered === 'true' ? 'dashboard' : 'login';
  });

  // Strict Online Requirement (.bikin biar harus online biar memaksimalkan)
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [checkingConnection, setCheckingConnection] = useState(false);

  const verifyServerOnline = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return;
    }
    setCheckingConnection(true);
    try {
      const res = await fetch('/api/online-check', { cache: 'no-store' });
      setIsOnline(res.ok);
    } catch {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    } finally {
      setCheckingConnection(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void verifyServerOnline();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [verifyServerOnline]);

  const [redeemState, setRedeemState] = useState<RedeemState>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REDEEM_STATE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      activeCode: INITIAL_REDEEM_CODE,
      usedCodes: [],
      coins: 0,
    };
  });

  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.QUESTIONS_DB);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_QUESTIONS;
  });

  const [accessibilityGranted, setAccessibilityGranted] = useState(false);
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [showFloatingPanel, setShowFloatingPanel] = useState(false);
  const [isPanelHidden, setIsPanelHidden] = useState(false);
  const [isBotOn, setIsBotOn] = useState(false);
  const [coinWarning, setCoinWarning] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);

  const clickTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REDEEM_STATE, JSON.stringify(redeemState));
  }, [redeemState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS_DB, JSON.stringify(questions));
  }, [questions]);

  const isBotOnRef = useRef(isBotOn);
  useEffect(() => {
    isBotOnRef.current = isBotOn;
  }, [isBotOn]);

  // If device goes offline while bot is ON, pause bot until back online
  useEffect(() => {
    if (!isOnline && isBotOn) {
      setIsBotOn(false);
    }
  }, [isOnline, isBotOn]);

  // .f3: When hidden, panel stays running in background without any visible icon on screen,
  // and clicking 3 times rapidly anywhere on screen brings the panel back.
  useEffect(() => {
    if (!showFloatingPanel || !isPanelHidden) return;

    const handleGlobalClick = () => {
      const now = Date.now();
      const result = isTripleClick(clickTimestampsRef.current, now, 700);
      clickTimestampsRef.current = result.updatedTimestamps;
      if (result.triggered) {
        setIsPanelHidden(false);
        if (window.Android?.showFloatingOverlayService) {
          window.Android.showFloatingOverlayService();
        }
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [showFloatingPanel, isPanelHidden]);

  const handleLoginSuccess = (rememberDevice: boolean) => {
    if (rememberDevice) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_LOGIN, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_LOGIN);
    }
    setScreen('welcome_loading');
  };

  const handleWelcomeComplete = useCallback(() => {
    setScreen('dashboard');
  }, []);

  const activateFloatingPanelWithCoins = () => {
    if (!isOnline) {
      setCoinWarning('Wajib terhubung ke internet (ONLINE) untuk mengaktifkan Fitur Utama & Bantuan AI.');
      return;
    }

    const deduction = deductCoinsForFeature(redeemState.coins);
    if (!deduction.success) {
      setCoinWarning(
        `Koin tidak cukup (${redeemState.coins} Koin). Fitur Utama membutuhkan ${COINS_PER_USE} Koin untuk 1x pakai. Silakan beli koin di menu Top Up.`
      );
      return;
    }

    setCoinWarning('');
    setRedeemState((prev) => ({
      ...prev,
      coins: deduction.remainingCoins,
    }));
    setShowFloatingPanel(true);
    setIsPanelHidden(false);

    void launchExternalFloatingPanelWindow({
      getIsBotOn: () => isBotOnRef.current,
      onToggleBot: () => setIsBotOn((prev) => !prev),
      onHidePanel: () => {
        setIsPanelHidden(true);
        if (window.Android?.hideFloatingOverlayService) {
          window.Android.hideFloatingOverlayService();
        }
      },
    });
  };

  const handlePressMainFeature = () => {
    setCoinWarning('');
    if (!isOnline) {
      setCoinWarning('Aplikasi wajib ONLINE untuk memaksimalkan Fitur Utama & Bantuan AI.');
      return;
    }

    if (showFloatingPanel) {
      setIsPanelHidden(false);
      return;
    }

    if (redeemState.coins < COINS_PER_USE) {
      setCoinWarning(
        `Koin kurang (${redeemState.coins} Koin). Butuh ${COINS_PER_USE} Koin untuk 1x pakai. Silakan Top Up terlebih dahulu.`
      );
      return;
    }

    if (!accessibilityGranted) {
      setShowAccessibilityModal(true);
      return;
    }

    activateFloatingPanelWithCoins();
  };

  const handleAllowAccessibility = () => {
    setAccessibilityGranted(true);
    setShowAccessibilityModal(false);
    activateFloatingPanelWithCoins();
  };

  const handleBotFinished = useCallback(() => {
    setIsBotOn(false);
  }, []);

  // Mandatory Online Blocker Overlay if device goes offline
  const offlineBlocker = !isOnline ? (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <div className="w-full max-w-md bg-[#111827] border border-red-800/80 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700/60 flex items-center justify-center mx-auto text-red-400">
          <WifiOff className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Koneksi Internet Wajib Online</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Aplikasi <span className="font-semibold text-white">yamasy</span> mewajibkan perangkat
          terhubung ke internet (ONLINE) agar sinkronisasi database Admin dan Bantuan AI Google
          Search berjalan maksimal.
        </p>
        <button
          type="button"
          onClick={() => void verifyServerOnline()}
          disabled={checkingConnection}
          className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${checkingConnection ? 'animate-spin' : ''}`} />
          <span>{checkingConnection ? 'Memeriksa Koneksi...' : 'Coba Hubungkan Ulang'}</span>
        </button>
      </div>
    </div>
  ) : null;

  if (screen === 'login') {
    return (
      <>
        {offlineBlocker}
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  if (screen === 'welcome_loading') {
    return (
      <>
        {offlineBlocker}
        <WelcomeLoadingScreen onComplete={handleWelcomeComplete} />
      </>
    );
  }

  if (screen === 'topup') {
    return (
      <>
        {offlineBlocker}
        <TopUpScreen
          redeemState={redeemState}
          onUpdateRedeemState={setRedeemState}
          onBack={() => {
            setCoinWarning('');
            setScreen('dashboard');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#090d16] text-slate-100 px-4 py-6">
      {offlineBlocker}

      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Header yamasy */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white">yamasy</h1>
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111827] border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              data-testid="online-status-indicator"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] border border-slate-800 text-xs font-mono text-emerald-400"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>ONLINE + AI</span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#111827] border border-slate-800">
              <Coins className="w-4 h-4 text-amber-400" />
              <span data-testid="coin-balance" className="text-sm font-mono font-semibold text-white">
                {redeemState.coins} Koin
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard: Hanya 2 Fitur (1. Top Up & 2. Fitur Utama Tombol Rainbow) */}
        <section className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Dashboard</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih menu Top Up untuk mengisi koin atau aktifkan Fitur Utama ({COINS_PER_USE} Koin / 1x pakai).
            </p>
          </div>

          {coinWarning && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-800/70 text-xs text-amber-200 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{coinWarning}</span>
              </div>
              <button
                type="button"
                onClick={() => setScreen('topup')}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shrink-0 cursor-pointer"
              >
                Beli Koin
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fitur 1: Top Up */}
            <button
              type="button"
              onClick={() => setScreen('topup')}
              className="h-24 rounded-2xl bg-[#090d16] border border-slate-800 hover:border-blue-500/60 p-5 flex flex-col justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                  Top Up
                </span>
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xs text-slate-400">
                Beli & redeem kode unik (+10 Koin)
              </span>
            </button>

            {/* Fitur 2: Fitur Utama (Tombol Berwarna Rainbow) */}
            <button
              type="button"
              onClick={handlePressMainFeature}
              className="h-24 rounded-2xl btn-rainbow p-5 flex flex-col justify-between text-left shadow-lg transition-transform active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-base font-bold text-white drop-shadow">
                  Fitur Utama
                </span>
                <Sparkles className="w-5 h-5 text-white drop-shadow" />
              </div>
              <span className="text-xs font-medium text-white/95 drop-shadow">
                {showFloatingPanel
                  ? isPanelHidden
                    ? 'Panel Aktif di Latar Belakang (Klik 3x layar untuk muncul)'
                    : 'Panel Melayang Aktif'
                  : `Aktifkan Panel Bot + Bantuan AI (${COINS_PER_USE} Koin)`}
              </span>
            </button>
          </div>
        </section>

        {/* Simulasi Target Soal Ujian untuk Bot Jawab Otomatis + Bantuan AI */}
        <ExamSimulationArea
          questions={questions}
          isBotOn={isBotOn}
          isOnline={isOnline}
          onBotFinished={handleBotFinished}
        />
      </div>

      {/* Modal Akses Aksesibilitas (.f2) */}
      <AccessibilityModal
        isOpen={showAccessibilityModal}
        onAllow={handleAllowAccessibility}
        onCancel={() => setShowAccessibilityModal(false)}
      />

      {/* Panel Melayang (.f1 & .f3) */}
      {showFloatingPanel && (
        <FloatingBotPanel
          isBotOn={isBotOn}
          isHidden={isPanelHidden}
          onToggleBot={() => setIsBotOn((prev) => !prev)}
          onHidePanel={() => setIsPanelHidden(true)}
        />
      )}

      {/* Modal Admin Soal */}
      <AdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        questions={questions}
        onUpdateQuestions={setQuestions}
        redeemState={redeemState}
      />

      <footer className="text-center py-4">
        <span className="text-xs text-slate-100/25 select-none">copyright by given</span>
      </footer>
    </div>
  );
}
