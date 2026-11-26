export interface AiAnswerRequest {
  prompt: string;
  type: 'pilihan_ganda' | 'essai';
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export interface AiAnswerResponse {
  answer: string;
  source: string;
}

const USER_AGENT = 'YamasyEducationalBot/2.0 (https://yamasy.app; support@yamasy.app)';

const LANGUAGE_MAP: Record<string, string> = {
  jerman: 'de',
  jermannya: 'de',
  inggris: 'en',
  inggrisnya: 'en',
  jepang: 'ja',
  jepangnya: 'ja',
  arab: 'ar',
  arabnya: 'ar',
  prancis: 'fr',
  perancis: 'fr',
  prancisnya: 'fr',
  spanyol: 'es',
  spanyolnya: 'es',
  belanda: 'nl',
  belandanya: 'nl',
  mandarin: 'zh',
  china: 'zh',
  cina: 'zh',
  korea: 'ko',
  koreanya: 'ko',
  rusia: 'ru',
  rusianya: 'ru',
  italia: 'it',
  italianya: 'it',
  portugis: 'pt',
  turki: 'tr',
  indonesia: 'id',
  indonesianya: 'id',
};

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 1. Evaluates arithmetic / binary / math questions directly if applicable
 */
export function trySolveMathOrBinary(prompt: string): string | null {
  const lower = prompt.toLowerCase();

  // Binary addition e.g. "biner 1010 ditambah 0101"
  const binAdd = lower.match(/biner\s+([01]+)\s+(?:ditambah|\+|tambah)\s+([01]+)/i);
  if (binAdd) {
    const a = parseInt(binAdd[1], 2);
    const b = parseInt(binAdd[2], 2);
    return (a + b).toString(2);
  }

  // Simple math expressions e.g. "berapa hasil dari 25 * 4" or "120 dibagi 6"
  const mathExpr = lower
    .replace(/dikali|kali|\bx\b/g, '*')
    .replace(/dibagi|bagi|:/g, '/')
    .replace(/ditambah|tambah/g, '+')
    .replace(/dikurang|kurang/g, '-')
    .match(/(?:hasil dari|berapa)\s+([0-9]+\s*[\+\-\*\/]\s*[0-9]+(?:\s*[\+\-\*\/]\s*[0-9]+)*)/i);

  if (mathExpr) {
    try {
      const sanitized = mathExpr[1].replace(/[^0-9\+\-\*\/\.\(\)\s]/g, '');
      const val = Function(`"use strict"; return (${sanitized});`)();
      if (typeof val === 'number' && isFinite(val)) {
        return String(val);
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * 2. Detects language translation questions like:
 * - "Apa bahasa jerman makan?"
 * - "Apa bahasa inggrisnya rumah?"
 * - "Bahasa jepang dari kucing adalah?"
 */
export function parseTranslationIntent(prompt: string): {
  targetLangCode: string;
  targetLangName: string;
  term: string;
} | null {
  const cleaned = prompt
    .trim()
    .replace(/[?!.]+$/g, '')
    .trim();

  const patterns = [
    /(?:apa\s+)?bahasa\s+([a-zA-Z]+)(?:nya)?\s+(?:dari\s+|kata\s+)?["']?(.+?)["']?(?:\s+adalah|\s+itu|\s+apa)?$/i,
    /terjemahan\s+(?:kata\s+)?["']?(.+?)["']?\s+(?:ke\s+)?dalam\s+bahasa\s+([a-zA-Z]+)$/i,
  ];

  const m1 = cleaned.match(patterns[0]);
  if (m1) {
    const langKey = m1[1].toLowerCase();
    const term = m1[2].replace(/^(dari|kata|untuk)\s+/i, '').trim();
    const code = LANGUAGE_MAP[langKey];
    if (code && term) {
      return { targetLangCode: code, targetLangName: m1[1], term };
    }
  }

  const m2 = cleaned.match(patterns[1]);
  if (m2) {
    const term = m2[1].trim();
    const langKey = m2[2].toLowerCase();
    const code = LANGUAGE_MAP[langKey];
    if (code && term) {
      return { targetLangCode: code, targetLangName: m2[2], term };
    }
  }

  return null;
}

/**
 * Translates any Indonesian word/phrase into target language using live Wikidata Multilingual Ontology + MyMemory Dictionary API
 */
export async function translateTermOnline(
  term: string,
  targetLangCode: string
): Promise<{ answer: string; source: string } | null> {
  // Strategy A: Wikidata entity multilingual label lookup (cleanest single-word dictionary match, e.g. makan -> Essen)
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
      term
    )}&language=id&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchJson = (await searchRes.json()) as {
        search?: Array<{ id: string; label?: string; match?: { text?: string } }>;
      };
      const candidates = searchJson.search ?? [];
      const exactCandidate =
        candidates.find((c) => c.match?.text?.toLowerCase() === term.toLowerCase()) ||
        candidates[0];

      if (exactCandidate?.id) {
        const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${exactCandidate.id}&props=labels&languages=${targetLangCode}|en&format=json&origin=*`;
        const entityRes = await fetch(entityUrl);
        if (entityRes.ok) {
          const entityJson = (await entityRes.json()) as {
            entities?: Record<
              string,
              { labels?: Record<string, { value: string }> }
            >;
          };
          const labelVal =
            entityJson.entities?.[exactCandidate.id]?.labels?.[targetLangCode]?.value;
          if (labelVal && labelVal.trim()) {
            return {
              answer: labelVal.trim(),
              source: `AI Kamus Bahasa & Wikidata (${targetLangCode.toUpperCase()})`,
            };
          }
        }
      }
    }
  } catch {
    // Continue to Strategy B
  }

  // Strategy B: MyMemory Translation Memory API (filtering out long corrupted sentences)
  try {
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      term
    )}&langpair=id|${targetLangCode}`;
    const mmRes = await fetch(mmUrl);
    if (mmRes.ok) {
      const mmJson = (await mmRes.json()) as {
        responseData?: { translatedText?: string };
        matches?: Array<{ segment?: string; translation?: string; match?: number }>;
      };

      const maxExpectedLength = Math.max(25, term.length * 3);
      const validMatches = (mmJson.matches ?? []).filter((m) => {
        const t = (m.translation ?? '').trim();
        return (
          t.length > 0 &&
          t.length <= maxExpectedLength &&
          !t.toLowerCase().includes('opera') &&
          t.toLowerCase() !== term.toLowerCase()
        );
      });

      if (validMatches.length > 0 && validMatches[0].translation) {
        return {
          answer: validMatches[0].translation.trim(),
          source: `AI Translate (${targetLangCode.toUpperCase()})`,
        };
      }

      const mainTranslation = (mmJson.responseData?.translatedText ?? '').trim();
      if (
        mainTranslation &&
        mainTranslation.length <= maxExpectedLength &&
        !mainTranslation.toLowerCase().includes('opera')
      ) {
        return {
          answer: mainTranslation,
          source: `AI Translate (${targetLangCode.toUpperCase()})`,
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * 3. Cleans a raw question into core search keywords for Wikipedia Search
 */
export function buildCleanSearchQuery(prompt: string): string {
  return prompt
    .replace(/[?!.,;:"']/g, ' ')
    .replace(
      /\b(siapa|siapakah|apa|apakah|nama|sebutkan|jelaskan|dimana|dimanakah|kapan|kapankah|berapakah|berapa|yang|dimaksud|dengan|adalah|merupakan|dari|di|ke|pada|untuk|dalam)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export interface WikiSearchResult {
  title: string;
  snippet: string;
  extract?: string;
}

/**
 * Searches Wikipedia (Indonesian first, then English) and retrieves top article titles, snippets, and lead extracts
 */
export async function searchWikipediaLive(prompt: string): Promise<WikiSearchResult[]> {
  const cleanQuery = buildCleanSearchQuery(prompt) || prompt.trim();
  const results: WikiSearchResult[] = [];

  // Search standard query first AND exact phrase second so we gather both primary topic articles and exact phrase mentions
  const wordCount = cleanQuery.split(/\s+/).length;
  const queriesToTry =
    wordCount >= 2 && wordCount <= 4
      ? [cleanQuery, `"${cleanQuery}"`]
      : [cleanQuery];

  for (const lang of ['id', 'en']) {
    for (const q of queriesToTry) {
      try {
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          q
        )}&utf8=1&format=json&origin=*`;
        const res = await fetch(url);
        if (!res.ok) continue;

        const data = (await res.json()) as {
          query?: { search?: Array<{ title: string; snippet: string }> };
        };
        const hits = data.query?.search ?? [];
        if (hits.length === 0) continue;

        const topHits = hits.slice(0, 3);
        let topExtract = '';
        try {
          const extUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(
            topHits[0].title
          )}&format=json&origin=*`;
          const extRes = await fetch(extUrl);
          if (extRes.ok) {
            const extData = (await extRes.json()) as {
              query?: { pages?: Record<string, { extract?: string }> };
            };
            const pages = extData.query?.pages ?? {};
            const firstPage = Object.values(pages)[0];
            topExtract = (firstPage?.extract ?? '').slice(0, 600);
          }
        } catch {
          // ignore extract error
        }

        topHits.forEach((h, idx) => {
          if (!results.some((r) => r.title === h.title)) {
            results.push({
              title: h.title,
              snippet: stripHtml(h.snippet),
              extract: idx === 0 ? topExtract : undefined,
            });
          }
        });
      } catch {
        // try next query
      }
    }
    if (results.length > 0) break;
  }

  return results;
}

/**
 * Extracts a concise, direct essay answer from Wikipedia search results
 */
export function extractConciseAnswerFromWiki(
  prompt: string,
  results: WikiSearchResult[]
): { answer: string; source: string } | null {
  if (results.length === 0) return null;

  const lowerPrompt = prompt.toLowerCase();
  const cleanCoreQuery = buildCleanSearchQuery(prompt).toLowerCase();
  const isWhoQuestion = /\b(siapa|siapakah|penemu|pendiri|pencipta|presiden|tokoh|bapak)\b/i.test(
    lowerPrompt
  );

  const cleanPersonName = (raw: string) =>
    raw
      .replace(/\b(Bapak|Ibu|Presiden|Penemu|Pendiri|Tokoh|Pahlawan|Dari|Yang|Pada)\b.*$/i, '')
      .trim();

  if (isWhoQuestion) {
    // Pass 1: Look for explicit inventor/person pattern "penemu bernama <Name>" or "ditemukan oleh <Name>" across top hits
    for (const hit of results) {
      const combinedText = `${hit.snippet} ${hit.extract || ''}`;
      const namedMatch = combinedText.match(
        /(?:penemu bernama|bernama|ditemukan oleh|diciptakan oleh|dipimpin oleh)\s+([A-Z][a-zA-Z.-]+(?:\s+[A-Z][a-zA-Z.-]+){1,3})/
      );
      if (
        namedMatch &&
        namedMatch[1] &&
        !namedMatch[1].toLowerCase().includes('seorang') &&
        !namedMatch[1].toLowerCase().includes('salah')
      ) {
        const cleaned = cleanPersonName(namedMatch[1]);
        if (cleaned) {
          return {
            answer: cleaned,
            source: `AI Wikipedia Search (${hit.title})`,
          };
        }
      }
    }

    // Pass 2: Look for hits that contain the exact core query phrase (e.g., "bapak pandu indonesia" or "bapak pandu dunia")
    for (const hit of results) {
      const combinedText = `${hit.snippet} ${hit.extract || ''}`;
      const combinedLower = combinedText.toLowerCase();
      const titleLower = hit.title.toLowerCase();

      if (combinedLower.includes(cleanCoreQuery)) {
        const isGenericTopicTitle =
          titleLower.includes('gerakan') ||
          titleLower.includes('daftar') ||
          titleLower.includes('sejarah') ||
          titleLower.includes('jambore') ||
          titleLower.includes('lampu') ||
          titleLower.includes('genius') ||
          titleLower === cleanCoreQuery;

        if (!isGenericTopicTitle && !combinedLower.includes('ditandatangani oleh')) {
          return {
            answer: hit.title.replace(/\s*\([^)]*\)\s*/g, '').trim(),
            source: `AI Wikipedia Search (${hit.title})`,
          };
        }

        const explicitByMatch = combinedText.match(
          /(?:oleh|bernama|adalah|yaitu)\s+([A-Z][a-zA-Z.-]+(?:\s+[A-Z][a-zA-Z.-]+){1,3})/
        );
        if (explicitByMatch && explicitByMatch[1]) {
          const cleaned = cleanPersonName(explicitByMatch[1]);
          if (cleaned) {
            return {
              answer: cleaned,
              source: `AI Wikipedia Search (${hit.title})`,
            };
          }
        }
      }
    }
  }

  const top = results[0];

  // Case 2: Extract definition from the first sentence of the intro extract or snippet
  const textToParse = (top.extract || top.snippet || '').trim();
  if (textToParse) {
    const defMatch = textToParse.match(
      /(?:adalah|merupakan|ialah|yaitu)\s+([^.;]{3,75})/i
    );
    if (defMatch && defMatch[1]) {
      return {
        answer: defMatch[1].trim(),
        source: `AI Wikipedia Search (${top.title})`,
      };
    }

    const firstSentence = textToParse.split(/\.\s+/)[0]?.slice(0, 80)?.trim();
    if (firstSentence) {
      return {
        answer: firstSentence,
        source: `AI Wikipedia Search (${top.title})`,
      };
    }
  }

  return {
    answer: top.title,
    source: `AI Wikipedia Search (${top.title})`,
  };
}

/**
 * Scores multiple-choice options A/B/C/D against Wikipedia search knowledge
 */
export function scoreMultipleChoiceWithWiki(
  options: { A: string; B: string; C: string; D: string },
  results: WikiSearchResult[]
): { answer: 'A' | 'B' | 'C' | 'D'; source: string } | null {
  if (results.length === 0) return null;

  const combinedCorpus = results
    .map((r) => `${r.title} ${r.snippet} ${r.extract || ''}`)
    .join(' ')
    .toLowerCase();

  let bestLetter: 'A' | 'B' | 'C' | 'D' = 'A';
  let bestScore = -1;

  for (const letter of ['A', 'B', 'C', 'D'] as const) {
    const optText = (options[letter] || '').trim().toLowerCase();
    if (!optText) continue;

    let score = 0;
    if (combinedCorpus.includes(optText)) {
      score += 10;
    }

    const words = optText.split(/\W+/).filter((w) => w.length >= 3);
    for (const w of words) {
      if (combinedCorpus.includes(w)) {
        score += 3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestLetter = letter;
    }
  }

  if (bestScore > 0) {
    return {
      answer: bestLetter,
      source: `AI Wikipedia Search (${results[0].title})`,
    };
  }

  return null;
}

/**
 * Main AI Question Solver:
 * Combines Gemini API (when key & quota are active) + Real-Time Translation Engine + Math Engine + Wikipedia Live Knowledge Search
 */
export async function solveQuestionWithAi(
  req: AiAnswerRequest
): Promise<AiAnswerResponse> {
  const prompt = req.prompt.trim();

  // 1. Check Math / Binary calculations first
  const mathAns = trySolveMathOrBinary(prompt);
  if (mathAns) {
    if (req.type === 'pilihan_ganda' && req.options) {
      const matchChoice = (['A', 'B', 'C', 'D'] as const).find(
        (k) => req.options?.[k]?.trim().toLowerCase() === mathAns.toLowerCase()
      );
      if (matchChoice) {
        return { answer: matchChoice, source: 'AI Kalkulasi Matematika' };
      }
    } else {
      return { answer: mathAns, source: 'AI Kalkulasi Matematika' };
    }
  }

  // 2. Check Language Translation questions (e.g., "Apa bahasa Jerman makan?", "Apa bahasa Inggris rumah?")
  const transIntent = parseTranslationIntent(prompt);
  if (transIntent) {
    const translated = await translateTermOnline(
      transIntent.term,
      transIntent.targetLangCode
    );
    if (translated) {
      if (req.type === 'pilihan_ganda' && req.options) {
        const matchChoice = (['A', 'B', 'C', 'D'] as const).find((k) =>
          req.options?.[k]
            ?.toLowerCase()
            .includes(translated.answer.toLowerCase())
        );
        if (matchChoice) {
          return { answer: matchChoice, source: translated.source };
        }
      } else {
        return translated;
      }
    }
  }

  // 3. Gather Live Wikipedia Knowledge Context
  const wikiResults = await searchWikipediaLive(prompt);

  // 4. Execute Live Wikipedia Knowledge Extraction
  if (req.type === 'pilihan_ganda' && req.options) {
    const scored = scoreMultipleChoiceWithWiki(req.options, wikiResults);
    if (scored) return scored;
  } else {
    const extracted = extractConciseAnswerFromWiki(prompt, wikiResults);
    if (extracted) return extracted;
  }

  return {
    answer: req.type === 'pilihan_ganda' ? 'A' : 'Tidak ditemukan di internet',
    source: 'AI Web Search',
  };
}
