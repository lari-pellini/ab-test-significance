# ab-test-significance

[![CI](https://github.com/lari-pellini/ab-test-significance/actions/workflows/ci.yml/badge.svg)](https://github.com/lari-pellini/ab-test-significance/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

**Is variant B really better, or is it just noise?** A zero-dependency A/B test calculator for marketers and CRO folks — usable as a **web page**, a **CLI** or a **JavaScript module**.

🔗 **Live demo:** https://lari-pellini.github.io/ab-test-significance/

> 🇧🇷 [Leia em português](#-português)

## Features

- ✅ Two-proportion z-test (two-tailed) → p-value, confidence, relative uplift and winner
- 📐 Sample size per variant for a given baseline and minimum detectable effect
- 📅 Test duration estimate from your daily traffic
- 🪶 No dependencies, no tracking, runs fully client-side

## CLI

```bash
node src/cli.js compare --a 5000/250 --b 5000/310
# A: 5.00%  (250/5000)
# B: 6.20%  (310/5000)
# Relative uplift: 24.00%
# z = 2.610, p-value = 0.0091
# ✅ Significant at 95% confidence — variant B wins.

node src/cli.js plan --baseline 0.05 --mde 0.15 --daily 2000
# Visitors needed per variant: 14,193
# Estimated duration: 15 days (2 variants)
```

`--a` / `--b` take `visitors/conversions`. `--mde` is the **relative** lift you want to be able to detect (0.15 = +15%).

## As a module

```js
import { zTest, sampleSize } from './src/abtest.js';

zTest({ visitorsA: 5000, conversionsA: 250, visitorsB: 5000, conversionsB: 310 });
// { rateA: 0.05, rateB: 0.062, uplift: 0.24, pValue: 0.009, significant: true, winner: 'B', ... }

sampleSize({ baselineRate: 0.1, minDetectableEffect: 0.2 }); // 3841
```

## How it works

- **Significance:** pooled two-proportion z-test, `z = (p̂B − p̂A) / √(p̂(1−p̂)(1/nA + 1/nB))`, p-value from the standard normal CDF.
- **Sample size:** `n = (z₁₋α/₂·√(2p̄(1−p̄)) + z₁₋β·√(p₁(1−p₁)+p₂(1−p₂)))² / (p₂−p₁)²`.

⚠️ Decide the sample size **before** starting and don't stop the test the first time it turns green ("peeking" inflates false positives).

## Development

```bash
npm test
```

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🇧🇷 Português

Calculadora de teste A/B sem dependências, para quem trabalha com marketing e CRO. Funciona como **página web**, **CLI** ou **módulo JavaScript**:

- verifica se a diferença de conversão entre A e B é estatisticamente significativa (teste z de duas proporções);
- calcula quantos visitantes por variante você precisa antes de começar o teste;
- estima quantos dias o teste vai levar com o seu tráfego.

Dica: defina o tamanho da amostra **antes** de começar e não encerre o teste na primeira vez que ele ficar "verde".

## License

MIT © Larissa Pellini
