import React, { useState } from 'react';
import { Lock, KeyRound, Loader2 } from 'lucide-react';
import { validateUserLogin, WHATSAPP_URL } from '../utils/yamasyLogic';

interface LoginPageProps {
  onLoginSuccess: (rememberDevice: boolean) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [uniqueCode, setUniqueCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password.trim() || !uniqueCode.trim()) {
      setErrorMsg('Harap masukkan sandi dan kode unik.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      if (validateUserLogin(password, uniqueCode)) {
        onLoginSuccess(rememberDevice);
      } else {
        setIsLoading(false);
        setErrorMsg('Sandi atau kode unik salah.');
      }
    }, 850);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#090d16] text-slate-100 px-4 py-8">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">yamasy</h1>
            <p className="text-sm text-slate-400 mt-1">Masukkan kredensial akses perangkat</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan sandi"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-unique-code" className="block text-xs font-medium text-slate-300 mb-1.5">
                Kode Unik
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-unique-code"
                  type="text"
                  value={uniqueCode}
                  onChange={(e) => setUniqueCode(e.target.value)}
                  placeholder="Masukkan kode unik"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label htmlFor="remember-device" className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="remember-device"
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-slate-700 bg-[#090d16] text-blue-600 focus:ring-0"
                />
                <span className="text-xs text-slate-300">Ingat device ini</span>
              </label>
            </div>

            {errorMsg && (
              <div role="alert" className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Login...</span>
                </>
              ) : (
                <span>Masuk</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-500 hover:text-blue-400 underline underline-offset-4 transition-colors"
            >
              beli akses klik disini
            </a>
          </div>
        </div>
      </div>

      <footer className="text-center py-2">
        <span className="text-xs text-slate-100/25 select-none">copyright by given</span>
      </footer>
    </div>
  );
}
