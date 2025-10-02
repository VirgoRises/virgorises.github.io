# Chapter 4 The triangular numbers — Split Checklist

Source: `zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html`

> Run analyzer again after each batch:
> `node tools/analyze-osf.mjs`

## § candidate — index 13
- reason: density=3, chars=280, sentences=1, inlineMath=5, blockMath=0
- snippet: Similarly the two arcs at $x=0.5$ and $x=\sqrt{2}^{\thinspace-1}$ define the two hypotenuses, $T_{n=0}$ as upper bound and $T_{n=\infty}$ as lower bound, below…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 13
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 15
- reason: density=3, chars=302, sentences=1, inlineMath=5, blockMath=0
- snippet: The set of numbers $n<=T_{n}$, triangular number $T_{n}=\frac{1}{2}n(n+1)$, projects on a $n\times n$ grit from the lower left corner up to and over the diagon…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 15
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 33
- reason: density=3, chars=523, sentences=1, inlineMath=5, blockMath=0
- snippet: The process starts with $Area=\frac{1}{2}\left(\sqrt{2}^{\thinspace-1}\right)^{2}-\frac{1}{6}=\frac{1}{12}$ and this area reduces as the cycle approaches $lim_…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 33
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 39
- reason: density=5, chars=1854, sentences=1, inlineMath=64, blockMath=0
- snippet: Table 4.1 — Discrete triangular — Continues projection plane \( A_{\triangle} \) Triangular plane \( A_{\Box} \) Projection plane Proportional SA Discrete Cont…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 39
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 41
- reason: density=3, chars=305, sentences=1, inlineMath=4, blockMath=0
- snippet: section $A_{\square}\,Projection\,plane$: “Closed” lists the from “n” derived “intermediate radius” as the closed formula $r_{q}=\sqrt{\frac{n}{n+1}}$, the “Ca…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 41
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 48
- reason: density=4, chars=1378, sentences=1, inlineMath=32, blockMath=0
- snippet: Table 4.2 — Projection plane ranges (all s) s value \(\dfrac{\pi^2}{(\pi^2)(\zeta(s)^{-1})}\) \(a=\sqrt{2A}\) \(r_q=\tfrac{0.5}{a}\) \(r_x=\dfrac{r_q}{\sqrt{P\…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 48
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 52
- reason: density=2, chars=276, sentences=1, inlineMath=4, blockMath=0
- snippet: The value for $\zeta\left(s=1\right)$ in column $SA\propto\pi^2$ lists $SA\propto\frac{6}{9}\pi^{2}$, this result hints at a fractal property if interpreted as…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 52
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 54
- reason: density=2, chars=354, sentences=1, inlineMath=5, blockMath=0
- snippet: The fraction $\frac{6}{9}$ is associated with the affected area of the triangular plane $A_{\Delta}$ in the third quadrant of the projection plane $A_{\square}…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 54
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 59
- reason: density=2, chars=353, sentences=2, inlineMath=5, blockMath=0
- suggested split **after sentence**: 1
- snippet: The triangular cycle $T_{n\{1,\dots,\infty\}}$ only holds $\zeta\left(s\right)$ for $s\in\{1,2\}$, values for $\zeta\left(s>2\right)$ are not represented withi…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 59 --sentence 1
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 62
- reason: density=2, chars=346, sentences=1, inlineMath=4, blockMath=0
- snippet: The projection for $\zeta\left(\infty\right)$ (see table 4.2 projection plane range for all s) yields the radius for a sphere with $SA\propto\left(\frac{\pi^{2…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 62
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 68
- reason: density=2, chars=413, sentences=2, inlineMath=6, blockMath=0
- suggested split **after sentence**: 1
- snippet: We find values for $SA\propto\frac{6}{9}\times$$ \pi^2,SA=1\times$$\pi^2,\\,and\\,SA\propto$$\frac{\pi^2}{6}\times\pi^2$ (see table 4.2 projection plane range …

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 68 --sentence 1
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 69
- reason: density=2, chars=485, sentences=2, inlineMath=5, blockMath=0
- suggested split **after sentence**: 1
- snippet: We see that with respect to scale, $\left(\frac{A_{\square}}{A_{\Delta}}\right)\times\frac{\pi^2}{6}\propto\frac{6}{9}\pi^2$. The apparent increment in surface…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 69 --sentence 1
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 78
- reason: density=2, chars=210, sentences=1, inlineMath=5, blockMath=0
- snippet: The affected area $A_{\Delta}=100\%$ gives the maximum value for the right angled side of the projection plane $A_{\square}$; $a=\sqrt{2\left(\frac{1}{4}\right…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 78
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 79
- reason: density=3, chars=272, sentences=1, inlineMath=4, blockMath=0
- snippet: The hypotenuse from $a=\sqrt{2}^{\thinspace-1}$ to $b=\sqrt{2}^{\thinspace-1}$ is off course $c=a\sqrt{2}=1$, the hypotenuse of the mathematical universe $A_{\…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 79
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 85
- reason: density=2, chars=281, sentences=1, inlineMath=5, blockMath=0
- snippet: This seems to confine us to an infinite cycle during which only $\zeta\left(2\right)$, and by completing the pattern $\zeta\left(1\right)$, play a roll within …

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 85
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 88
- reason: density=2, chars=529, sentences=2, inlineMath=7, blockMath=0
- suggested split **after sentence**: 1
- snippet: There is a limit beyond $\underset{n\rightarrow\infty}{lim}\rightarrow T_{n}$, out of reach for the window provided by $T_{n}$, see table \ref{tab:projectionpl…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 88 --sentence 1
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 90
- reason: density=3, chars=491, sentences=2, inlineMath=4, blockMath=0
- suggested split **after sentence**: 1
- snippet: This can be understood as a function of volume, $\frac{1}{8}$ affected area as limit implies the reduction of a volume by cutting its radius in half, $V_{1}\ti…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 90 --sentence 1
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 93
- reason: density=3, chars=298, sentences=1, inlineMath=5, blockMath=0
- snippet: The limit for the triangular projection in $A_{\Delta}$, $c>=\sqrt{2}^{\thinspace-1}$, is geometrically hard coded by the premise that the triangular projectio…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 93
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 99
- reason: density=2, chars=245, sentences=1, inlineMath=4, blockMath=0
- snippet: The range for the triangular numbers is $a=\left[\sqrt{2}^{\thinspace-1},0.5\right]$, in this range only the values for $\zeta\left(1\right)$ and $\zeta\left(2…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 99
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 121
- reason: density=3, chars=287, sentences=1, inlineMath=14, blockMath=0
- snippet: Table 4.3 — Base of Planck constant \(SA\) \(V\) \(4\pi r^2\) \(\tfrac{4}{3}\pi r^2\) / \(\pi\) \(4r^2\) \(\tfrac{4}{3}r^3\) / 4 \(r^2\) \(\tfrac{1}{3}r^3\) / …

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 121
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 125
- reason: density=3, chars=493, sentences=2, inlineMath=5, blockMath=0
- suggested split **after sentence**: 1
- snippet: The fractal iteration in the lower left cell of quadrant III occupies $\frac{1}{6}$ of the affected area of quadrant III. If we assume the recursive product $\…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 125 --sentence 1
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 129
- reason: density=5, chars=1032, sentences=1, inlineMath=38, blockMath=0
- snippet: Table 4.4 — Zeta SA–Volume equilibrium \(s\) \(\tfrac{1}{4} \propto A_{\Box}\) \(\tfrac{6}{9} \propto A_{\triangle}\) ratio \(\propto \zeta(2)\) \(\#\Box\;cell…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 129
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 131
- reason: density=2, chars=398, sentences=2, inlineMath=4, blockMath=0
- suggested split **after sentence**: 1
- snippet: What must be true is that each iterative step results in a scale invariant projection of the universe that is expressed by $\zeta\left(2\right)=\frac{\pi^2}{6}…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 131 --sentence 1
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 141
- reason: density=2, chars=307, sentences=1, inlineMath=4, blockMath=0
- snippet: The base of Planck's constant $h=6.62607015\times10^{-34}J.s.$, (table 4.3 the base of plancks constant) $T_{h}=0.9^{-1}=1+\frac{1}{9}$ is the ratio between th…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html" --index 141
```
**Write:** add `--write` (auto-backup enabled)
