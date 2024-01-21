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
    const cCalibPlus = (2450 + Number(GraphCalib));
    const cYbp = cYbo + cCalibPlus;
    const cRyears = Number(Ryears);
    //const cRelX = 1 - (cYbp / cRyears);   
    const cRelX = (cYbp / cRyears);
    // return array of values
    const f_calc = {
        Rc: RoyalCubit,
        gon: cGon,
        isFloor: cIsFloor,
        f_hbar: cF_hbar,
        degPreses: cDegPreses,
        rYears: cRyears,
        CalibPlus: cCalibPlus,
        Ybo: cYbo,
        Ybp: cYbp,
        RelX: cRelX
    }
    console.info(f_calc);

    return f_calc
}

/**
 * 
 * TODO: Plotting rebuild ... 
 */
function plotMarker(gBox) {

    let plotSelection = "";
    /**  Preserve manually added Royal cubit list */
    const manualInput = document.getElementById("csvRc").value;
    plotSelection += manualInput;
    /** add the preset selection to the list */
    plotSelection += lstPreset.addPresets.csvRc;
    /** add the set selection to the list. */
    plotSelection += lstSet.addSets.csvRc;

    /** Convert plotselection to array */
    lstRc = eval("[" + plotSelection + "]");

    /** Start the plot markers procedure */
    var canvas = document.getElementById("vrCanvasPlotRc");
    var ctx = canvas.getContext("2d");
    //let ctx = document.getElementById("vrCanvasPlotRc").getContext("2d");

    /**
     * Call initGraphBox for currend graph
     */
    let useGraph = document.querySelector('input[name="radio_graph"]:checked').value;
    //console.info(`${useGraph} = document.querySelector("radio_graph").value`);
    var gBox = initGraphBox(useGraph) //

    /** 
     * repaint the clear image
     */
    var img = new Image();
    img.src = gBox.gURI;
    /** 
     * Wait until the image is loaded
     */
    img.onload = function () {
        /** 
         * maximize graph to screen width, and reduce 
         * whitespace below */
        canvas.width = img.width;
        canvas.height = canvas.width / (img.width / img.height);
        
        /** draw image */
        ctx.beginPath();
        ctx.drawImage(img, 0, 0);
        ctx.stroke();
        
        /** 
         * TODO: Make UI for positioning
         * Indicate graph data area
         */
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "red";
        /** */
        ctx.moveTo(gBox.top.x, gBox.top.y);
        ctx.lineTo(gBox.bottom.x, gBox.top.y);
        ctx.lineTo(gBox.bottom.x, gBox.bottom.y);
        ctx.lineTo(gBox.top.x, gBox.bottom.y);
        ctx.lineTo(gBox.top.x, gBox.bottom.y);
        ctx.lineTo(gBox.top.x, gBox.top.y);
        //*/
        ctx.stroke();
        ctx.strokeStyle = "black";
        /** End graph area indicater */

        /**
         *  prep shade Convex Set
         */
        const fYearZero = f(999999, gBox.graphCalib, gBox.rYears).RelX;
        const fYear14k4 = f(19.09999, gBox.graphCalib, gBox.rYears).RelX;
        let startX = gBox.top.x;
        /** 
         * startX plus or minus relative part of x-axis 
         * 
        */
        let xDistanceZero = fYearZero * gBox.rPix;
        let xDistance14k4 = fYear14k4 * gBox.rPix;
        /**  
         * for ctx.rect and ctx.fillRect, the width of the rectangle
         * is needed, not the x-position of the opposing corner.
         */
        let areaWidth = xDistance14k4 - xDistanceZero;
        /** When graph has reversed x-axis */
        if (gBox.reverseX == 'R2L') {
            startX = gBox.bottom.x;
            xDistanceZero *= -1;
            xDistance14k4 *= -1;
            areaWidth *= -1;
        }

        const markerYoffset = -5;
        /** compensate length marker with markerYoffset */
        const markerLength = (gBox.bottom.y - gBox.top.y) + markerYoffset;
        const saveFillStyle = ctx.fillStyle;
        const saveGlobalAlpha = ctx.globalAlpha;
        /**  
         * Indicate Graph upper left and lower right
         * TODO: Method for including user graphs
         */
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 1]);
        ctx.strokeStyle = "red";
        // Indicate begin x-axis
        ctx.rect(gBox.top.x-5,gBox.top.y - 5, 10,10);
        // Indicate end x-axis
        ctx.rect(gBox.bottom.x-5,gBox.bottom.y - 5, 10,10);
        ctx.stroke();
        ctx.strokeStyle = "black";
        /**  End indicate x-axis */

        /**  
         * Shade convex set window for selected graph
         */
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.fillStyle = "lightblue";
        ctx.globalAlpha = 0.5;
        //
        if (gBox.reverseX == 'L2R') {
           ctx.fillRect(gBox.top.x, gBox.top.y, xDistanceZero, gBox.bottom.y + gBox.top.y);
            ctx.fillRect(gBox.top.x + xDistance14k4, gBox.top.y, (gBox.rPix - xDistance14k4), gBox.bottom.y - gBox.top.y);
        } else {
            ctx.fillRect(gBox.bottom.x, gBox.top.y, xDistanceZero, gBox.bottom.y - gBox.top.y);
            ctx.fillRect(gBox.bottom.x + xDistance14k4, gBox.top.y, -(gBox.rPix + xDistance14k4), gBox.bottom.y - gBox.top.y);
        }

        /** Draw path */
        ctx.stroke();
        /** restore values */
        ctx.globalAlpha = saveGlobalAlpha;
        ctx.fillStyle = saveFillStyle;
        /** End shade convex set */

        /**
         *  Start loop over Rc list to draw mappings
         */
        var RcX = 0;
        //console.info(lstRc);
        for (let x in lstRc) {
            /** Call the algorithm for relative marker position */
            curf = f(lstRc[x], gBox.graphCalib, gBox.rYears).RelX;

            /** Relative portion offset from left side,
             *  or right side of x-axis */
            if (gBox.reverseX == 'R2L') {
                RcX = (gBox.bottom.x - gBox.rPix * curf);
                lineDash = [4, 2];
                lineColor = "blue";
                lineWidth = .5;

            } else {
                RcX = (gBox.top.x + gBox.rPix * curf);
                lineDash = [6, 6];
                lineColor = "blue";
                lineWidth = 2;
            }

            /**  */
            var lineDash = [11,5];
            var lineColor = "blue";
            var lineWidth = 1

            /** Plot the current marking */
            ctx.beginPath();
            ctx.setLineDash(lineDash);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lineWidth;
            ctx.moveTo(RcX, gBox.top.y - markerYoffset);
            ctx.lineTo(RcX, gBox.bottom.y + markerYoffset);
            ctx.stroke();
        }
    }
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
    var AorM = (lstSet[x].AorM == 'M' ? 1 : 0);
    // let a, b, c, d, e, f, g, h, i = 0;
    let template = lstSet[x].strlit;
    let toMatch = "abcdefghi";
    var prepSeeds = [];
    var curSeeds = document.getElementById("csvSeeds").value
    // + 2, account for columns "dec", and "binary"
    var numcols = curSeeds.split(",").length + 2;
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
    
    //onsole.info(prepSeeds);

    /*  Rebuild the mappings for this set. This not
        a static set; Each set of n seeds has 2^n-1 
        mappings. i.e., [1,3,7,15,31,63,127,255,511] */
    lstSet[x].csvRc = "";

    // Select template for this set
    var useTemplate = lstSet[x].strlit;
    //console.info(template);
    
    for (let y = 0; y <= numberXhaustive; y++) {

        // Restore template
        template = useTemplate;
        // Save 'Math.' from death by replacement   
        template = template.replace("Math.", "wxyz.");
        for (let v in toMatch) {            
            //template = template.replace(toMatch.charAt(x), eval(toMatch.charAt(x)));
            if (v <= numcols - 3) {
                template = template.replace(toMatch.charAt(v), prepSeeds[y][numcols - v]);
            } else {
                template = template.replace(toMatch.charAt(v), AorM);
            }
            //console.info(template);
    
        };
        // Take 'Math.' out of hiding, all is safe     
        template = template.replace("wxyz.", "Math.");
        // template = "`${" + template + "}`";
        //console.info(template);
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
    .is-invalid .is-valid
        */
    let seedAlert = document.getElementById("csvSeeds");
    let labelseedsmaps = document.getElementById("labelseedsmaps");
    //let curLabel = labelseedsmaps.innerHTML;
    seedAlert.classList.add("is-valid");
    if (varArray.length > 9) {
        labelseedsmaps.innerHTML = `${varArray.length - 9} too many!`;
        seedAlert.classList.add("is-invalid");
        seedAlert.focus();
        return;
    } else {
        seedAlert.classList.remove("is-invalid");
        labelseedsmaps.innerHTML = "Seeds (max. 9)";
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
    /* set max dimension to given number of seed values */
    document.getElementById("dimension").max = numVars;
    // Apply filter for maximum dimensions used for mapping 
    var maxDim = document.getElementById("dimension").value;
    document.getElementById("labeldimension").innerHTML = `Group: ${maxDim}`;

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
        /** 
         * The expectation is that not all combinations possible with n-seeds, 
         * do map to selected weather events . 
         * It seems unlikely for there to exsist a set of n-seeds which 
         * will create a graph of (2^(n+1) - 1) x 8 sets, vertices which all map 
         * to wheater events selected to be included. However: ((2^5)-1) x 8 sets
         * = 248 mappings, lets say 248 integer year numbers. The convex set = 14400
         * years wide. The Hamming distance consists of increments of 0.01 Rc (~0.5 cm).
         * The algorithm aids in selecting seeds <20Rc (~10 meters), 2000 choices/seed.
         * 5 seeds = 2000^5 configurations, or 3.2 x 10^16. Divide this by 14400 and
         * we find 2.22 x 10^12 available combinations to 'paint' the convex set.
         * Is it possible to find a matching set of seeds by given set of 248 mappings?
         * 
         */
        if (dimCnt == maxDim || maxDim==0) {
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
    let newCaptiontext = `<b>The&nbsp;Seeds</b><br />Group:&nbsp;${curDim}&nbsp;seeds&nbsp;=&nbsp;${numberXhaustive+1}&nbsp;combinations`;
    // set pop-up button text id="expandedseedbuttonLabel"
    //document.getElementById("expandedseedbuttonLabel").innerHTML = newCaptiontext;
    // set the table caption
    tcaption.innerHTML = newCaptiontext;
    table.appendChild(tcaption);

    // remove (previous) table in div 'theset'
    document.getElementById('theset').innerHTML = "";

    // Adding the table to div theset
    document.getElementById('theset').appendChild(table);

    triggerRedrawAll();
}

/**
 *  @abstract 
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

    /**
     * Event Listener for graph select input elements. 
     * 
     */
    var radioG = [];
    radioG[0] = document.querySelector("input[id=graph00]");
    radioG[1] = document.querySelector("input[id=graph01]");
    radioG[2] = document.querySelector("input[id=graph02]");
    radioG[3] = document.querySelector("input[id=graph03]");
    for (let i in radioG) {
        radioG[i].addEventListener('change', function () {
            if (this.id == 'graph00') {
                gBox = initGraphBox(this.value);
                plotMarker(gBox);            
            };
            if (this.id == 'graph01') {
                gBox = initGraphBox(this.value);
                plotMarker(gBox);  
            };
            if (this.id == 'graph02') {
                gBox = initGraphBox(this.value);
                plotMarker(gBox);  
            };
            if (this.id == 'graph03') {
                gBox = initGraphBox(this.value);
                plotMarker(gBox);  
            };
        });
                
    }

}

/**
 * @abstract canvas[graphbox[convex set[mapping range]]]. Defines the square y,x axis range, the year range, and wether the x-axis is in reverse series. The used graphs are publicly shared, read only. Also a link to the dataset is provided, and a document uri. 
 */
function initGraphBox(useGraph) {
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

    // var graphBox
    var gBox = {
        graphId: "",
        graphCalib: "", //  Iest data
        top: {
            x: 0,     //  78      103,
            y: 0       //  85      15
        },
        bottom: {
            x: 0,     //  583     393
            y: 0      //  310     420
        },
        rPix: "<calc>",
        rYears: 0,
        yPerPix: 0,
        reverseX: '', // 'regular' graph with reversed x-axis
        gFileName: "",
        gStored: "",
        dsetURI: "",
        gURI: "",
        gDocURI: "",
        saveImg: ""
    }

    /** 
     var graph = Array.from(
      ['https://drive.google.com/uc?id=11FcRDMQ1UXYX6g6N9z18GTSiSMvkhDMh', 
      'https://drive.google.com/uc?id=171Me953e5MFlMZvAltIkyKI0HiPk1NA_',
      'https://drive.google.com/uc?id=1J6a0GsHypYRLuxSXikfWIekiguPQaZM3']);
      */

    var graph = Array.from(['media\\Alley, R.B.. 2004. GISP2 Ice Core Temperature .png', 'media\\Years-before-present-Younger-Dryasplushydro.png', 'media\\Comparison-of-climate-records-The-intervals-of-Heinrich-event-2-H2-the-Last-Glacial.png', 'media\\deglacial_forest_conundrum_Nature.png']);


    var coord = [
        [
            [78, 85],           //gBox.top.x ,gBox.top.y
            [581, 310],         //gBox.bottom.x, gBox.bottom.y
            [1950, 20000],      //gBox.graphCalib, gBox.rYears
            ["R2L", "<unused>"] //gBox.reverseX
        ],
        [
            [103, 15],
            [393, 420],         // Aanpassen aan view port. Daarna mappen..
            [1950, 20000],
            ["R2L", "<unused>"]
        ],
        [
            [120, 75],
            [720, 1430],
            [1950, 28000],
            ["L2R", "<unused>"]
        ],
        [
            [137, 0],
            [591, 674],
            [1950, 20000],
            ["R2L", "<unused>"]
        ]
    ];

    //console.info(`set = ${useGraph};`);
    gBox.gURI = graph[useGraph];
    gBox.top.x = coord[useGraph][0][0];
    gBox.top.y = coord[useGraph][0][1];
    gBox.bottom.x = coord[useGraph][1][0];
    gBox.bottom.y = coord[useGraph][1][1];
    gBox.graphCalib = coord[useGraph][2][0];
    gBox.rYears = coord[useGraph][2][1];
    gBox.reverseX = coord[useGraph][3][0];

    // x-axis calculated values
    gBox.rPix = gBox.bottom.x - gBox.top.x;
    gBox.yPerPix = gBox.rYears / gBox.rPix;

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
            // sqrt(pi) strlit: '(a*1.772)+(b*1.772)+(c*1.772)+(d*1.772)+(e*1.772)+(f*1.772)+(g*1.772)+(h*1.772)+(i*1.772)',
            // sqrt(2) 
            strlit: '(a*1.414)+(b*1.414)+(c*1.414)+(d*1.414)+(e*1.414)+(f*1.414)+(g*1.414)+(h*1.414)+(i*1.414)',
            AorM: 'A',
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
