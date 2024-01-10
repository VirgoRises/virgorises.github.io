const fieldset_selectsets_additive_div = document.querySelector('#fieldset_selectsets_additive_div');                          
fieldset_selectsets_additive_div.insertAdjacentHTML('beforeend', `
<!-- start set fieldset -->
<fieldset>

    <legend>Additive sets:</legend> 
    <input id="chk_s1" type="checkbox" name="sets" value="s1" /><label for="chk_s1"><span class="d-inline-block d-md-none">1:&nbsp;<math xmlns="http://www.w3.org/1998/Math/MathML">
    <mrow data-mjx-texclass="ORD">
    <mstyle mathsize="1em">
      <mo fence="false" stretchy="false">{</mo>
      <mi>a</mi>
      <mo fence="false" stretchy="false">}</mo>
      <mo>,</mo>
      <mo fence="false" stretchy="false">{</mo>
      <mi>a</mi>
      <mo>+</mo>
      <mi>b</mi>
      <mo fence="false" stretchy="false">}</mo>
      <mo>,</mo>
      <mo fence="false" stretchy="false">{</mo>
      <mi>a</mi>
      <mo>+</mo>
      <mi>b</mi>
      <mo>+</mo>
      <mi>c</mi>
      <mo fence="false" stretchy="false">}</mo>
    </mstyle>
    </mrow>
    </math></span></label><br/>


    <input id="chk_s2" type="checkbox" name="sets" value="s2" /><label for="chk_s2"><span class="d-inline-block d-md-none">2:&nbsp;<math xmlns="http://www.w3.org/1998/Math/MathML">
    <mrow data-mjx-texclass="ORD">
    <mstyle mathsize="1em">
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
    <mo>+</mo>
    <msup>
      <mi>b</mi>
      <mn>2</mn>
    </msup>
    <mo fence="false" stretchy="false">}</mo>
    <mo>,</mo>
    <mo fence="false" stretchy="false">{</mo>
    <msup>
      <mi>a</mi>
      <mn>2</mn>
    </msup>
    <mo>+</mo>
    <msup>
      <mi>b</mi>
      <mn>2</mn>
    </msup>
    <mo>+</mo>
    <msup>
      <mi>c</mi>
      <mn>2</mn>
    </msup>
    <mo fence="false" stretchy="false">}</mo>
    </mstyle>
    </mrow>
    </math></span></label><br/>

    <input id="chk_s3" type="checkbox" name="sets" value="s3" /><label for="chk_s3"><span class="d-inline-block d-md-none">3:&nbsp;<math xmlns="http://www.w3.org/1998/Math/MathML">
    <mrow data-mjx-texclass="ORD">
    <mstyle mathsize="1em">
    <mo fence="false" stretchy="false">{</mo>
    <msqrt>
      <mi>a</mi>
    </msqrt>
    <mo fence="false" stretchy="false">}</mo>
    <mo>,</mo>
    <mo fence="false" stretchy="false">{</mo>
    <msqrt>
      <mi>a</mi>
      <mo>+</mo>
      <mi>b</mi>
    </msqrt>
    <mo fence="false" stretchy="false">}</mo>
    <mo>,</mo>
    <mo fence="false" stretchy="false">{</mo>
    <msqrt>
      <mi>a</mi>
      <mo>+</mo>
      <mi>b</mi>
      <mo>+</mo>
      <mi>c</mi>
    </msqrt>
    <mo fence="false" stretchy="false">}</mo>
    </mstyle>
    </mrow>
    </math></span></label><br/>
    
    <input id="chk_s4" type="checkbox" name="sets" value="s4" /><label for="chk_s4"><span class="d-inline-block d-md-none">4:&nbsp;<math xmlns="http://www.w3.org/1998/Math/MathML">
    <mrow data-mjx-texclass="ORD">
    <mstyle mathsize="1em">
    <mo fence="false" stretchy="false">{</mo>
    <msqrt>
    <mi>a</mi>
    </msqrt>
    <mo fence="false" stretchy="false">}</mo>
    <mo>,</mo>
    <mo fence="false" stretchy="false">{</mo>
    <msqrt>
    <mi>a</mi>
    </msqrt>
    <mo>+</mo>
    <msqrt>
    <mi>b</mi>
    </msqrt>
    <mo fence="false" stretchy="false">}</mo>
    <mo>,</mo>
    <mo fence="false" stretchy="false">{</mo>
    <msqrt>
    <mi>a</mi>
    </msqrt>
    <mo>+</mo>
    <msqrt>
    <mi>b</mi>
    </msqrt>
    <mo>+</mo>
    <msqrt>
    <mi>c</mi>
    </msqrt>
    <mo fence="false" stretchy="false">}</mo>
    </mstyle>
    </mrow>
    </math></span></label><br/>
    </fieldset>
    <br/>

</fieldset>
<!-- end set fieldset -->
`);