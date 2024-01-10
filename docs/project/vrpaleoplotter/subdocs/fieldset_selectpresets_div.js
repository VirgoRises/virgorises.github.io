const fieldset_selectpresets_div = document.querySelector('#fieldset_selectpresets_div');                          
fieldset_selectpresets_div.insertAdjacentHTML('beforeend', `
<!-- start preset fieldset -->
<fieldset>
<legend>Select presets:</legend>
    <input id="chk_extr" type="checkbox" name="presets" value="19.0999,999999" /><label
        for="chk_extr">Bounds convex set</label><br />

    <input id="chk_f1" type="checkbox" name="presets" value="1" /><label for="chk_f1">f(1)
        Unit value</label><br />

    <input id="chk_kc" type="checkbox" name="presets" value="11.17" /><label for="chk_kc">f(11.17) Hight Kc</label><br />

    <input id="chk_seeds" type="checkbox" name="presets" value="2,2.02,2.52,2.98,5.5" /><label
        for="chk_seeds">The 1<sub>th</sub> Passage</label>
</fieldset>
<!-- end preset fieldset -->
`);