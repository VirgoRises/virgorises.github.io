const fieldset_selectsets_div = document.querySelector('#fieldset_selectsets_div');                          
fieldset_selectsets_div.insertAdjacentHTML('beforeend', `
<!-- start set fieldset -->
<fieldset>
<legend>Select mapping set:</legend>
    <fieldset>
    <legend>Additive sets:</legend> 

    <input id="chk_s1" type="checkbox" name="sets" value="s1" /><label for="chk_s1"><span>&nbsp;Set&nbsp;1</span>&nbsp;:&nbsp;<span><math xmlns="http://www.w3.org/1998/Math/MathML">
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


    <input id="chk_s2" type="checkbox" name="sets" value="s2" /><label for="chk_s2"><span>&nbsp;Set&nbsp;2</span>&nbsp;:&nbsp;<span><math xmlns="http://www.w3.org/1998/Math/MathML">
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

    <input id="chk_s3" type="checkbox" name="sets" value="s3" /><label for="chk_s3"><span>&nbsp;Set&nbsp;3</span>&nbsp;:&nbsp;<span><math xmlns="http://www.w3.org/1998/Math/MathML">
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

    <input id="chk_s4" type="checkbox" name="sets" value="s4" /><label for="chk_s4"><span>&nbsp;Set&nbsp;4</span>&nbsp;:&nbsp;<span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
    <fieldset>
    <legend>Multiplicative sets:</legend>
    <input id="chk_s5" type="checkbox" name="sets" value="s5" />
    <label for="chk_s5"><span>&nbsp;Set&nbsp;5</span>&nbsp;:&nbsp;<span><math xmlns="http://www.w3.org/1998/Math/MathML">
      <mrow data-mjx-texclass="ORD">
        <mstyle mathsize="1em">
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
          <mi>a</mi>
          <mo>&#xD7;</mo>
          <mi>b</mi>
          <mo>&#xD7;</mo>
          <mi>c</mi>
          <mo fence="false" stretchy="false">}</mo>
        </mstyle>
      </mrow>
    </math></span></label><br/>

    <input id="chk_s6" type="checkbox" name="sets" value="s6" /><label for="chk_s6"><span>&nbsp;Set&nbsp;6</span>&nbsp;:&nbsp;<span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
        <mo>&#xD7;</mo>
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
        <mo>&#xD7;</mo>
        <msup>
          <mi>b</mi>
          <mn>2</mn>
        </msup>
        <mo>&#xD7;</mo>
        <msup>
          <mi>c</mi>
          <mn>2</mn>
        </msup>
        <mo fence="false" stretchy="false">}</mo>
      </mstyle>
    </mrow>
    </math></span></label><br/>

    <input id="chk_s7" type="checkbox" name="sets" value="s7" /><label for="chk_s7"><span>&nbsp;Set&nbsp;7</span>&nbsp;:&nbsp;<span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
                    <mo>&#xD7;</mo>
                    <mi>b</mi>
                  </msqrt>
                  <mo fence="false" stretchy="false">}</mo>
                  <mo>,</mo>
                  <mo fence="false" stretchy="false">{</mo>
                  <msqrt>
                    <mi>a</mi>
                    <mo>&#xD7;</mo>
                    <mi>b</mi>
                    <mo>&#xD7;</mo>
                    <mi>c</mi>
                  </msqrt>
                  <mo fence="false" stretchy="false">}</mo>
                </mstyle>
              </mrow>
            </math></span></label><br/>

            <input id="chk_s8" type="checkbox" name="sets" value="s8" /><label for="chk_s8"><span>&nbsp;Set&nbsp;8</span>&nbsp;:&nbsp;<span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
                <mo>&#xD7;</mo>
                <msqrt>
                  <mi>b</mi>
                </msqrt>
                <mo fence="false" stretchy="false">}</mo>
                <mo>,</mo>
                <mo fence="false" stretchy="false">{</mo>
                <msqrt>
                  <mi>a</mi>
                </msqrt>
                <mo>&#xD7;</mo>
                <msqrt>
                  <mi>b</mi>
                </msqrt>
                <mo>&#xD7;</mo>
                <msqrt>
                  <mi>c</mi>
                </msqrt>
                <mo fence="false" stretchy="false">}</mo>
              </mstyle>
            </mrow>
          </math></span></label><br/>

    </fieldset>
</fieldset>
<!-- end set fieldset -->
`);