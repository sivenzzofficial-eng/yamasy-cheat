import React, { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, Keyboard } from 'lucide-react';
import { QuestionItem, matchQuestionFromDatabase } from '../utils/yamasyLogic';

interface ExamSimulationAreaProps {
  questions: QuestionItem[];
  isBotOn: boolean;
  onBotFinished: () => void;
}

export default function ExamSimulationArea({
  questions,
  isBotOn,
  onBotFinished,
}: ExamSimulationAreaProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [scanningChoice, setScanningChoice] = useState<string | null>(null);
  const [essayValue, setEssayValue] = useState('');
  const [isEssayFocused, setIsEssayFocused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [botStatusText, setBotStatusText] = useState('Menunggu instruksi panel...');
  const [answersRecord, setAnswersRecord] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentIndex];

  const handleResetExam = () => {
    setCurrentIndex(0);
    setSelectedChoice(null);
    setScanningChoice(null);
    setEssayValue('');
    setIsEssayFocused(false);
    setIsFinished(false);
    setAnswersRecord({});
    setBotStatusText('Ujian direset. Siap dijalankan.');
  };

  const handleNextManual = () => {
    if (!currentQuestion) return;
    const savedAns =
      currentQuestion.type === 'pilihan_ganda' ? selectedChoice || '' : essayValue;
    setAnswersRecord((prev) => ({ ...prev, [currentQuestion.id]: savedAns }));

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedChoice(null);
      setScanningChoice(null);
      setEssayValue('');
      setIsEssayFocused(false);
    } else {
      setIsFinished(true);
    }
  };

  // Bot automation effect when isBotOn is true (continues running even when panel is hidden!)
  useEffect(() => {
    if (!isBotOn) {
      setBotStatusText('Bot OFF');
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

    const matched = matchQuestionFromDatabase(currentQuestion.prompt, questions);
    const targetAnswer = matched ? matched.correctAnswer : currentQuestion.correctAnswer;

    setBotStatusText(`Membaca soal #${currentIndex + 1} & mengaitkan database...`);

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

      // Press matching option A/B/C/D
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setScanningChoice(null);
          setSelectedChoice(targetAnswer);
          setBotStatusText(`Memencet tombol pilihan ganda ${targetAnswer}`);
        }, 1650)
      );

      // Press Selanjutnya
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setBotStatusText('Mencari & menekan tombol Selanjutnya...');
          setAnswersRecord((prev) => ({ ...prev, [currentQuestion.id]: targetAnswer }));
          if (currentIndex + 1 < questions.length) {
            setCurrentIndex((prev) => prev + 1);
            setSelectedChoice(null);
            setEssayValue('');
          } else {
            setIsFinished(true);
          }
        }, 2350)
      );
    } else {
      // Essai: focus column, type letter by letter according to keyboard, then click Selanjutnya
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setIsEssayFocused(true);
          setBotStatusText('Menekan kolom essai & mengetik sesuai keyboard...');
        }, 400)
      );

      const chars = targetAnswer.split('');
      chars.forEach((_, charIdx) => {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setEssayValue(targetAnswer.slice(0, charIdx + 1));
          }, 600 + charIdx * 65)
        );
      });

      const finishTypingDelay = 600 + chars.length * 65 + 450;
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setIsEssayFocused(false);
          setBotStatusText('Selesai mengetik essai, langsung lanjut...');
          setAnswersRecord((prev) => ({ ...prev, [currentQuestion.id]: targetAnswer }));
          if (currentIndex + 1 < questions.length) {
            setCurrentIndex((prev) => prev + 1);
            setSelectedChoice(null);
            setEssayValue('');
          } else {
            setIsFinished(true);
          }
        }, finishTypingDelay)
      );
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [isBotOn, currentIndex, isFinished, currentQuestion, questions, onBotFinished]);

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white">Layar Target Soal (Aksesibilitas Bot)</h3>
          <p className="text-xs text-slate-400">
            Status Bot: <span className="font-mono text-blue-400">{botStatusText}</span>
          </p>
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
              SOAL {currentIndex + 1} DARI {questions.length}
            </span>
            <span>
              TIPE: {currentQuestion.type === 'pilihan_ganda' ? 'PILIHAN GANDA' : 'ESSAI'}
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
    </div>
  );
}
