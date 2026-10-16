import assert from 'node:assert/strict';
import { test } from 'node:test';
import { durationDays, normCdf, normInv, sampleSize, zTest } from '../src/abtest.js';
import { run } from '../src/cli.js';

const close = (actual, expected, tolerance = 1e-4) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `expected ${actual} ≈ ${expected}`);

test('normCdf matches known values', () => {
  close(normCdf(0), 0.5);
  close(normCdf(1.959964), 0.975);
  close(normCdf(-1.644854), 0.05);
});

test('normInv is the inverse of normCdf', () => {
  close(normInv(0.975), 1.959964);
  close(normInv(0.8), 0.841621);
  close(normInv(0.01), -2.326348);
  for (const p of [0.001, 0.2, 0.5, 0.9, 0.999]) close(normCdf(normInv(p)), p, 1e-6);
});

test('zTest detects a clear winner', () => {
  const r = zTest({ visitorsA: 5000, conversionsA: 250, visitorsB: 5000, conversionsB: 310 });
  close(r.rateA, 0.05);
  close(r.rateB, 0.062);
  close(r.uplift, 0.24);
  close(r.z, 2.6096, 1e-3);
  assert.equal(r.significant, true);
  assert.equal(r.winner, 'B');
});

test('zTest does not call a winner on noise', () => {
  const r = zTest({ visitorsA: 1000, conversionsA: 50, visitorsB: 1000, conversionsB: 55 });
  assert.equal(r.significant, false);
  assert.equal(r.winner, null);
});

test('zTest rejects impossible inputs', () => {
  assert.throws(() => zTest({ visitorsA: 100, conversionsA: 120, visitorsB: 100, conversionsB: 10 }), RangeError);
  assert.throws(() => zTest({ visitorsA: 0, conversionsA: 0, visitorsB: 100, conversionsB: 10 }), RangeError);
});

test('sampleSize for 10% baseline and +20% lift', () => {
  // p1 = 0.10, p2 = 0.12, alpha 0.05 two-sided, power 0.8
  assert.equal(sampleSize({ baselineRate: 0.1, minDetectableEffect: 0.2 }), 3841);
});

test('smaller effects need more traffic', () => {
  const big = sampleSize({ baselineRate: 0.05, minDetectableEffect: 0.3 });
  const small = sampleSize({ baselineRate: 0.05, minDetectableEffect: 0.1 });
  assert.ok(small > big * 5);
});

test('durationDays splits traffic across variants', () => {
  assert.equal(durationDays({ perVariant: 3841, dailyVisitors: 1000 }), 8);
});

test('cli compare and plan', () => {
  assert.match(run(['compare', '--a', '5000/250', '--b', '5000/310']), /variant B wins/);
  assert.match(run(['plan', '--baseline', '0.1', '--mde', '0.2', '--daily', '1000']), /3,841[\s\S]*8 days/);
  assert.throws(() => run(['compare', '--a', 'oops', '--b', '1/1']), /visitors\/conversions/);
});
