# Markdown + LaTeX test

This page verifies that **Markdown** and **LaTeX** cooperate:

- Inline math with escaped hash: $P_n\# = \prod_{k=1}^{n} P_k$
- Display math with labels and tags:
$$
\begin{equation}
P_{n}\#=\prod_{k=1}^{n}P_{k}=2\times3\times5\times7\times\dots\in\mathbb{N}
\label{eq:03.01}\tag{03.01}
\end{equation}
$$

## Lists with mixed content

1. Some text with inline math $a\# + b\# = c\#$.
2. Display math:
$$
\begin{split}
a &= 2 \left(\sqrt{\frac{3}{4}} \right) - \sqrt{\frac{3}{4}} \\\\
b &= \frac{0.5}{a} \approx 0.9622504486
\end{split}
$$

## Tables (inline math allowed)

| n | value |
|---|------:|
| 1 | $1$ |
| 2 | $\frac{\pi^2}{6}$ |
| 3 | unknown |

## Code fences must not be typeset

```js
// raw TeX-like strings that must NOT render:
const demo = "$$ a^2 + b^2 = c^2 $$";
