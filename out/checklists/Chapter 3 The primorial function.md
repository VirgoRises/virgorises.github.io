# Chapter 3 The primorial function — Split Checklist

Source: `zeta-zero-cafe/notebook/Chapter 3 The primorial function.html`

> Run analyzer again after each batch:
> `node tools/analyze-osf.mjs`

## § candidate — index 4
- reason: density=4, chars=975, sentences=1, inlineMath=22, blockMath=0
- snippet: Table 3.1 — Primorial root 2 approach n \(P_n\) \(P_n\#\) \((P_n\#)^{-1}\) \(P_s = \sum_{n=1}^{\infty} \left(\prod_{k=1}^{n\to\infty} P_k\right)^{-1}\) \(\Delt…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 3 The primorial function.html" --index 4
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 13
- reason: density=4, chars=625, sentences=1, inlineMath=13, blockMath=0
- snippet: Table 3.2 — Primorial lb–ub oscillation n \(P_n\) \(\uparrow\downarrow\) \(P_s \; increment\) \(\tfrac{lb}{ub}\) \(P_{\Delta}=\tfrac{lb_{\infty}}{lb_{n=1}}\) 1…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 3 The primorial function.html" --index 13
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 19
- reason: density=2, chars=474, sentences=3, inlineMath=8, blockMath=0
- suggested split **after sentence**: 2
- snippet: The partial sum increment, $P_{s}\:increment$, table 3.2, shows a peculiar alternating progression. The current partial sum $P_{s}\rightarrow n$ minus the incr…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 3 The primorial function.html" --index 19 --sentence 2
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 20
- reason: density=2, chars=425, sentences=3, inlineMath=5, blockMath=0
- suggested split **after sentence**: 2
- snippet: For the first two terms $\left\{ 2,3\right\}$ the ratio is exact, $\frac{lb}{ub}=\frac{1}{3}$, the last two terms in the table $\left\{ 23,29\right\}$ approach…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 3 The primorial function.html" --index 20 --sentence 2
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 34
- reason: density=2, chars=257, sentences=1, inlineMath=7, blockMath=0
- snippet: The quadrature constant $\looparrowright=\frac{2\pi}{2.5^2}$ provides a smooth mapping from $\mathbb{Q}$ to $\mathbb{R}$ if we define $\mathbb{Q}$ as a circle …

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 3 The primorial function.html" --index 34
```
**Write:** add `--write` (auto-backup enabled)
