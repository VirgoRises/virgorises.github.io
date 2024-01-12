const fieldset_selectpresets_div = document.querySelector('#fieldset_selectpresets_div');
fieldset_selectpresets_div.insertAdjacentHTML('beforeend', `
<!-- start preset fieldset -->
<fieldset>
    <div class="row">
        <div class="col">
            <input id="chk_extr" type="checkbox" name="presets" value="19.0999,999999" />
            <label for="chk_extr"><small>Convex set</small></label>
        </div>  
        <div class="col">
            <input id="chk_f1" type="checkbox" name="presets" value="1" />
            <label for="chk_f1"><small>f(1) Unit value</small></label>
        </div>
    </div>
    <div class="row">
        <div class="col">
            <input id="chk_kc" type="checkbox" name="presets" value="11.17" />
            <label for="chk_kc"><small>f(11.17) Height Kc</small></label>
        </div>  
        <div class="col">
            <input id="chk_seeds" type="checkbox" name="presets" value="2,2.02,2.52,2.98,5.5" />
            <label for="chk_seeds"><small>The 1<sub>th</sub> Passage</small></label>
        </div>
    </div>
</fieldset>
<!-- end preset fieldset -->
`);