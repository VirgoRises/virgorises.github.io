const fieldset_selectsets_multiplicative_div = document.querySelector('#fieldset_selectsets_multiplicative_div');                          
fieldset_selectsets_multiplicative_div.insertAdjacentHTML('beforeend', `
<!-- start set fieldset -->
    <fieldset>
    <!-- <legend>Multiplicative</legend> -->

<input id="chk_s5" type="checkbox" name="sets" value="s5" />
 <label for="chk_s5">
 <span class="d-inline-block">
 <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mtext>S5</mtext>
  <mo>:</mo>
  <mo fence="false" stretchy="false">{</mo>
  <mi>a</mi>
  <mo fence="false" stretchy="false">}</mo>
  <mo>,</mo>
  <mo fence="false" stretchy="false">{</mo>
  <mi>a</mi>
  <mo>&#xD7;</mo>
  <mi>b</mi>
  <mo fence="false" stretchy="false">}</mo>
  <mo>,</mo>
  <mo fence="false" stretchy="false">{</mo>
  <mo>&#x2026;</mo>
  <mo fence="false" stretchy="false">}</mo>
</math>
</span></label><br/>

<input id="chk_s6" type="checkbox" name="sets" value="s6" /><label for="chk_s6">
<span class="d-inline-block">
<math xmlns="http://www.w3.org/1998/Math/MathML">
  <mtext>S6</mtext>
  <mo>:</mo>
  <mo fence="false" stretchy="false">{</mo>
  <msup>
    <mi>a</mi>
    <mn>2</mn>
  </msup>
  <mo fence="false" stretchy="false">}</mo>
  <mo>,</mo>
  <mo fence="false" stretchy="false">{</mo>
  <msup>
    <mi>a</mi>
    <mn>2</mn>
  </msup>
  <mo>&#xD7;</mo>
  <msup>
    <mi>b</mi>
    <mn>2</mn>
  </msup>
  <mo fence="false" stretchy="false">}</mo>
  <mo>,</mo>
  <mo fence="false" stretchy="false">{</mo>
  <mo>&#x2026;</mo>
  <mo fence="false" stretchy="false">}</mo>
</math>
</span></label><br/>

<input id="chk_s7" type="checkbox" name="sets" value="s7" /><label for="chk_s7">
    <span class="d-inline-block">
    <math xmlns="http://www.w3.org/1998/Math/MathML">
    <mtext>S7</mtext>
    <mo>:</mo>
    <mo fence="false" stretchy="false">{</mo>
    <msqrt>
      <mi>a</mi>
    </msqrt>
    <mo fence="false" stretchy="false">}</mo>
    <mo>,</mo>
    <mo fence="false" stretchy="false">{</mo>
    <msqrt>
      <mi>a</mi>
      <mo>&#xD7;</mo>
      <mi>b</mi>
    </msqrt>
    <mo fence="false" stretchy="false">}</mo>
    <mo>,</mo>
    <mo fence="false" stretchy="false">{</mo>
    <mo>&#x2026;</mo>
    <mo fence="false" stretchy="false">}</mo>
  </math>
  </span></label><br/>

  <input id="chk_s8" type="checkbox" name="sets" value="s8" /><label for="chk_s8">
  <span class="d-inline-block">
  <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mtext>S8</mtext>
  <mo>:</mo>
  <mo fence="false" stretchy="false">{</mo>
  <mi>a</mi>
  <msqrt>
    <mn>2</mn>
  </msqrt>
  <mo fence="false" stretchy="false">}</mo>
  <mo>,</mo>
  <mo fence="false" stretchy="false">{</mo>
  <mi>a</mi>
  <msqrt>
    <mn>2</mn>
  </msqrt>
  <mo>+</mo>
  <mi>b</mi>
  <msqrt>
    <mn>2</mn>
  </msqrt>
  <mo fence="false" stretchy="false">}</mo>
  <mo>,</mo>
  <mo fence="false" stretchy="false">{</mo>
  <mo>&#x2026;</mo>
  <mo fence="false" stretchy="false">}</mo>
</math>
  </span></label><br/>
  </fieldset>
  <br/>

</fieldset>
<!-- end set fieldset -->
`);
