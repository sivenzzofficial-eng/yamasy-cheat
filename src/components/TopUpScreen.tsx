import React, { useState } from 'react';
import { ArrowLeft, Coins, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  RedeemState,
  redeemCoinCode,
  WHATSAPP_DISPLAY,
  WHATSAPP_URL,
  COINS_PER_REDEEM,
  COINS_PER_USE,
} from '../utils/yamasyLogic';

interface TopUpScreenProps {
  redeemState: RedeemState;
  onUpdateRedeemState: (nextState: RedeemState) => void;
  onBack: () => void;
}

export default function TopUpScreen({
  redeemState,
  onUpdateRedeemState,
  onBack,
}: TopUpScreenProps) {
  const [inputCode, setInputCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const result = redeemCoinCode(inputCode, redeemState);
    if (result.success) {
      onUpdateRedeemState(result.nextState);
      setInputCode('');
      setFeedback({ type: 'success', text: result.message });
    } else {
      setFeedback({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#090d16] text-slate-100 px-4 py-6">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 text-sm font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111827] border border-slate-800">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-mono font-semibold text-white">
              {redeemState.coins} Koin
            </span>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white">Top Up Koin</h1>
            <p className="text-sm text-slate-400 mt-1">
              1x Redeem kode unik mendapatkan +{COINS_PER_REDEEM} Koin ({COINS_PER_USE} Koin untuk 1x pakai Fitur Utama).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">
              Langkah 1: Pembayaran via WhatsApp
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Silakan lakukan pembayaran melalui nomor WhatsApp resmi{' '}
              <span className="font-mono text-slate-200">{WHATSAPP_DISPLAY}</span> untuk mendapatkan kode unik koin.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Bayar via WhatsApp ({WHATSAPP_DISPLAY})</span>
            </a>
          </div>

          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label
                htmlFor="redeem-code-input"
                className="block text-sm font-semibold text-slate-200 mb-1.5"
              >
                Langkah 2: Redeem Kode Unik
              </label>
              <input
                id="redeem-code-input"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Masukkan kode unik koin"
                className="w-full px-4 py-2.5 bg-[#090d16] border border-slate-800 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {feedback && (
              <div
                role="alert"
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                    : 'bg-red-950/50 border-red-800 text-red-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Redeem Kode Koin
            </button>
          </form>
        </div>
      </div>

      <footer className="text-center py-4">
        <span className="text-xs text-slate-100/25 select-none">copyright by given</span>
      </footer>
    </div>
  );
}
