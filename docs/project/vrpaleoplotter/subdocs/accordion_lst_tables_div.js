const accordion_lst_tables_div = document.querySelector('#accordion_lst_tables_div');                          
accordion_lst_tables_div.insertAdjacentHTML('beforeend', `
<!-- here the accordion  -->
<div class="table-responsive accordion" id="accordionExample">
    <div class="accordion-item">
        <h2 class="accordion-header" id="headingTwo">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                data-bs-target="#collapseTwo" aria-expanded="true" aria-controls="collapseTwo">
                tbl_tbllist Item #2
            </button>
        </h2>
    </div>
    <div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo"
        data-bs-parent="#accordionExample">
        <div class="accordion-body">
            <div id="place_tbl_tbllist">tbl_tbllist here</div>
        </div>
    </div>

    <div class="accordion-item">
        <h2 class="accordion-header" id="headingThree">
            <button class="accordion-button" type="button" data-bs-toggle="collapse"
                data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                tbl_mplot Item #3
            </button>
        </h2>
        <div id="collapseThree" class="accordion-collapse collapse" aria-labelledby="headingThree"
            data-bs-parent="#accordionExample">
            <div class="accordion-body">
                <div id="place_mplot">tbl_mplot here</div>
            </div>
        </div>
    </div>
    <div class="accordion-item">
        <h2 class="accordion-header" id="headingFour">
            <button class="accordion-button" type="button" data-bs-toggle="collapse"
                data-bs-target="#collapseFour" aria-expanded="false" aria-controls="collapseFour">
                tbl_gbox Item #4
            </button>
        </h2>
        <div id="collapseFour" class="accordion-collapse collapse" aria-labelledby="headingFour"
            data-bs-parent="#accordionExample">
            <div class="accordion-body">
                <div id="place_gbox">tbl_gbox here</div>
            </div>
        </div>
    </div>
    <!-- id="headingFive" place_sets -->
    <div class="accordion-item">
        <h2 class="accordion-header" id="headingFive">
            <button class="accordion-button" type="button" data-bs-toggle="collapse"
                data-bs-target="#collapseFive" aria-expanded="false" aria-controls="collapseFive">
                tbl_sets Item #5
            </button>
        </h2>
        <div id="collapseFive" class="accordion-collapse collapse" aria-labelledby="headingFive"
            data-bs-parent="#accordionExample">
            <div class="accordion-body">
                <div id="place_sets">tbl_sets here</div>
            </div>
        </div>
    </div>
    <div class="accordion-item">
        <h2 class="accordion-header" id="headingSix">
            <button class="accordion-button" type="button" data-bs-toggle="collapse"
                data-bs-target="#collapseSix" aria-expanded="false" aria-controls="collapseSix">
                tbl_presets Item #6
            </button>
        </h2>
        <div id="collapseSix" class="accordion-collapse collapse" aria-labelledby="headingSix"
            data-bs-parent="#accordionExample">
            <div class="accordion-body">
                <div id="place_presets">tbl_presets here</div>
            </div>
        </div>
    </div>
</div><!-- here ends accordion  -->

`);