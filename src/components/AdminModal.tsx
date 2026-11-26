import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, X, KeyRound, Lock } from 'lucide-react';
import {
  QuestionItem,
  validateAdminLogin,
  RedeemState,
} from '../utils/yamasyLogic';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionItem[];
  onUpdateQuestions: (nextQuestions: QuestionItem[]) => void;
  redeemState: RedeemState;
}

export default function AdminModal({
  isOpen,
  onClose,
  questions,
  onUpdateQuestions,
  redeemState,
}: AdminModalProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [authError, setAuthError] = useState('');

  const [newType, setNewType] = useState<'pilihan_ganda' | 'essai'>('pilihan_ganda');
  const [newPrompt, setNewPrompt] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctChoice, setCorrectChoice] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [correctEssay, setCorrectEssay] = useState('');

  if (!isOpen) return null;

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAdminLogin(adminKey, adminCode)) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Key Admin atau Kode Unik Admin tidak sesuai.');
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;

    const item: QuestionItem =
      newType === 'pilihan_ganda'
        ? {
            id: `q-${Date.now()}`,
            type: 'pilihan_ganda',
            prompt: newPrompt.trim(),
            options: {
              A: optA.trim() || 'Pilihan A',
              B: optB.trim() || 'Pilihan B',
              C: optC.trim() || 'Pilihan C',
              D: optD.trim() || 'Pilihan D',
            },
            correctAnswer: correctChoice,
          }
        : {
            id: `q-${Date.now()}`,
            type: 'essai',
            prompt: newPrompt.trim(),
            correctAnswer: correctEssay.trim(), // Jika dikosongkan Admin, otomatis dijawab oleh Bantuan AI Online!
          };

    onUpdateQuestions([...questions, item]);
    setNewPrompt('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectEssay('');
  };

  const handleDeleteQuestion = (id: string) => {
    onUpdateQuestions(questions.filter((q) => q.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Fitur Admin Database Soal</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Admin"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isAuthenticated ? (
          <form onSubmit={handleAdminAuth} className="space-y-4">
            <p className="text-xs text-slate-400">
              Masukkan Key Admin dan Kode Unik Admin untuk mengelola data soal & jawaban otomatis.
            </p>
            <div>
              <label htmlFor="admin-key" className="block text-xs font-medium text-slate-300 mb-1">
                Key Admin
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-key"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Masukkan key admin"
                  className="w-full pl-9 pr-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-code" className="block text-xs font-medium text-slate-300 mb-1">
                Kode Unik Admin
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-code"
                  type="text"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Masukkan kode unik admin"
                  className="w-full pl-9 pr-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            {authError && (
              <div role="alert" className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 p-2.5 rounded-xl">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Buka Data Admin
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Kode Redeem Aktif Saat Ini:</span>
              <span className="text-xs font-mono font-semibold text-emerald-400">
                {redeemState.activeCode}
              </span>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-3 p-4 rounded-xl bg-[#090d16] border border-slate-800">
              <h3 className="text-sm font-semibold text-white">Tambah Data Soal Baru</h3>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewType('pilihan_ganda')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    newType === 'pilihan_ganda'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Pilihan Ganda
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('essai')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    newType === 'essai'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Essai
                </button>
              </div>

              <div>
                <label htmlFor="admin-question-prompt" className="block text-xs text-slate-400 mb-1">
                  Teks Soal
                </label>
                <input
                  id="admin-question-prompt"
                  type="text"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Tulis pertanyaan soal..."
                  className="w-full px-3 py-2 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              {newType === 'pilihan_ganda' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    placeholder="Opsi A"
                    aria-label="Opsi A"
                    className="px-3 py-1.5 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    placeholder="Opsi B"
                    aria-label="Opsi B"
                    className="px-3 py-1.5 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    placeholder="Opsi C"
                    aria-label="Opsi C"
                    className="px-3 py-1.5 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    placeholder="Opsi D"
                    aria-label="Opsi D"
                    className="px-3 py-1.5 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <div className="col-span-2 flex items-center gap-2 pt-1">
                    <label htmlFor="admin-correct-choice" className="text-xs text-slate-400">
                      Kunci Jawaban:
                    </label>
                    <select
                      id="admin-correct-choice"
                      value={correctChoice}
                      onChange={(e) => setCorrectChoice(e.target.value as 'A' | 'B' | 'C' | 'D')}
                      className="px-2.5 py-1 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="admin-correct-essay" className="block text-xs text-slate-400 mb-1">
                    Kunci Jawaban Essai (Kosongkan jika ingin dijawab otomatis oleh Bantuan AI)
                  </label>
                  <input
                    id="admin-correct-essay"
                    type="text"
                    value={correctEssay}
                    onChange={(e) => setCorrectEssay(e.target.value)}
                    placeholder="Tulis kunci jawaban atau kosongkan agar dicari AI di internet..."
                    className="w-full px-3 py-2 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan Soal ke Database</span>
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300">
                Daftar Soal Tersimpan ({questions.length})
              </h3>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 bg-[#090d16] flex items-start justify-between gap-3"
                  >
                    <div className="text-xs space-y-1">
                      <p className="font-medium text-slate-200">
                        {idx + 1}. {q.prompt}
                      </p>
                      <p className="text-slate-400 font-mono">
                        Tipe: {q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Essai'} · Kunci:{' '}
                        <span className="text-emerald-400">
                          {q.correctAnswer ? q.correctAnswer : 'Otomatis Dijawab Bantuan AI (Internet)'}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      aria-label={`Hapus soal ${idx + 1}`}
                      className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
