#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { durationDays, sampleSize, zTest } from './abtest.js';

const HELP = `ab-test-significance

  Compare two variants:
    abtest compare --a 5000/250 --b 5000/310

  Plan a test (visitors per variant):
    abtest plan --baseline 0.05 --mde 0.15 [--daily 2000] [--power 0.8] [--alpha 0.05]
`;

const pct = (x) => `${(x * 100).toFixed(2)}%`;

function parseVariant(value, label) {
  const match = /^(\d+)\/(\d+)$/.exec(value ?? '');
  if (!match) throw new Error(`--${label} must look like visitors/conversions, e.g. 5000/250`);
  return { visitors: Number(match[1]), conversions: Number(match[2]) };
}

export function run(argv) {
  const [command, ...rest] = argv;
  const { values } = parseArgs({
    args: rest,
    options: {
      a: { type: 'string' },
      b: { type: 'string' },
      baseline: { type: 'string' },
      mde: { type: 'string' },
      daily: { type: 'string' },
      alpha: { type: 'string', default: '0.05' },
      power: { type: 'string', default: '0.8' },
    },
  });
  const alpha = Number(values.alpha);

  if (command === 'compare') {
    const a = parseVariant(values.a, 'a');
    const b = parseVariant(values.b, 'b');
    const r = zTest({ visitorsA: a.visitors, conversionsA: a.conversions, visitorsB: b.visitors, conversionsB: b.conversions, alpha });
    return [
      `A: ${pct(r.rateA)}  (${a.conversions}/${a.visitors})`,
      `B: ${pct(r.rateB)}  (${b.conversions}/${b.visitors})`,
      `Relative uplift: ${r.uplift === null ? 'n/a' : pct(r.uplift)}`,
      `z = ${r.z.toFixed(3)}, p-value = ${r.pValue.toFixed(4)}`,
      r.significant
        ? `✅ Significant at ${+((1 - alpha) * 100).toFixed(2)}% confidence — variant ${r.winner} wins.`
        : `⏳ Not significant yet at ${+((1 - alpha) * 100).toFixed(2)}% confidence. Keep the test running or accept there is no clear winner.`,
    ].join('\n');
  }

  if (command === 'plan') {
    const perVariant = sampleSize({
      baselineRate: Number(values.baseline),
      minDetectableEffect: Number(values.mde),
      alpha,
      power: Number(values.power),
    });
    const lines = [`Visitors needed per variant: ${perVariant.toLocaleString('en-US')}`];
    if (values.daily) {
      lines.push(`Estimated duration: ${durationDays({ perVariant, dailyVisitors: Number(values.daily) })} days (2 variants)`);
    }
    return lines.join('\n');
  }

  return HELP;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
