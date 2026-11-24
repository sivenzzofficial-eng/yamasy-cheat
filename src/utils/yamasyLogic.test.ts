import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUserLogin,
  validateAdminLogin,
  generateNextRedeemCode,
  redeemCoinCode,
  deductCoinsForFeature,
  matchQuestionFromDatabase,
  isTripleClick,
  INITIAL_REDEEM_CODE,
  DEFAULT_QUESTIONS,
} from './yamasyLogic';

test('validateUserLogin checks exact password and unique code', () => {
  assert.equal(validateUserLogin('112233', 'yamasy-cheat'), true);
  assert.equal(validateUserLogin('112233', 'wrong-code'), false);
  assert.equal(validateUserLogin('000000', 'yamasy-cheat'), false);
});

test('validateAdminLogin checks admin key and unique code', () => {
  assert.equal(validateAdminLogin('112233', 'yamasy-cheat'), true);
  assert.equal(validateAdminLogin('wrong', 'yamasy-cheat'), false);
});

test('generateNextRedeemCode multiplies the last number by 2 sequentially', () => {
  const code1 = INITIAL_REDEEM_CODE; // KOIN-101010-YAMASY-CHEAT
  const code2 = generateNextRedeemCode(code1);
  assert.equal(code2, 'KOIN-101020-YAMASY-CHEAT');

  const code3 = generateNextRedeemCode(code2);
  assert.equal(code3, 'KOIN-101040-YAMASY-CHEAT');

  const code4 = generateNextRedeemCode(code3);
  assert.equal(code4, 'KOIN-101080-YAMASY-CHEAT');
});

test('redeemCoinCode grants 10 coins, generates next code, and blocks reused code', () => {
  const initialState = {
    activeCode: INITIAL_REDEEM_CODE,
    usedCodes: [],
    coins: 0,
  };

  const res1 = redeemCoinCode('KOIN-101010-YAMASY-CHEAT', initialState);
  assert.equal(res1.success, true);
  assert.equal(res1.nextState.coins, 10);
  assert.equal(res1.nextState.activeCode, 'KOIN-101020-YAMASY-CHEAT');

  // Re-redeeming the old code fails
  const resDuplicate = redeemCoinCode('KOIN-101010-YAMASY-CHEAT', res1.nextState);
  assert.equal(resDuplicate.success, false);
  assert.equal(resDuplicate.nextState.coins, 10);

  // Redeeming the newly generated code succeeds
  const res2 = redeemCoinCode('KOIN-101020-YAMASY-CHEAT', res1.nextState);
  assert.equal(res2.success, true);
  assert.equal(res2.nextState.coins, 20);
  assert.equal(res2.nextState.activeCode, 'KOIN-101040-YAMASY-CHEAT');
});

test('deductCoinsForFeature costs 5 coins per use and blocks when coins < 5', () => {
  const d1 = deductCoinsForFeature(10);
  assert.equal(d1.success, true);
  assert.equal(d1.remainingCoins, 5);

  const d2 = deductCoinsForFeature(d1.remainingCoins);
  assert.equal(d2.success, true);
  assert.equal(d2.remainingCoins, 0);

  const d3 = deductCoinsForFeature(d2.remainingCoins);
  assert.equal(d3.success, false);
  assert.equal(d3.remainingCoins, 0);
});

test('matchQuestionFromDatabase matches questions accurately', () => {
  const match = matchQuestionFromDatabase(
    'Manakah protokol jaringan yang digunakan untuk mengamankan komunikasi HTTP?',
    DEFAULT_QUESTIONS
  );
  assert.ok(match);
  assert.equal(match.correctAnswer, 'B');
});

test('isTripleClick detects 3 rapid clicks within windowMs', () => {
  const step1 = isTripleClick([], 1000, 700);
  assert.equal(step1.triggered, false);

  const step2 = isTripleClick(step1.updatedTimestamps, 1200, 700);
  assert.equal(step2.triggered, false);

  const step3 = isTripleClick(step2.updatedTimestamps, 1400, 700);
  assert.equal(step3.triggered, true);
  assert.equal(step3.updatedTimestamps.length, 0);
});
