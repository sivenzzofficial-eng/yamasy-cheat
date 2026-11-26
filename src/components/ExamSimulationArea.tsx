import React, { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, Keyboard, Globe, Plus } from 'lucide-react';
import { QuestionItem, matchQuestionFromDatabase } from '../utils/yamasyLogic';
import { solveQuestionWithAi } from '../utils/aiSolver';
import '../utils/nativeBridge';

interface ExamSimulationAreaProps {
  questions: QuestionItem[];
  isBotOn: boolean;
  isOnline: boolean;
  onBotFinished: () => void;
}

export default function ExamSimulationArea({
  questions,
  isBotOn,
  isOnline,
  onBotFinished,
}: ExamSimulationAreaProps) {
  const [examQuestions, setExamQuestions] = useState<QuestionItem[]>(questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [scanningChoice, setScanningChoice] = useState<string | null>(null);
  const [essayValue, setEssayValue] = useState('');
  const [isEssayFocused, setIsEssayFocused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [botStatusText, setBotStatusText] = useState('Menunggu instruksi panel...');
  const [aiSourceBadge, setAiSourceBadge] = useState<string | null>(null);
  const [answersRecord, setAnswersRecord] = useState<Record<string, string>>({});

  // Custom external question tester (not in Admin DB) to test AI Googling live
  const [customExternalPrompt, setCustomExternalPrompt] = useState('');
  const [customExternalType, setCustomExternalType] = useState<'essai' | 'pilihan_ganda'>('essai');

  useEffect(() => {
    setExamQuestions((prev) => {
      const customOnly = prev.filter((q) => q.id.startsWith('ext-'));
      return [...questions, ...customOnly];
    });
  }, [questions]);

  const currentQuestion = examQuestions[currentIndex];

  const handleResetExam = () => {
    setCurrentIndex(0);
    setSelectedChoice(null);
    setScanningChoice(null);
    setEssayValue('');
    setIsEssayFocused(false);
    setIsFinished(false);
    setAnswersRecord({});
    setAiSourceBadge(null);
    setBotStatusText('Ujian direset. Siap dijalankan.');
  };

  const handleAddExternalQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customExternalPrompt.trim()) return;
    const newExt: QuestionItem =
      customExternalType === 'essai'
        ? {
            id: `ext-${Date.now()}`,
            type: 'essai',
            prompt: customExternalPrompt.trim(),
            correctAnswer: '', // Empty so AI Google Search solves it!
          }
        : {
            id: `ext-${Date.now()}`,
            type: 'pilihan_ganda',
            prompt: customExternalPrompt.trim(),
            options: {
              A: 'Lord Baden-Powell',
              B: 'Abraham Lincoln',
              C: 'Thomas Alva Edison',
              D: 'Alexander Graham Bell',
            },
            correctAnswer: '', // Empty so AI Google Search solves it!
          };

    setExamQuestions((prev) => [...prev, newExt]);
    setCustomExternalPrompt('');
    if (isFinished) {
      setIsFinished(false);
    }
  };

  const handleNextManual = () => {
    if (!currentQuestion) return;
    const savedAns =
      currentQuestion.type === 'pilihan_ganda' ? selectedChoice || '' : essayValue;
    setAnswersRecord((prev) => ({ ...prev, [currentQuestion.id]: savedAns }));

    if (currentIndex + 1 < examQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedChoice(null);
      setScanningChoice(null);
      setEssayValue('');
      setIsEssayFocused(false);
      setAiSourceBadge(null);
    } else {
      setIsFinished(true);
    }
  };

  // Bot automation effect when isBotOn is true (continues running in background even when panel is hidden)
  useEffect(() => {
    if (!isBotOn) {
      setBotStatusText('Bot OFF');
      return;
    }

    if (!isOnline) {
      setBotStatusText('Koneksi terputus! Wajib ONLINE agar AI & Bot dapat bekerja.');
      return;
    }

    if (isFinished) {
      setBotStatusText('Menemukan kata SELESAI — Bot berhenti otomatis.');
      onBotFinished();
      return;
    }

    if (!currentQuestion) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const runBotForCurrentQuestion = async () => {
      setAiSourceBadge(null);
      setBotStatusText(`Membaca soal #${currentIndex + 1} & mengecek database Admin...`);

      // 1. Check Admin Database first
      const matched = matchQuestionFromDatabase(currentQuestion.prompt, questions);
      let targetAnswer = matched?.correctAnswer?.trim() || '';

      // 2. If not found in Admin Database, use AI Assistant + Google Search (Googling)
      if (!targetAnswer) {
        setBotStatusText(
          `Soal tidak ada di database! Bantuan AI sedang Googling jawaban di internet...`
        );
        try {
          const resp = await fetch('/api/ai-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: currentQuestion.prompt,
              type: currentQuestion.type,
              options: currentQuestion.options,
            }),
          });
          const data = await resp.json();
          if (cancelled) return;
          if (resp.ok && data.answer) {
            targetAnswer = String(data.answer).trim();
            setAiSourceBadge(data.source || 'Bantuan AI (Internet Search)');
            setBotStatusText(`Bantuan AI menemukan jawaban dari internet: "${targetAnswer}"`);
          } else {
            const directResult = await solveQuestionWithAi({
              prompt: currentQuestion.prompt,
              type: currentQuestion.type,
              options: currentQuestion.options,
            });
            if (cancelled) return;
            targetAnswer = directResult.answer;
            setAiSourceBadge(directResult.source);
            setBotStatusText(`Bantuan AI menemukan jawaban dari internet: "${targetAnswer}"`);
          }
        } catch {
          if (cancelled) return;
          try {
            const directResult = await solveQuestionWithAi({
              prompt: currentQuestion.prompt,
              type: currentQuestion.type,
              options: currentQuestion.options,
            });
            if (cancelled) return;
            targetAnswer = directResult.answer;
            setAiSourceBadge(directResult.source);
            setBotStatusText(`Bantuan AI menemukan jawaban dari internet: "${targetAnswer}"`);
          } catch {
            if (cancelled) return;
            targetAnswer =
              currentQuestion.type === 'pilihan_ganda'
                ? 'A'
                : 'Koneksi ke server AI terputus';
            setAiSourceBadge('Error Koneksi AI');
          }
        }
      } else {
        setAiSourceBadge('Database Admin');
      }

      if (cancelled) return;

      if (currentQuestion.type === 'pilihan_ganda') {
        const choices: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
        choices.forEach((choice, idx) => {
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setScanningChoice(choice);
              setBotStatusText(`Membaca pilihan ${choice} satu per satu...`);
            }, 350 * (idx + 1))
          );
        });

        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setScanningChoice(null);
            setSelectedChoice(targetAnswer);
            setBotStatusText(`Memencet tombol pilihan ganda ${targetAnswer}`);
            if (window.Android?.performAutoClick) {
              window.Android.performAutoClick(540, 1200);
            }
          }, 1650)
        );

        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setBotStatusText('Mencari & menekan tombol Selanjutnya...');
            if (window.Android?.performAutoClick) {
              window.Android.performAutoClick(850, 1600);
            }
            setAnswersRecord((prev) => ({ ...prev, [currentQuestion.id]: targetAnswer }));
            if (currentIndex + 1 < examQuestions.length) {
              setCurrentIndex((prev) => prev + 1);
              setSelectedChoice(null);
              setEssayValue('');
            } else {
              setIsFinished(true);
            }
          }, 2350)
        );
      } else {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setIsEssayFocused(true);
            setBotStatusText('Menekan kolom essai & mengetik sesuai keyboard...');
            if (window.Android?.performAutoType) {
              window.Android.performAutoType(targetAnswer);
            }
          }, 350)
        );

        const chars = targetAnswer.split('');
        chars.forEach((_, charIdx) => {
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setEssayValue(targetAnswer.slice(0, charIdx + 1));
            }, 550 + charIdx * 55)
          );
        });

        const finishTypingDelay = 550 + chars.length * 55 + 450;
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setIsEssayFocused(false);
            setBotStatusText('Selesai mengetik essai, langsung lanjut...');
            setAnswersRecord((prev) => ({ ...prev, [currentQuestion.id]: targetAnswer }));
            if (currentIndex + 1 < examQuestions.length) {
              setCurrentIndex((prev) => prev + 1);
              setSelectedChoice(null);
              setEssayValue('');
            } else {
              setIsFinished(true);
            }
          }, finishTypingDelay)
        );
      }
    };

    void runBotForCurrentQuestion();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [isBotOn, isOnline, currentIndex, isFinished, currentQuestion, questions, examQuestions.length, onBotFinished]);

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white">
            Layar Target Soal (Database Admin + Bantuan AI Google Search)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Status Bot: <span className="font-mono text-blue-400">{botStatusText}</span>
          </p>
          {aiSourceBadge && (
            <p className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Sumber Jawaban: {aiSourceBadge}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleResetExam}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Ulangi Soal</span>
        </button>
      </div>

      {!isFinished && currentQuestion ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>
              SOAL {currentIndex + 1} DARI {examQuestions.length}
            </span>
            <span>
              TIPE: {currentQuestion.type === 'pilihan_ganda' ? 'PILIHAN GANDA' : 'ESSAI'} ·{' '}
              {currentQuestion.correctAnswer ? 'ADA DI DATABASE' : 'TIDAK ADA DI DB (DIJAWAB AI)'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800">
            <p className="text-sm font-medium text-white leading-relaxed">
              {currentQuestion.prompt}
            </p>
          </div>

          {currentQuestion.type === 'pilihan_ganda' && currentQuestion.options ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const isSelected = selectedChoice === letter;
                const isScanning = scanningChoice === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setSelectedChoice(letter)}
                    className={`p-3.5 rounded-xl border text-left text-xs font-medium flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                        : isScanning
                        ? 'bg-blue-950/60 border-blue-400 text-blue-200'
                        : 'bg-[#090d16] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg font-mono font-bold flex items-center justify-center text-xs ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950'
                          : isScanning
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {letter}
                    </span>
                    <span>{currentQuestion.options?.[letter]}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="essay-answer-box" className="block text-xs text-slate-400">
                Kolom Jawaban Essai:
              </label>
              <input
                id="essay-answer-box"
                type="text"
                value={essayValue}
                onChange={(e) => setEssayValue(e.target.value)}
                placeholder="Klik kolom untuk mengetik jawaban..."
                className={`w-full px-4 py-3 rounded-xl bg-[#090d16] border text-sm font-mono text-white transition-colors ${
                  isEssayFocused ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800'
                }`}
              />
              {isEssayFocused && (
                <div className="flex items-center gap-2 text-xs text-blue-400 font-mono">
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Keyboard Virtual Aktif Mengetik...</span>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleNextManual}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-[#090d16] border border-emerald-800/60 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="text-lg font-bold text-white tracking-wide">SELESAI</h4>
          <p className="text-xs text-slate-400">
            Bot telah menemukan kata <span className="font-mono text-emerald-400">SELESAI</span> dan
            berhenti beroperasi secara otomatis. ({Object.keys(answersRecord).length} soal terjawab)
          </p>
        </div>
      )}

      {/* Uji Coba Pertanyaan di Luar Database (Agar Bantuan AI Googling Langsung) */}
      <form
        onSubmit={handleAddExternalQuestion}
        className="pt-4 border-t border-slate-800 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <label
            htmlFor="external-ai-question-input"
            className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Tes Soal di Luar Database (Dijawab Otomatis oleh Bantuan AI via Internet)</span>
          </label>
          <select
            aria-label="Tipe soal luar database"
            value={customExternalType}
            onChange={(e) => setCustomExternalType(e.target.value as 'essai' | 'pilihan_ganda')}
            className="px-2 py-1 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-slate-300"
          >
            <option value="essai">Essai</option>
            <option value="pilihan_ganda">Pilihan Ganda</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input
            id="external-ai-question-input"
            type="text"
            value={customExternalPrompt}
            onChange={(e) => setCustomExternalPrompt(e.target.value)}
            placeholder="Contoh: Siapa nama bapak pandu dunia?"
            className="flex-1 px-3.5 py-2 rounded-xl bg-[#090d16] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Soal</span>
          </button>
        </div>
      </form>
    </div>
  );
}
