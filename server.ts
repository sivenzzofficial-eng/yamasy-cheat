import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { solveQuestionWithAi } from './src/utils/aiSolver.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health/Online status endpoint
  app.get('/api/online-check', (_req, res) => {
    res.json({ online: true, timestamp: Date.now() });
  });

  // Real Online AI & Internet Knowledge Solver Endpoint
  app.post('/api/ai-answer', async (req, res) => {
    try {
      const { prompt, type, options } = req.body as {
        prompt?: string;
        type?: 'pilihan_ganda' | 'essai';
        options?: { A: string; B: string; C: string; D: string };
      };

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Pertanyaan kosong.' });
        return;
      }

      // 1. If GEMINI_API_KEY is configured and has quota, try Gemini + Google Search Grounding first
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10) {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        try {
          if (type === 'pilihan_ganda' && options) {
            const response = await ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: `Pertanyaan Pilihan Ganda:\n${prompt}\nA: ${options.A}\nB: ${options.B}\nC: ${options.C}\nD: ${options.D}\n\nJawab HANYA 1 huruf kapital: A, B, C, atau D.`,
              config: {
                systemInstruction:
                  'Kamu adalah mesin penjawab ujian otomatis yang akurat. Balas HANYA dengan 1 huruf kapital: A, B, C, atau D.',
                tools: [{ googleSearch: {} }],
              },
            });
            const raw = (response.text ?? '').trim().toUpperCase();
            const letter = raw.match(/\b([ABCD])\b/)?.[1];
            if (letter) {
              res.json({ answer: letter, source: 'Gemini AI + Google Search' });
              return;
            }
          } else {
            const response = await ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: `Pertanyaan Essai:\n${prompt}\n\nBerikan jawaban paling tepat dan singkat (1-4 kata saja tanpa kalimat pengantar):`,
              config: {
                systemInstruction:
                  'Kamu adalah mesin penjawab ujian otomatis. Berikan langsung jawaban intinya secara singkat dan akurat.',
                tools: [{ googleSearch: {} }],
              },
            });
            const ans = (response.text ?? '').trim().replace(/^["']|["']$/g, '');
            if (ans) {
              res.json({ answer: ans, source: 'Gemini AI + Google Search' });
              return;
            }
          }
        } catch {
          // Proceed to multi-engine online solver (Wikipedia + Wikidata + MyMemory + Math)
        }
      }

      // 2. Multi-Engine Online Solver (Wikipedia Live API + Wikidata Multilingual Dictionary + Math Engine)
      const result = await solveQuestionWithAi({
        prompt,
        type: type || 'essai',
        options,
      });

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghubungi AI Search.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`yamasy server running on http://localhost:${PORT}`);
  });
}

startServer();
