# Memo to Self
----------


## Clip part of figure

## Clip part of figure

<table>
<row>
<td
  style="
    --x: 17;                 /* left % of image (0–90) */
    --y: 2.5;                 /* top  % of image (0–90) */
    width: 150px; height: 150px; overflow: hidden; position: relative;">
  <img
    src="../notebook/figures/Figure_5.1_Hexagonal_chord_versus_h.PNG" alt=""
    style="
      position: absolute; display: block;
      width: 500%; height: 500%;          /* 10× to make 10% crop fill */
      left: calc(-1 * var(--x) * 10%);      /* offset = x% of image = x×10% of box */
      top:  calc(-1 * var(--y) * 10%);
    ">
</td>
<td> Supplamental text</td>
<row></table>