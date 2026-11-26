import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTranslationIntent,
  trySolveMathOrBinary,
  buildCleanSearchQuery,
  extractConciseAnswerFromWiki,
} from './aiSolver';

test('parseTranslationIntent parses general language translation questions accurately', () => {
  const t1 = parseTranslationIntent('Apa bahasa jerman makan?');
  assert.ok(t1);
  assert.equal(t1.targetLangCode, 'de');
  assert.equal(t1.term.toLowerCase(), 'makan');

  const t2 = parseTranslationIntent('Apa bahasa inggrisnya rumah?');
  assert.ok(t2);
  assert.equal(t2.targetLangCode, 'en');
  assert.equal(t2.term.toLowerCase(), 'rumah');
});

test('trySolveMathOrBinary solves binary and arithmetic questions dynamically', () => {
  assert.equal(trySolveMathOrBinary('Berapa hasil dari 25 dikali 4?'), '100');
  assert.equal(trySolveMathOrBinary('Berapa hasil dari biner 1010 ditambah 0101?'), '1111');
});

test('extractConciseAnswerFromWiki extracts entity names from Wikipedia search hits', () => {
  const clean = buildCleanSearchQuery('Siapa nama bapak pandu Indonesia?');
  assert.equal(clean.toLowerCase(), 'bapak pandu indonesia');

  const extracted = extractConciseAnswerFromWiki('Siapa nama bapak pandu Indonesia?', [
    {
      title: 'Agus Salim',
      snippet: 'pejuang kemerdekaan Indonesia dan juga sebagai Bapak Pandu Indonesia.',
    },
  ]);
  assert.ok(extracted);
  assert.equal(extracted.answer, 'Agus Salim');
});
