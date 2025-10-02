# Chapter 5 Chords — Split Checklist

Source: `zeta-zero-cafe/notebook/Chapter 5 Chords.html`

> Run analyzer again after each batch:
> `node tools/analyze-osf.mjs`

## § candidate — index 9
- reason: density=2, chars=210, sentences=2, inlineMath=5, blockMath=0
- suggested split **after sentence**: 1
- snippet: $\triangle ABD$, with chord $c_{\hbar}$, has side b extended to $b=1$. This triangle matches the last tuple in the table, but $\triangle ABD$ does not conform …

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 9 --sentence 1
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 12
- reason: density=2, chars=379, sentences=1, inlineMath=9, blockMath=0
- snippet: Observe that if we counter intuitively apply the Pythagoras theorem by assuming $\overline{BC}$ as if $\overline{AC}$, then any $\angle ABC=\frac{\pi}{3}=60^{\…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 12
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 23
- reason: density=3, chars=258, sentences=1, inlineMath=8, blockMath=0
- snippet: This results, plugging in the values $a$ and $r_q$ for each tuple $\angle\theta=tan\left(\frac{r_q}{a}\right)$, in chords angled between $45^{\circ}$ and $63.4…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 23
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 27
- reason: density=2, chars=381, sentences=1, inlineMath=4, blockMath=0
- snippet: Because we assume a distorted representation of a hexagonal triangle in each case, geometrically the unity chords must have $\angle ABC=\frac{\pi}{3}=60^{\circ…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 27
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 32
- reason: density=2, chars=331, sentences=1, inlineMath=2, blockMath=0
- snippet: For any pair of coordinates $\left(a,r_{q}\right)$ a hypotenuse exists, but only those that occur in the triangular projection, see table 4.1: Discrete triangu…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 32
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 39
- reason: density=3, chars=295, sentences=1, inlineMath=4, blockMath=0
- snippet: From the triangles $\triangle ABC$ and $\triangle DBE$, the triangle $\triangle ABC$ does not occur in table 4.1: Discrete triangular - Continues projection pl…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 39
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 42
- reason: density=2, chars=178, sentences=2, inlineMath=4, blockMath=0
- suggested split **after sentence**: 1
- snippet: The angles $\angle CAB\,\,\,\,\angle EDB$ are both $90^{\circ}$ and $\angle ABC\,\,and\,\,\angle EBD$ are both $60^{\circ}$. Further, the point of origin for b…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 42 --sentence 1
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 44
- reason: density=2, chars=334, sentences=1, inlineMath=5, blockMath=0
- snippet: We recognize the chord $\overline{BC}$ in a somewhat peculiar place for a hexagonal chord in figure 5.2, namely it is the chord $h_{init}$ between $r_{q}=\sqrt…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 44
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 46
- reason: density=4, chars=2561, sentences=1, inlineMath=74, blockMath=0
- snippet: Table 5.1 — Hexagonal equilibrium \(n\) \((\sqrt{2})^{-n}\) a \(|b|\) c \(c_{\hbar}\) 360° \(\pi \, rad\) \((\sqrt{2})^{-n}\) \(\sqrt{\tfrac{3}{2^{n}}}\) \(\sq…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 46
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 66
- reason: density=2, chars=327, sentences=1, inlineMath=4, blockMath=0
- snippet: Because a surface area is defined by $SA=4\pi r^{2}$ and this area is subdivided in 8 polar triangles the relative radius for a surface area $SA=8\pi^{2}$ is $…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 66
```
**Write:** add `--write` (auto-backup enabled)

## § candidate — index 73
- reason: density=2, chars=339, sentences=1, inlineMath=1, blockMath=0
- snippet: With the singularity as center of this structure, any perfect sphere with fixed radius will cut as a ghost through this surface and only have two (2) coordinat…

**Dry-run:**
```bash
node tools/apply-split.mjs --file "zeta-zero-cafe/notebook/Chapter 5 Chords.html" --index 73
```
**Write:** add `--write` (auto-backup enabled)
