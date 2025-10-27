// /js/ro/snippets-templates.js
export const TPL = {
  seed(type, base){
    return { ...base, type, title: base.title||'', body: base.body||'' };
  },

  headerInfo(){
    return `chapter: [notebook/] chapter-5-chords.html  ·  para: osf-1  ·  primary: 51  ·  author: <discord @handle>`;
  },

  discordStats(){
    return `rank r / n (rfc) · -- [#dissent] ++ [#concur] · [Active|Dormant|Retracted]`;
  },

  logicSkeleton(){
    return `**Logic construct — syllogism**  
Premise 1: If it's raining, then it's cloudy.  
Premise 2: It's raining.  
Conclusion: It's cloudy.`;
  },

  inlineMath(){
    return `Inline: \\( x^2 + y^2 = z^2 \\)`;
  },

  blockMath(){
    return `\\[ e^{i\\pi}+1=0 \\]`;
  },

  figCropTable(){
    return `
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <colgroup><col style="width:120px;"><col></colgroup>
  <tbody><tr>
    <td style="padding:0; vertical-align:top;">
      <div style="--x:.4; --y:0; width:100%; aspect-ratio:1/1; position:relative; overflow:hidden; border-radius:4px;">
        <img src="https://virgorises.github.io/cafes/zeta-zero-cafe/notebook/figures/Figure_5.3_Triangular_numbers_-_chord_density.PNG"
             alt="" style="position:absolute; display:block; width:280%; height:280%; left:calc(-1 * var(--x) * 10%); top:calc(-1 * var(--y) * 10%);" />
      </div>
    </td>
    <td style="padding:8px 9px; vertical-align:top;">
      <table style="width:100%; border-collapse:collapse; margin:0;">
        <thead><tr>
          <th style="text-align:left; border:1px solid #273341; padding:6px 8px;">n</th>
          <th style="text-align:left; border:1px solid #273341; padding:6px 8px;">math</th>
        </tr></thead>
        <tbody><tr>
          <td style="border:1px solid #273341; padding:6px 8px;">1</td>
          <td style="border:1px solid #273341; padding:6px 8px;">
            \\[ r_q=\\forall n\\,\\sqrt{\\frac{n}{n+1}} \\to \\{ \\sqrt{\\tfrac{1}{2}}, \\sqrt{\\tfrac{2}{3}}, \\sqrt{\\tfrac{3}{4}}, \\dots \\} \\tag{05:01} \\]
          </td>
        </tr></tbody>
      </table>
    </td>
  </tr></tbody>
</table>`;
  }
};
