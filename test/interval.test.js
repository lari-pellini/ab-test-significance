import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as statistics from '../src/abtest.js';
import { run } from '../src/cli.js';

const counts = { visitorsA: 5000, conversionsA: 250, visitorsB: 5000, conversionsB: 310 };

test('differenceInterval estimates the absolute B minus A difference', () => {
  const interval = statistics.differenceInterval(counts);
  assert.ok(Math.abs(interval.difference - 0.012) < 1e-12);
  assert.equal(interval.confidence, 0.95);
  assert.ok(interval.lower > 0 && interval.lower < interval.difference);
  assert.ok(interval.upper > interval.difference);
});

test('swapping variants reverses the interval and wider confidence widens it', () => {
  const interval = statistics.differenceInterval(counts);
  const reversed = statistics.differenceInterval({
    visitorsA: counts.visitorsB, conversionsA: counts.conversionsB,
    visitorsB: counts.visitorsA, conversionsB: counts.conversionsA,
  });
  assert.ok(Math.abs(interval.lower + reversed.upper) < 1e-12);
  assert.ok(Math.abs(interval.upper + reversed.lower) < 1e-12);
  const wider = statistics.differenceInterval({ ...counts, alpha: 0.01 });
  assert.ok(wider.lower < interval.lower && wider.upper > interval.upper);
});

test('zero and complete conversion samples retain uncertainty', () => {
  for (const conversions of [0, 100]) {
    const result = statistics.differenceInterval({
      visitorsA: 100, conversionsA: conversions, visitorsB: 100, conversionsB: conversions,
    });
    assert.equal(result.difference, 0);
    assert.ok(result.lower < 0 && result.upper > 0);
  }
});

test('differenceInterval validates counts and confidence', () => {
  for (const alpha of [0, 1, -0.1, NaN, Infinity]) {
    assert.throws(() => statistics.differenceInterval({ ...counts, alpha }), RangeError);
  }
  assert.throws(() => statistics.differenceInterval({ ...counts, visitorsA: 0 }), RangeError);
  assert.throws(() => statistics.differenceInterval({ ...counts, conversionsB: 5001 }), RangeError);
});

test('numerical bounds match independent NormalDist reference calculations', () => {
  // Wilson limits computed independently with Python NormalDist and quadratic roots.
  const cases = [
    [counts, 0.0029857309123483573, 0.02104970930190532],
    [{ visitorsA: 40, conversionsA: 1, visitorsB: 1000, conversionsB: 80 }, -0.049928092031768435, 0.08264533654071503],
    [{ visitorsA: 100, conversionsA: 0, visitorsB: 100, conversionsB: 0 }, -0.03699349820698567, 0.03699349820698567],
  ];
  for (const [input, lower, upper] of cases) {
    const result = statistics.differenceInterval(input);
    assert.ok(Math.abs(result.lower - lower) < 1e-8);
    assert.ok(Math.abs(result.upper - upper) < 1e-8);
  }
  const tinyAlpha = statistics.differenceInterval({ ...counts, alpha: 1e-20 });
  assert.ok(Number.isFinite(tinyAlpha.lower) && Number.isFinite(tinyAlpha.upper));
});

test('CLI reports the absolute interval in percentage points at the chosen confidence', () => {
  assert.match(run(['compare', '--a', '5000/250', '--b', '5000/310']), /95% CI \(B - A\): [+-][\d.]+ to [+-][\d.]+ pp/);
  assert.match(run(['compare', '--a', '5000/310', '--b', '5000/250', '--alpha', '0.1']), /90% CI \(B - A\): -[\d.]+ to -[\d.]+ pp/);
});
