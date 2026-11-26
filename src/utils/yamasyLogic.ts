export interface QuestionItem {
  id: string;
  type: 'pilihan_ganda' | 'essai';
  prompt: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D' for pilihan_ganda, or essay text for essai
}

export const LOGIN_PASSWORD = '112233';
export const LOGIN_UNIQUE_CODE = 'yamasy-cheat';

export const ADMIN_KEY = '112233';
export const ADMIN_UNIQUE_CODE = 'yamasy-cheat';

export const INITIAL_REDEEM_CODE = 'KOIN-101010-YAMASY-CHEAT';
export const COINS_PER_REDEEM = 10;
export const COINS_PER_USE = 5;

export const WHATSAPP_DISPLAY = '088245340881';
export const WHATSAPP_URL = 'https://wa.me/6288245340881';

export function validateUserLogin(password: string, uniqueCode: string): boolean {
  return password.trim() === LOGIN_PASSWORD && uniqueCode.trim() === LOGIN_UNIQUE_CODE;
}

export function validateAdminLogin(adminKey: string, adminCode: string): boolean {
  return adminKey.trim() === ADMIN_KEY && adminCode.trim() === ADMIN_UNIQUE_CODE;
}

/**
 * Generates the next redeem code by multiplying the last 2 digits of the numeric middle segment by 2
 * (or if the numeric part ends with a number, multiplies that number by 2).
 * Specifically: KOIN-101010-YAMASY-CHEAT -> numeric segment "101010" -> prefix "1010", last number "10" * 2 = "20" -> KOIN-101020-YAMASY-CHEAT
 * Next: KOIN-101020-YAMASY-CHEAT -> "1010" + (20 * 2 = 40) -> KOIN-101040-YAMASY-CHEAT
 * Next: KOIN-101040-YAMASY-CHEAT -> "1010" + (40 * 2 = 80) -> KOIN-101080-YAMASY-CHEAT
 * Next: KOIN-101080-YAMASY-CHEAT -> "1010" + (80 * 2 = 160) -> KOIN-1010160-YAMASY-CHEAT
 */
export function generateNextRedeemCode(currentCode: string): string {
  const parts = currentCode.trim().toUpperCase().split('-');
  if (parts.length !== 4 || parts[0] !== 'KOIN') {
    return INITIAL_REDEEM_CODE;
  }
  const numPart = parts[1];
  if (numPart.startsWith('1010') && numPart.length > 4) {
    const tailStr = numPart.slice(4);
    const tailNum = parseInt(tailStr, 10);
    if (!isNaN(tailNum) && tailNum > 0) {
      const nextTail = tailNum * 2;
      return `KOIN-1010${nextTail}-YAMASY-CHEAT`;
    }
  }
  const fullNum = parseInt(numPart, 10);
  if (!isNaN(fullNum) && fullNum > 0) {
    return `KOIN-${fullNum * 2}-YAMASY-CHEAT`;
  }
  return INITIAL_REDEEM_CODE;
}

export interface RedeemState {
  activeCode: string;
  usedCodes: string[];
  coins: number;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  nextState: RedeemState;
}

export function redeemCoinCode(inputCode: string, state: RedeemState): RedeemResult {
  const normalized = inputCode.trim().toUpperCase();
  if (!normalized) {
    return {
      success: false,
      message: 'Masukkan kode unik terlebih dahulu.',
      nextState: state,
    };
  }

  if (state.usedCodes.includes(normalized)) {
    return {
      success: false,
      message: 'Kode unik ini sudah pernah di-redeem dan tidak bisa digunakan lagi.',
      nextState: state,
    };
  }

  if (normalized !== state.activeCode.toUpperCase()) {
    return {
      success: false,
      message: 'Kode unik tidak valid.',
      nextState: state,
    };
  }

  const nextActiveCode = generateNextRedeemCode(state.activeCode);
  return {
    success: true,
    message: `Berhasil redeem +${COINS_PER_REDEEM} koin!`,
    nextState: {
      activeCode: nextActiveCode,
      usedCodes: [...state.usedCodes, normalized],
      coins: state.coins + COINS_PER_REDEEM,
    },
  };
}

export function canStartMainFeature(coins: number): boolean {
  return coins >= COINS_PER_USE;
}

export function deductCoinsForFeature(coins: number): { success: boolean; remainingCoins: number } {
  if (!canStartMainFeature(coins)) {
    return { success: false, remainingCoins: coins };
  }
  return { success: true, remainingCoins: coins - COINS_PER_USE };
}

export function matchQuestionFromDatabase(
  promptText: string,
  database: QuestionItem[]
): QuestionItem | undefined {
  const normalizedPrompt = promptText.trim().toLowerCase();
  if (!normalizedPrompt) return undefined;
  return database.find((item) => {
    const dbPrompt = item.prompt.trim().toLowerCase();
    const ans = (item.correctAnswer || '').trim();
    const ansLower = ans.toLowerCase();
    // Ignore empty or generic placeholder answers so real AI solves them
    const hasValidAnswer =
      ans.length > 0 &&
      ansLower !== 'jawaban essai' &&
      ansLower !== 'soal essai';
    return (
      hasValidAnswer &&
      (dbPrompt === normalizedPrompt ||
        normalizedPrompt.includes(dbPrompt) ||
        dbPrompt.includes(normalizedPrompt))
    );
  });
}

export function isTripleClick(timestamps: number[], now: number, windowMs = 700): {
  triggered: boolean;
  updatedTimestamps: number[];
} {
  const recent = [...timestamps, now].filter((t) => now - t <= windowMs);
  if (recent.length >= 3) {
    return {
      triggered: true,
      updatedTimestamps: [],
    };
  }
  return {
    triggered: false,
    updatedTimestamps: recent,
  };
}

export const DEFAULT_QUESTIONS: QuestionItem[] = [
  {
    id: 'q1',
    type: 'pilihan_ganda',
    prompt: 'Manakah protokol jaringan yang digunakan untuk mengamankan komunikasi HTTP?',
    options: {
      A: 'FTP',
      B: 'HTTPS (TLS/SSL)',
      C: 'SMTP',
      D: 'Telnet',
    },
    correctAnswer: 'B',
  },
  {
    id: 'q2',
    type: 'essai',
    prompt: 'Sebutkan perintah dasar untuk melihat daftar file di terminal Linux!',
    correctAnswer: 'ls -la',
  },
  {
    id: 'q3',
    type: 'pilihan_ganda',
    prompt: 'Berapa hasil dari operasi biner 1010 ditambah 0101?',
    options: {
      A: '1100',
      B: '1110',
      C: '1111',
      D: '1001',
    },
    correctAnswer: 'C',
  },
  {
    id: 'q4',
    type: 'essai',
    prompt: 'Siapa nama bapak pandu dunia?',
    correctAnswer: '', // Kosong di database lokal -> otomatis dicari oleh Bantuan AI via Google Search!
  },
];
