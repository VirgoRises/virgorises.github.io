const fieldset_selectsets_div = document.querySelector('#fieldset_selectsets_div');                          
fieldset_selectsets_div.insertAdjacentHTML('beforeend', `
            <!-- start set fieldset -->
            <fieldset>
                    <legend>Select mapping set:</legend>
 
                        <input id="chk_s1" type="checkbox" name="sets" value="s1" /><label for="chk_s1"><span>Set 1</span> : <span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
                      </math></span></label><br />

                        <input id="chk_s2" type="checkbox" name="sets" value="s2" /><label for="chk_s2"><span>Set
                                2</span> : <span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
                              </math></span></label><br />

                        <input id="chk_s3" type="checkbox" name="sets" value="s3" /><label for="chk_s3"><span>Set
                                3</span> : <span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
                              </math></span></label><br />

                        <input id="chk_s4" type="checkbox" name="sets" value="s4" /><label for="chk_s4"><span>Set
                                4</span> : <span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
                              </math></span></label><br />

                        <input id="chk_s5" type="checkbox" name="sets" value="s5" /><label for="chk_s5"><span>Set
                                5</span> : <span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
                              </math></span></label><br />

                        <input id="chk_s6" type="checkbox" name="sets" value="s6" /><label for="chk_s6"><span>Set
                                6</span> : <span><math xmlns="http://www.w3.org/1998/Math/MathML">
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
                              </math></span></label>
                 </fieldset>
                <!-- end set fieldset -->
`);