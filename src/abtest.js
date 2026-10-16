// Statistics helpers for conversion-rate A/B tests. No dependencies, runs in Node and in the browser.

/** Standard normal cumulative distribution function (Abramowitz & Stegun 7.1.26, error < 1.5e-7). */
export function normCdf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** Inverse of the standard normal CDF (Peter Acklam's rational approximation). */
export function normInv(p) {
  if (p <= 0 || p >= 1) throw new RangeError('p must be between 0 and 1');
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - low) return -normInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function assertCounts(visitors, conversions, label) {
  if (!Number.isInteger(visitors) || visitors <= 0) throw new RangeError(`${label}: visitors must be a positive integer`);
  if (!Number.isInteger(conversions) || conversions < 0 || conversions > visitors) {
    throw new RangeError(`${label}: conversions must be an integer between 0 and visitors`);
  }
}

/**
 * Two-proportion z-test (pooled), two-tailed.
 * @returns {{rateA:number, rateB:number, uplift:number, z:number, pValue:number, confidence:number, significant:boolean, winner:'A'|'B'|null}}
 */
export function zTest({ visitorsA, conversionsA, visitorsB, conversionsB, alpha = 0.05 }) {
  assertCounts(visitorsA, conversionsA, 'A');
  assertCounts(visitorsB, conversionsB, 'B');
  const rateA = conversionsA / visitorsA;
  const rateB = conversionsB / visitorsB;
  const pooled = (conversionsA + conversionsB) / (visitorsA + visitorsB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / visitorsA + 1 / visitorsB));
  const z = se === 0 ? 0 : (rateB - rateA) / se;
  const pValue = 2 * (1 - normCdf(Math.abs(z)));
  const significant = pValue < alpha;
  return {
    rateA,
    rateB,
    uplift: rateA === 0 ? null : (rateB - rateA) / rateA,
    z,
    pValue,
    confidence: 1 - pValue,
    significant,
    winner: significant ? (rateB > rateA ? 'B' : 'A') : null,
  };
}

/**
 * Visitors needed *per variant* to detect a relative lift of `minDetectableEffect`
 * over `baselineRate` with a two-sided test.
 */
export function sampleSize({ baselineRate, minDetectableEffect, alpha = 0.05, power = 0.8 }) {
  if (!(baselineRate > 0 && baselineRate < 1)) throw new RangeError('baselineRate must be between 0 and 1');
  if (!(minDetectableEffect > 0)) throw new RangeError('minDetectableEffect must be greater than 0');
  const p1 = baselineRate;
  const p2 = p1 * (1 + minDetectableEffect);
  if (p2 >= 1) throw new RangeError('baselineRate × (1 + minDetectableEffect) must stay below 1');
  const zAlpha = normInv(1 - alpha / 2);
  const zBeta = normInv(power);
  const pBar = (p1 + p2) / 2;
  const numerator = zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((numerator * numerator) / ((p2 - p1) ** 2));
}

/** Days needed to reach `sampleSize` per variant, given daily traffic split across `variants`. */
export function durationDays({ perVariant, dailyVisitors, variants = 2 }) {
  if (!(dailyVisitors > 0)) throw new RangeError('dailyVisitors must be greater than 0');
  return Math.ceil((perVariant * variants) / dailyVisitors);
}
