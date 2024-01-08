/**
 * @abstract The algorithm function value f(Rc) ∈ ℝ, is given in Gon (decimal degrees), but is treated as if x°(360 degrees). 'Gon' is a correct assumption because the output is converted to a 200 gon semi circle. The gon is treated as if x° because without conversion, is multiplied by 72 presessional years, which is modelled using the 12 sign 360 dgr°, minute', second'' system.
 * @param {*} RoyalCubit given in Royal cubits f(Rc ∈ ℚ) ∈ ℝ.
 * @param {*} GraphCalib GraphCalib is the year zero for the graph's x-axis range
 * @example 2450 BCE + 1950 CE = 4400
 * @param {*} Ryears The x-axis range in years for the grap in use. 
 * @returns Array f(1).[item]
 */
function f(RoyalCubit, GraphCalib, Ryears) {
    const cGon = 100 * (2 / (RoyalCubit * (Math.PI / 6)));
    const cIsFloor = Math.floor(cGon / 10);
    const cF_hbar = cIsFloor === 0 ? 1 : cIsFloor;
    const cDegPreses = 10 * (cGon / cF_hbar);
    const cYbo = cDegPreses * 72;
    const cCalibPlus = (2450 + GraphCalib);
    const cYbp = (cDegPreses * 72) + (2450 + GraphCalib);
    const cRelX = 1 - (cYbp / Ryears);

    // return array of values
    const f_calc = {
        Rc: RoyalCubit,
        gon: cGon,
        isFloor: cIsFloor,
        f_hbar: cF_hbar,
        degPreses: cDegPreses,
        Ybo: cYbo,
        CalibPlus: cCalibPlus,
        Ybp: cYbp,
        RelX: cRelX
    }
    return f_calc
}

/**
 * 
 * TODO: Plotting rebuild ... 
 */
function plotMarker() {

    let plotSelection = "";
    /*  Preserve userlist of manually added Royal cubit values */
    const manualInput = document.getElementById("csvRc").value;
    plotSelection += manualInput;
    /* add the current preset 
        selection to the Rc list */
    plotSelection += lstPreset.addPresets.csvRc;
    /* add the current set selection to the Rc list. */
    plotSelection += lstSet.addSets.csvRc;
    /* plotselection to array */
    lstRc = eval("[" + plotSelection + "]");

    // Plot markers
    ctx = document.getElementById("vrCanvasPlotRc").getContext("2d");
    let cSet = initConvexSet(gBox);
    //===============
    // here clear the ctx / canvas
    // how to repaint the clear image
    // var memPristene = = canvas.toDataURL(); 
    img = new Image();
    img.src = gBox.gURI;
    ctx.drawImage(img, 0, 0);
    img.onload = function () {

        const markerLength = (cSet.cH);
        const markerYoffset = cSet.mPad.bottom;
        //===============
        // prep shade Convex Set;
        const saveFillStyle = ctx.fillStyle;
        const saveGlobalAlpha = ctx.globalAlpha;
        // shade 
        ctx.beginPath();
        //    ctx.clearRect(cSet.cX, cSet.cY, cSet.cW, cSet.cH);
        ctx.fillStyle = cSet.fill.color;
        ctx.globalAlpha = cSet.fill.gAlpha;
        ctx.fillRect(cSet.cX, cSet.cY + cSet.mPad.top, cSet.cW, cSet.cH + cSet.mPad.bottom);
        ctx.stroke();
        // restore values
        ctx.globalAlpha = saveGlobalAlpha;
        ctx.fillStyle = saveFillStyle;
        //End shade convex set

        // Start loop over Rc list to draw mappings

        for (let x in lstRc) {

            /*  Call The Algorithm with current 
                Royal cubit value -AND- the calibration
                for the current graph */
            curf = f(lstRc[x], gBox.graphCalib, gBox.rYears);

            // If the x-axis is reversed;
            if (gBox.reverseX) {
                // Works! Hands off!
                RcX = cSet.cX - ((1 - curf.RelX) * cSet.xPix);
            } else {
                //
                RcX = cSet.cX + (curf.RelX * cSet.xPix);
            }
            // Define a new Path:
            ctx.beginPath();
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = "black";
            ctx.lineWidth = .35;
            ctx.moveTo(RcX, cSet.cY + cSet.mPad.top);
            ctx.lineTo(RcX, cSet.cY + markerLength + cSet.mPad.bottom);
            // Stroke it (Do the Drawing)
            ctx.stroke();

        }
    }
}

/**
 * @abstract Defines the coordinates for the bounds in which the function values for f(Rc), i.e., 'the mappings', will occur. The algorithm 'folds' the real number line, and segments the real numberline in sections of interlaced function values. It, in fact, structures an addressable overlay onto a 14400 year window of time. The overlay has two hyperdense focii at f(1), the geometric center, and at f(infinity), at the right side (time 0) of the timeline. The latter represented by fRight=f(9 x10^(12)). The 'fold' occurs at f(Rc < 20), at which the function values 'reflect back' and a subset of these pile-up creating the hyperdensity at f(1), while the rest go to f(infinity) causing the hyperdensity there.
 * TODO: Goobledigook to math jargon. 
 * @param {*} gBox 
 * @returns cSet
 */
function initConvexSet(gBox) {
    var fLeft = f(999999999999, 1950, 20000).RelX; // x-axis 0-->20k
    var fRight = f(19.099999999, 1950, 20000).RelX; // x-axis 0-->20k
    var tmpPix = gBox.bottom.x - gBox.top.x;

    let cSet = {
        xPix: gBox.bottom.x - gBox.top.x,
        cX: (gBox.top.x + ((1 - fLeft) * tmpPix)), //),
        cY: gBox.top.y,
        cW: ((fLeft * tmpPix) - (fRight * tmpPix)),
        cH: (gBox.bottom.y - gBox.top.y),
        fill: {
            color: "lightblue",
            gAlpha: 0.10
        },
        mPad: {
            top: 5,
            bottom: -5
        }, // draw mapping lines in/outside bounds 
        img: "" // image for redrawing
    };

    // If the x-axis is reversed;
    if (gBox.reverseX) {
        gBox.top.x - (fLeft * gBox.rPix);
        cSet.cX = (gBox.bottom.x - ((1 - fLeft) * tmpPix));
        cSet.cW = -cSet.cW;
    }

    return cSet
}

/**
 * @param {*} lstPreset 
 * 
 */
function procesPreset(lstPreset) {
    //  Set addPresets.csvRc = ""
    lstPreset.addPresets.csvRc = "";
    for (x in lstPreset) {
        if (lstPreset[x].show) {
            lstPreset.addPresets.csvRc += "," + lstPreset[x].csvRc;
        }
    }
    /*   plotMarker() will add the current preSet 
         selection (lstpreSet.addSets) to the 
         Rc list got from the csvMap manual entry. */
    plotMarker(lstPreset);
}

/**
 * @param {*} lstSet 
 * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
 */
function procesSet(lstSet) {
    let ad_Rc = document.querySelector("input[id=csvRc]");
    // Prevent addSets from accumulating
    lstSet.addSets.csvRc = "";
    // 
    for (x in lstSet) { //x is here 'set1', 'set2',... not 1,2,3,...
        if (lstSet[x].show) {
            populateSetCsvRc(x)
            lstSet.addSets.csvRc += "," + lstSet[x].csvRc;
        }
    }
    /*   plotMarker() will add the current set 
         selection (lstSet.addSets) to the 
         Rc list got from the csvMap manual entry. */
    plotMarker(lstSet);
}

/**
 * @abstract The datastorage, the first passage, is defined in 5 unique measures of Royal cubit. Hypothesized is that this set of unique seed values are mathematically derived with the intent of generating a connected graph of mappings, targetting paleoclimatological. This program is, in fact, a lab utility to explore and falsify this hypothesis. The user can experiment with up to 9 seeds, and plot the mappings according to the sets. Each variation in 'n' seeds, leads to an array of 2^n possible combinations. Those are then expanded with 6 arithmetic mapping procedures. The aim is to determine wether the mappins resulting fron 5 orriginally stored seeds are randomly distributed, or indeed can be deemed to be a statistical significant mapping of unique climate events. 
 *  
 * @param {*} populateSetCsvRc(lstSet[x] 
 */
function populateSetCsvRc(x) {
    // Declare string litteral variables (max 9)
    // initialize for Additive, or Multiplicative 
    // arithmatic mapping.
    let AorM = (lstSet[x].AorM == 'M' ? 1 : 0);
    // let a, b, c, d, e, f, g, h, i = 0;
    let template = lstSet[x].strlit;
    let toMatch = "abcdefghi";
    var prepSeeds = [];
    var curSeeds = document.getElementById("csvSeeds").value
    // + 2, account for columns "dec", and "binary"
    var numcols = curSeeds.split(",").length + 1;
    // query selector by id: #theseedxtbl_body
    var tbody = document.querySelectorAll("#theseedxtbl_body")[0];
    var TRs = tbody.querySelectorAll("tr");
    for (let a = 0; a < TRs.length; a++) {
        var TDs = TRs[a].querySelectorAll("td");

        /*  tupleSeeds is dimensioned for the max
            number of seeds alowed. Added are two
            fields for the column 'dec', and 'binary'.*/
        var tupleSeeds = {
            0: "",
            1: "",
            2: "",
            3: "",
            4: "",
            5: "",
            6: "",
            7: "",
            8: "",
            9: "",
            10: ""
        };

        /*  Those fields which are not used for the 
            current combination, are set to '0' for
            sets that are additive in character, and
            '1' for multiplicative sets. */
        for (let j = 0; j <= numcols; j++) {
            if (TDs[j].innerHTML !== '0') {
                tupleSeeds[j] = TDs[j].innerHTML;
            } else {
                tupleSeeds[j] = AorM;
            }
        }
        prepSeeds.push(tupleSeeds);
    }

    /*  Rebuild the mappings for this set. This not
        a static set; Each set of n seeds has 2^n-1 
        mappings. i.e., [1,3,7,15,31,63,127,255,511] */
    lstSet[x].csvRc = "";

    // Select template for this set
    var useTemplate = lstSet[x].strlit;
    for (let y = 0; y <= numberXhaustive; y++) {

        // Restore template
        template = useTemplate;
        // Save 'Math.' from death by replacement   
        template = template.replace("Math.", "M@t@.");
        for (let i in toMatch) {
            //template = template.replace(toMatch.charAt(x), eval(toMatch.charAt(x)));
            if (i <= numcols - 2) {
                template = template.replace(toMatch.charAt(i), prepSeeds[y][numcols - i]);
            } else {
                template = template.replace(toMatch.charAt(i), AorM);
            }
        };
        // Take 'Math.' out of hiding, all is safe     
        template = template.replace("M@t@.", "Math.");
        // template = "`${" + template + "}`";
        // Calculate the template
        let calc = eval(("`${" + template + "}`"));
        // Add calc to lstSet.addSets.csvRc
        lstSet[x].csvRc += "," + calc;
    }
}

/**
* @abstractFor purpose of this program; The expanded table for the five seed values expand to (2^5)-1 = 31 combinations; Those are mapped by 6 sets of aritmethic operations, yielding    a connected graph of 6x31=186 (hypothesized) intentionally mapped events. While open to  the presence of more extensive sets, inhere I limit #seedvalues up to 9 seeds to play with for obvious reasons. 9 seedvalues yield 511x6=3072 'mapped events', and will be hard to validate by mere visual inspection for any intended pattern mapping, as the user will find the case.
* @returns 
*/
function expandSeedSet() {
    var varList = document.getElementById("csvSeeds").value;
    // Apply filter for maximum dimensions used for mapping 
    var maxDim = document.getElementById("dimension").value;

    /* convert the varList to a set of unique values
        The algorithm maps (combinations of) seed values
        to a specific window in time.
    */
    // Begin simple set construction
    var varArray = eval("[" + varList + "]");
    // sort the array in ascending order, and
    // maintain numerical order
    varArray.sort(function (a, b) {
        return a - b
    });
    // convert the given varList to a set of unique values
    let oldValue = null;
    let purged = 0;
    for (let i in varArray) {
        if (varArray[i] == oldValue) {
            varArray[i] = null;
            purged++;
        } else {
            oldValue = varArray[i]
        }
    }

    // Sort the array, null values gather at the end
    varArray.sort();
    // Pop the null values off the array
    for (let i = 1; i <= purged; i++) {
        oldValue = varArray.pop()
    }
    /*  
        Only sets of unique seeds are alowed, so rewrite the csvseeds textinput with the cleaned and sorted list. Sort the seeds in numerical order 
    */
    varArray.sort(function (a, b) {
        return a - b
    });
    var cleanVal = "";
    for (let i = 0; i <= varArray.length - 1; i++) {
        //prevent adding last seperator
        cleanVal += varArray[i] + (i < varArray.length - 1 ? "," : "");
    }
    document.getElementById("csvSeeds").value = cleanVal;
    // End simple set construction

    /* 
        Validate number of seed values: <legend class="maxseeds">
    */
    let seedAlert = document.getElementById("legendseedsmaps");
    if (varArray.length > 9) {
        seedAlert.classList.add("maxseeds");
        document.getElementById("csvSeeds").focus;
        return;
    } else {
        seedAlert.classList.remove("maxseeds");
    };

    // Proceed with a set of maximum 9 unique values 
    /* 
        convert the set of unique values to a exhaustive
        list of combinations. This list of seeds will form 
        the basis for consecutive additive, and multiplicative
        operations, which discloses an inter related graph of 
        vertices and edges, mapping specific moments in the 
        window in time.
    */
    numVars = varArray.length;
    /* 
        Generate the list of combinations 
        2^{numVars} => {1,2,4,8,16,32,64,128,...}. 
        The five seeds give (2x(2^5))-1 = 31 combinations!
    */
    numberXhaustive = Math.pow(2, numVars) - 1;

    //
    let buildSet = "[";
    let combiLine = "";
    let chkbit = 1;
    let padBin = "";
    let binaryColumns = "";

    //binaryLabels = "['dec','binary',"
    binaryLabels = "['dec','binary','dim',"
    //dimCount for the number of none-zero cells
    var dimCnt = 0;
    for (let j = 0; j <= numberXhaustive; j++) {
        // pad the line with preceding zeros (0)
        // up to numVars in length 
        padBin = "'" + "0".repeat(numVars - (j.toString(2).length)) + j.toString(2) + "'";
        //
        dimCnt = 0;
        combiLine = '[' + j + ',' + padBin + ',' + 'dim' + ',';
        // combiLine =  j + ',' + padBin + ',';
        for (let i = numVars - 1; i >= 0; i--) {
            // Piggyback column labeling on first itteration
            if (j == 0) {
                binaryLabels += "'" + String.fromCharCode(97 + i) + "'" + (i > 0 ? "," : "]");
            };
            // Compare bit position: 'n' AND j, e.g., b100(4) AND dec6(b110) = true 
            if ((chkbit << i) & j) {
                binaryColumns = varArray[i] + ',' + binaryColumns;
                //Increase dimCnt
                dimCnt = dimCnt + 1;
            } else {
                // Set value to 0 (zero)
                binaryColumns = 0 + ',' + binaryColumns;
            }
            // Concat binary columns
            combiLine += binaryColumns;
            binaryColumns = "";
        }
        /** Not all combinations are hypothesized intentional mappings. The expectation 
         * is that 3 dimensions are used for mappings. All other seed combinations are
         * needed to generate a connected graph of mappings. It would be an unlikely scenario
         * if there excist a set of n-seeds which will create a graph of 2^(n+1) - 1
         * vertices which all map to intended wheater events.
         */
        if (dimCnt <= maxDim) {
            // Postfix dimCnt to combiLine
            combiLine = combiLine.replace('dim', dimCnt);
            // Strip of last delimeter, add end bracket and delimeter.
            combiLine = combiLine.substr(0, combiLine.length - 1) + '],';
            buildSet += combiLine;
        } else {

        };
    }
    // Strip last delimeter and add closing bracket
    buildSet = buildSet.substr(0, buildSet.length - 1) + ']';
    //
    let expandedSet = eval(buildSet);
    // 
    theSet = Array.from(expandedSet);
    makeTheSeedXTbl();
    // redraw all
    plotMarker();
}

/**
 * @abstract 
 */
function makeTheSeedXTbl() {
    // Build html table
    let table = document.createElement('table');
    let tcaption = document.createElement('caption');
    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');
    //theseedxtbl theseedxtbl_body
    table.setAttribute('id', 'theseedxtbl');
    tbody.setAttribute('id', 'theseedxtbl_body');
    table.setAttribute('class', 'table table-striped caption-top table-sm table-hover');
    tbody.setAttribute('class', 'table-group-divider');
    thead.setAttribute('class', 'table-light');
    // 
    table.appendChild(thead);
    table.appendChild(tbody);

    // Creating and adding data to first row of the table
    let row_1 = document.createElement('tr');
    // generate header
    // binaryLabels to Array
    binaryLabels = eval(binaryLabels);
    let heading = [];
    for (h = 0; h <= numVars + 2; h++) { //numVars + 2 for cols ''dec','binary' and 'dim'
        heading[h] = document.createElement('th')
        heading[h].innerHTML = binaryLabels[h];
        row_1.appendChild(heading[h]);
    }
    //
    thead.appendChild(row_1);
    let row = [];
    let data = [];
    /**
     * numberXhaustive is based on all possible 2^n seed combinations.
     * With the id='dimension' filter, a reduced set is presented.
     * Try catch on data rows easy solution for setting numberXhaustive
     * and provide information rich caption 
     */
    // for (r = 0; r <= numberXhaustive; r++) {
    for (r = 0; r <= numberXhaustive; r++) {
        try {
            row[r] = document.createElement('tr');
            for (d = 0; d <= theSet[r].length - 1; d++) {
                data[d] = document.createElement('td');
                data[d].innerHTML = theSet[r][d];
                if (d >= 3 & data[d].innerHTML > 0) {
                    data[d].setAttribute('class', 'seedselected');
                }
                row[r].appendChild(data[d]);
            }
            tbody.appendChild(row[r]);
        } catch (error) {
            numberXhaustive = r - 1;
        }

    }
    // Set caption
    var curDim = document.getElementById("dimension").value;
    let newCaptiontext = `<b>The&nbsp;Seeds</b><br/>2<sup>${numVars}</sup>-1=${numberXhaustive}&nbsp;combinations (Filter: ${curDim}-D)`;
    tcaption.innerHTML = newCaptiontext;
    // set pop-up button text id="expandedseedbuttonLabel"
    document.getElementById("expandedseedbuttonLabel").innerHTML = newCaptiontext;
   
    table.appendChild(tcaption);

    // remove (previous) table in div 'theset'
    document.getElementById('theset').innerHTML = "";

    // Adding the table to div theset
    document.getElementById('theset').appendChild(table);

    triggerRedrawAll();
}

/**
 *  @abstract Obsolete??
 */
function triggerRedrawAll() {
    // Trigger twice to leave current user selection unchanged
    for (let i = 0; i <= 1; i++) {
        const event = new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: false, //true,
        });
        const cb = document.getElementById("chk_s1");
        const cancelled = !cb.dispatchEvent(event);

        if (cancelled) {
            // A handler called preventDefault.
            // alert("cancelled");
        } else {
            // None of the handlers called preventDefault.
            // alert("not cancelled");
        }
    }
}


/**
 * called from fetch(url)
 * @param {*} jsonString 
 * @param {*} atr_id 
 * @param {*} atr_class 
 * @param {*} theCaption 
 * @returns 
 */
function sheetToTbl(jsonString, atr_id, atr_class, theCaption) {
    var json = JSON.parse(jsonString);
    var table = `<table class="${atr_class}" id="${atr_id}"><caption>${theCaption}</caption><thead class="table-light"><tr>`
    // Retrieve the header labels got from the first row
    json.table.cols.forEach(column => table += `<th>${column.label}</th>`)
    // Itterate over all rows and retrieve the cell data
    table += '</tr></thead><tbody class="table-group-divider"> '
    json.table.rows.forEach(tuple => {
        table += '<tr>'
        tuple.c.forEach(attribute => {
            // try fails if cell value is null, then assign 
            // contents= '' (empty string)
            try {
                var contents = attribute.f ? attribute.f : attribute.v
            } catch (e) {
                var contents = ''
            }
            table += `<td><span class="d-inline-block text-truncate" style="max-width: 150px;">${contents}</span></td>`
        })
        table += '</tr></tbody>'
    })
    table += '</table>'
    return table
};

/**
 * @abstract Asynchronus fetch(url). Insert delay. For delay add .then(sleeper(20)) in fetch().
 * @param {*} ms 
 * @returns 
 */
function sleeper(ms) {
    return function (x) {
        return new Promise(resolve => setTimeout(() => resolve(x), ms));
    };
}

/**
 *  @abstract Event Listener for preset input elements.
 */
function presetEventListener() {
    /**
     * Event Listener for preset input elements.
     * chkPres[0] = document.querySelector("input[id=chk_pall]")
     */
    var chkPres = [];
    chkPres[0] = document.querySelector("input[id=chk_f1]");
    chkPres[1] = document.querySelector("input[id=chk_seeds]");
    chkPres[2] = document.querySelector("input[id=chk_kc]");
    chkPres[3] = document.querySelector("input[id=chk_extr]");

    for (let i = 0; i <= 3; i++) {
        chkPres[i].addEventListener('change', function () {

            if (this.id == 'chk_f1') {
                lstPreset.f1.show = this.checked;
            };
            if (this.id == 'chk_seeds') {
                lstPreset.seeds.show = this.checked;

                /*  If checked: Also resets the csvSeeds field 
                    to the initial 5 seeds from the 1th Passage */
                if (this.checked) {
                    // trigger event change text csvSeeds
                    /*  answered Dec 14, 2022 at 14:21 Hamid Heydari
                        stackoverflow: 
                        The question is Where and How? 
                        "Where" we want the change event to be triggered exactly at the moment after a bunch of codes is executed, and "How" is in the form of the following syntax: */
                    var triggerThis = document.getElementById("csvSeeds");
                    // do stuff: modify the value
                    triggerThis.value = lstPreset.seeds.csvRc;
                    // trigger change event on text box
                    triggerThis.dispatchEvent(new Event("change"));
                }
            };
            if (this.id == 'chk_kc') {
                lstPreset.kc.show = this.checked;
            };
            if (this.id == 'chk_extr') {
                lstPreset.extr.show = this.checked;
            };
            // Add presets to csvRc and redraw
            procesPreset(lstPreset);
        })
    };
}

/**
 * @abstract Event Listener for set input elements.
 */
function setEventListener() {
    /**
     * Event Listener for set input elements. 
     * 
     */
    var chkSet = [];
    //chkSet[0] = document.querySelector("input[id=chk_sall]");
    chkSet[0] = document.querySelector("input[id=chk_s1]");
    chkSet[1] = document.querySelector("input[id=chk_s2]");
    chkSet[2] = document.querySelector("input[id=chk_s3]");
    chkSet[3] = document.querySelector("input[id=chk_s4]");
    chkSet[4] = document.querySelector("input[id=chk_s5]");
    chkSet[5] = document.querySelector("input[id=chk_s6]");
    chkSet[6] = document.querySelector("input[id=chk_s7]");
    chkSet[7] = document.querySelector("input[id=chk_s8]");

    for (let i in chkSet) {
        chkSet[i].addEventListener('change', function () {
            if (this.id == 'chk_s1') {
                lstSet.set1.show = this.checked;
            };
            if (this.id == 'chk_s2') {
                lstSet.set2.show = this.checked;
            };
            if (this.id == 'chk_s3') {
                lstSet.set3.show = this.checked;
            };
            if (this.id == 'chk_s4') {
                lstSet.set4.show = this.checked;
            };
            if (this.id == 'chk_s5') {
                lstSet.set5.show = this.checked;
            };
            if (this.id == 'chk_s6') {
                lstSet.set6.show = this.checked;
            };
            if (this.id == 'chk_s7') {
                lstSet.set7.show = this.checked;
            };
            if (this.id == 'chk_s8') {
                lstSet.set8.show = this.checked;
            };
            // Add to csvRc
            procesSet(lstSet) //
        });
    }

}

/**
 * @abstract canvas[graphbox[convex set[mapping range]]]. Defines the square y,x axis range, the year range, and wether the x-axis is in reverse series. The used graphs are publicly shared, read only. Also a link to the dataset is provided, and a document uri. 
 */
function initGraphBox() {
    // var graphBox
    var gBox = {
        graphId: "",
        graphCalib: "", //  Iest data
        top: {
            x: 78,     //  78      103,
            y: 85       //  85      15
        },
        bottom: {
            x: 583,     //  583     393
            y: 310      //  310     420
        },
        rPix: "<calc>",
        rYears: 20000,
        yPerPix: "<calc>",
        reverseX: 'regular', // graph with reversed x-axis
        gFileName: "",
        gStored: "",
        dsetURI: "",
        gURI: "",
        gDocURI: "",
        saveImg: ""
    }
    // x-axis
    gBox.rPix = gBox.bottom.x - gBox.top.x;
    gBox.yPerPix = gBox.rYears / gBox.rPix;


    /**
     * include the fetch 
     * 
     */
    let gid = '0'
    let url = ''
    let id = '';

    // Fetch 'tbl_gBox'
    id = '1bB-SIFalx3B3WfEzbuobIr6utT0kU7LKuEyuxzLT2VY';
    //arrayFromSheet(tbl_gBox_id);
    url = 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:json&tq&gid=' + gid;
    fetch(url)
        .then(response => response.text())
        .then(data => document.getElementById("place_gbox").innerHTML = sheetToTbl(data.substring(47).slice(0, -2), "tbl_gbox", "table table-striped caption-top table-sm table-hover", "tbl gbox"))

    return gBox
}

function initArrayLstTables() {

    let lstTables = {
        table: "",
        info: "",
        sheetId: "",
        location: "",
        dataWikiURI: "",
        DiscordSrvr: "",
        dataDocURI: ""
    }

    let gid = '0'
    let url = ''
    let id = '';
    // Fetch 'data_vrpaleoplotter';
    // For delay add .then(sleeper(20)) in fetch().then list
    id = '1p6pFIaJQI_KIA8KFmJQmAkF8b9HzX1y6NCu9gIBTaDg';
    url = 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:json&tq&gid=' + gid;
    fetch(url)
        .then(response => response.text())
        .then(data => document.getElementById("place_tbl_tbllist").innerHTML = sheetToTbl(data.substring(47).slice(0, -2), "tbl_tbllist", "table table-striped caption-top table-sm table-hover", "tbl_tbllist"))

    return lstTables
}
/**
 * @abstract The m(arker) Plot array: mPlot array. The array contains the active mPlot session. Each mPlot session: plotId; Description. A focus list of Royal cubits for this plot. Links to: plotWikiURI and a plotDocURI. 
 * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
 */
function initArrayMplot() {
    let mPlot = {
        plotId: "",
        Description: "",
        graphlist: ['string 1', 'string 2', 'string 3'],
        plotWikiURI: "",
        DiscordSrvr: "",
        plotDocURI: "",
        mRoyalCubits: ""
    }
    /**
     * @abstract Populate mPlot array (todo: UI, db). Db of plots and callibration info.
     * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
     */
    mPlot.plotId = "vr_plt_0000001";
    mPlot.Description = "Comparitive mappins";
    //mplot.graphlist = eval('['+'grph00000000,grph00000001'+']');
    mPlot.plotWikiURI = "void";
    mPlot.DiscordSrvr = "void";
    mPlot.plotDocURI = "void";
    mPlot.mRoyalCubits = "";
    /**
     * include the fetch 
     * 
     */
    let gid = '0'
    let url = ''
    let id = '';
    // Fetch 'tbl_mplot'
    id = '1QRR_9DZsyRXTc2hsp4U5YX8gC4vtbWCi2KFugu63Cug';
    //arrayFromSheet(tbl_mplot_id);
    url = 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:json&tq&gid=' + gid;
    fetch(url)
        .then(response => response.text())
        .then(data => document.getElementById("place_mplot").innerHTML = sheetToTbl(data.substring(47).slice(0, -2), "tbl_mplot", "table table-striped caption-top table-sm table-hover", "tbl mplot"))

    return mPlot
}

/**
* @abstract Status array sets. Each set has an arithmetic template for expanding the core seed values into mappings of events in time. Template string literals in back-tic:'a*b*c*...', `${a}*${b}*${c}*...`, execute automatically. Therefore are stored in quotes "2*2.02*2.52* ..", triggered --> calc = eval("2*2.02*2.52* .."). Depending on AorM={A,M}, zero value columns get set to 0 or 1, to preserve overall results. A(dditive)-> 0, or M(ultiplicative), e.g., (A)[a+0+c+d+0+...], or (M)[a*1*c*d*1*...]
* TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
*/
function initArraySets() {
    let lstSet = {
        set1: {
            chkId: 'chk_s1',
            show: false,
            info: "Set 1",
            strlit: 'a+b+c+d+e+f+g+h+i',
            AorM: 'A',
            csvRc: ""
        },
        set2: {
            chkId: 'chk_s2',
            show: false,
            info: "Set 2",
            strlit: '(a**2)+(b**2)+(c**2)+(d**2)+(e**2)+(f**2)+(g**2)+(h**2)+(i**2)',
            AorM: 'A',
            csvRc: ""
        },
        set3: {
            chkId: 'chk_s3',
            show: false,
            info: "Set 3",
            strlit: 'Math.sqrt(a+b+c+d+e+f+g+h+i)',
            AorM: 'A',
            csvRc: ""
        },
        set4: {
            chkId: 'chk_s4',
            show: false,
            info: "Set 4",
            strlit: '(a**0.5)+(b**0.5)+(c**0.5)+(d**0.5)+(e**0.5)+(f**0.5)+(g**0.5)+(h**0.5)+(i**0.5)',
            AorM: 'A',
            csvRc: ""
        },

        set5: {
            chkId: 'chk_s5',
            show: false,
            info: "Set 5",
            strlit: 'a*b*c*d*e*f*g*h*i',
            AorM: 'M',
            csvRc: ""
        },
        set6: {
            chkId: 'chk_s6',
            show: false,
            info: "Set 6",
            strlit: '(a**2)*(b**2)*(c**2)*(d**2)*(e**2)*(f**2)*(g**2)*(h**2)*(i**2)',
            AorM: 'M',
            csvRc: ""
        },
        set7: {
            chkId: 'chk_s7',
            show: false,
            info: "Set 7",
            strlit: 'Math.sqrt(a*b*c*d*e*f*g*h*i)',
            AorM: 'M',
            csvRc: ""
        },
        set8: {
            chkId: 'chk_s8',
            show: false,
            info: "Set 8",
            strlit: '(a**0.5)*(b**0.5)*(c**0.5)*(d**0.5)*(e**0.5)*(f**0.5)*(g**0.5)*(h**0.5)*(i**0.5)',
            AorM: 'M',
            csvRc: ""
        },
        addSets: {
            chkId: null,
            show: false,
            info: "Cumulative list of sets",
            strlit: null,
            AorM: null,
            csvRc: ""
        },
    }
    /**
     * include the fetch 
     * 
     */
    let gid = '0'
    let url = ''
    let id = '';

    // Fetch 'tbl_sets'
    id = '1jKLwi9l8ck5KgbgmhwG4clmd70b6zKvsPEUPA036Tlk';
    //arrayFromSheet(tbl_sets_id);
    url = 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:json&tq&gid=' + gid;
    fetch(url)
        .then(response => response.text())
        .then(data => document.getElementById("place_sets").innerHTML = sheetToTbl(data.substring(47).slice(0, -2), "tbl_sets", "table table-striped caption-top table-sm table-hover", "tbl sets"))

    return lstSet
}
/**
 * @abstract Status array presets
 * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
 */
function initArrayPresets() {
    let lstPreset = {
        f1: {
            chkId: 'chk_f1',
            show: false,
            info: "The mapping for 1 Royal cubit:f(1))",
            csvRc: "1"
        },
        seeds: {
            chkId: 'chk_seeds',
            show: false,
            info: "First passage; 5 measures",
            csvRc: "2,2.02,2.52,2.98,5.5"
        },
        kc: {
            chkId: 'chk_kc',
            show: false,
            info: "Height of the King's chamber",
            csvRc: "11.17"
        },
        extr: {
            chkId: 'chk_extr',
            show: false,
            info: "Left, and right infinity convex set",
            csvRc: "19.099999,999999999"
        },
        addPresets: {
            chkId: null,
            show: false,
            info: "Cumulative list of presets",
            csvRc: ""
        }
    }
    /**
     * include the fetch 
     * 
     */
    let gid = '0'
    let url = ''
    let id = '';
    // Fetch 'tbl_presets'
    id = '1GdTl9vU4KPBG9nA9g6XWcVX2__PuAh1Y5HkrogYLhyw';
    //arrayFromSheet(tbl_presets_id);
    url = 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:json&tq&gid=' + gid;
    fetch(url)
        .then(response => response.text())
        .then(data => document.getElementById("place_presets").innerHTML = sheetToTbl(data.substring(47).slice(0, -2), "tbl_presets", "table table-striped caption-top table-sm table-hover", "tbl presets"))


    return lstPreset
}
