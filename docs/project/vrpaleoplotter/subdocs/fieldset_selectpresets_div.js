const fieldset_selectpresets_div = document.querySelector('#fieldset_selectpresets_div');                          
fieldset_selectpresets_div.insertAdjacentHTML('beforeend', `
<!-- start preset fieldset -->
<fieldset>
    <legend>Select presets:</legend>
    <xxx_form class="frm_changepreset" id="frm_changepreset">
        <input id="chk_extr" type="checkbox" name="presets" value="19.0999,999999" /><label
            for="chk_extr">Map
            extremes convex set</label><br />

        <input id="chk_f1" type="checkbox" name="presets" value="1" /><label for="chk_f1">Map
            f(1)
            Unit value</label><br />

        <input id="chk_kc" type="checkbox" name="presets" value="11.17" /><label for="chk_kc">Map
            f(11.17) Hight Kings Chamber</label><br />

        <input id="chk_seeds" type="checkbox" name="presets" value="2,2.02,2.52,2.98,5.5" /><label
            for="chk_seeds">The 1<sub>th</sub> Passage
            (reset the 5 seeds)</label>
    </xxx_form>
</fieldset>
<!-- end preset fieldset -->
`);