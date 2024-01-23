const fieldset_ui_settings_div = document.querySelector('#fieldset_ui_settings_div');
fieldset_ui_settings_div.insertAdjacentHTML('beforeend', `
<!-- start UI fieldset -->
<fieldset>
    <div class="col">
        <label for="UI_graph_area"><small>Show graph bounds</small></label>
        <input id="UI_graph_area" type="checkbox" name="ui_settings" onchange="plotMarker()" /><br/>
        <label for="UI_line_color"><small>Line draw color</small></label>
        <input type="color" name="ui_settings" id="UI_line_color" value="#ff0000" onchange="plotMarker()" /><br/>
        
        <label id="labellinedash" for="linedash">line: n</label>
        <input type="range" id="linedash" name="ui_settings" min="1" step="1" max="25" value="1" onchange="plotMarker()" />

        <label id="labellinedashspc" for="linedashspc">space: n</label>
        <input type="range" id="linedashspc" name="ui_settings" min="0" step="1" max="25" value="3" onchange="plotMarker()" />
        <br/>
    </div>      
</fieldset>
<!-- end preset fieldset -->
`);