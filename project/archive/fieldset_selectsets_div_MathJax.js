const fieldset_selectsets_div = document.querySelector('#fieldset_selectsets_div');                          
fieldset_selectsets_div.insertAdjacentHTML('beforeend', `
            <!-- start set fieldset -->
            <fieldset>
                    <legend>Select mapping set:</legend>
 
                        <input id="chk_s1" type="checkbox" name="sets" value="s1" /><label for="chk_s1"><span>Set 1</span> : <span>\({\small \{a\},\{a\times b\},\{a\times b\times
                                c\}}\)</span></label><br />

                        <input id="chk_s2" type="checkbox" name="sets" value="s2" /><label for="chk_s2"><span>Set
                                2</span> : <span>\({\small \{a\},\{a+b\},\{a+b+c\}}\)</span></label><br />

                        <input id="chk_s3" type="checkbox" name="sets" value="s3" /><label for="chk_s3"><span>Set
                                3</span> : <span>\({\small
                                \{\sqrt{a}\},\{\sqrt{a+b}\},\{\sqrt{a+b+c}\}}\)</span></label><br />

                        <input id="chk_s4" type="checkbox" name="sets" value="s4" /><label for="chk_s4"><span>Set
                                4</span> : <span>\({\small \{\sqrt{a}\},\{\sqrt{a\times b}\},\{\sqrt{a\times
                                b\times
                                c}\}}\)</span></label><br />

                        <input id="chk_s5" type="checkbox" name="sets" value="s5" /><label for="chk_s5"><span>Set
                                5</span> : <span>\({\small \{a^2\},\{a^2\times b^2\},\{a^2\times b^2\times
                                c^2\}}\)</span></label><br />

                        <input id="chk_s6" type="checkbox" name="sets" value="s6" /><label for="chk_s6"><span>Set
                                6</span> : <span>\({\small
                                \{\sqrt{a}\},\{\sqrt{a}+\sqrt{b}\},\{\sqrt{a}+\sqrt{b}+\sqrt{c}\}}\)</span></label>
                 </fieldset>
                <!-- end set fieldset -->
`);