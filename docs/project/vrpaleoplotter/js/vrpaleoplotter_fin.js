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
    //console.info(f_calc);
    return f_calc
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
    plotMarker();
}

/**
 * @param {*} lstSet 
 * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
 */
function procesSet(lstSet) {
    let ad_Rc = document.querySelector("input[id=csvRc]");
    // Prevent addSets from accumulating
    lstSet.addSets.csvRc = "";
    for (x in lstSet) {
        if (lstSet[x].show) {

            populateSetCsvRc(x)
            lstSet.addSets.csvRc += "," + lstSet[x].csvRc;
            //console.info(lstSet[x]);
        }
    }
    /*   plotMarker() will add the current set 
         selection (lstSet.addSets) to the 
         Rc list got from the csvMap manual entry. */
    plotMarker();
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
    // console.info(TRs);
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
        //console.info(template + '= ' + calc);
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
    // https://www.w3schools.com/jsref/jsref_sort.asp
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

    // makeTheSeedXTbl(theSet, binaryLabels)
    binaryLabels = "['dec','binary',"
    //
    for (let j = 0; j <= numberXhaustive; j++) {
        // pad the line with preceding zeros (0)
        // up to numVars in length 
        padBin = "'" + "0".repeat(numVars - (j.toString(2).length)) + j.toString(2) + "'";
        //
        combiLine = '[' + j + ',' + padBin + ',';
        for (let i = numVars - 1; i >= 0; i--) {
            // Piggyback column labeling on first itteration
            if (j == 0) {
                binaryLabels += "'" + String.fromCharCode(97 + i) + "'" + (i > 0 ? "," : "]");
                // console.info(binaryLabels)
            };
            /* 
                Compare bit position: 'n' AND j, e.g., b100(4) AND dec6(b110) = true 
            */
            if ((chkbit << i) & j) {
                //console.info('(chkbit << i) & j -> keep value;
                binaryColumns = varArray[i] + ',' + binaryColumns;
            } else {
                // Set value to 0 (zero)
                binaryColumns = 0 + ',' + binaryColumns;
            }
            // Concat binary columns
            combiLine += binaryColumns;
            //console.info(combiLine);
            binaryColumns = "";
        }
        // Strip of last delimeter, add end bracket and delimeter.
        combiLine = combiLine.substr(0, combiLine.length - 1) + '],';
        //console.info(combiLine);
        buildSet += combiLine;
    }
    // Strip last delimeter and add closing bracket
    buildSet = buildSet.substr(0, buildSet.length - 1) + ']';
    //
    // console.info(buildSet);
    let expandedSet = eval(buildSet);

    // 
    theSet = Array.from(expandedSet);
    makeTheSeedXTbl();
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

    // Set caption
    let newCaptiontext = `<b>The&nbsp;Seeds</b><br/>2<sup>${numVars}</sup>-1=${numberXhaustive}&nbsp;combinations`;
    tcaption.innerHTML = newCaptiontext;
    // set pop-up button text id="expandedseedbuttonLabel"
    document.getElementById("expandedseedbuttonLabel").innerHTML = newCaptiontext;
    //console.info(document.getElementById("expandedseedbuttonLabel").innerHTML);

    table.appendChild(tcaption);
    table.appendChild(thead);
    table.appendChild(tbody);

    // Creating and adding data to first row of the table
    let row_1 = document.createElement('tr');
    // generate header
    // binaryLabels to Array
    // console.info(binaryLabels);
    binaryLabels = eval(binaryLabels);
    let heading = [];
    for (h = 0; h <= numVars + 1; h++) {
        heading[h] = document.createElement('th')
        heading[h].innerHTML = binaryLabels[h];
        row_1.appendChild(heading[h]);
    }
    //
    thead.appendChild(row_1);
    let row = [];
    let data = [];
    for (r = 0; r <= numberXhaustive; r++) {
        row[r] = document.createElement('tr');
        for (d = 0; d <= theSet[r].length - 1; d++) {
            data[d] = document.createElement('td');
            data[d].innerHTML = theSet[r][d];
            if (d >= 2 & data[d].innerHTML > 0) {
                data[d].setAttribute('class', 'seedselected');
                //console.info("seedselected: cel "+d+"="+data[d].innerHTML);
            }
            row[r].appendChild(data[d]);
        }
        tbody.appendChild(row[r]);
    }
    // remove (previous) table in div 'theset'
    document.getElementById('theset').innerHTML = "";

    // Adding the table to div theset
    document.getElementById('theset').appendChild(table);

    /*
        
    */
    triggerRedrawAll();
}

/**
 *  @abstract Refresh html table, trigger redraw current selection. Just toggle preset id='chk_s1' which forces recalculating mappings based on new 2^n combinations. 
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
 * data.substring(47).slice(0,-2)) pics data part from 
 * the sheets response string. substring(4) (from pos 47, 
 * just past the brace to the end), and from this slice 
 * the part from the mostleft character (0th), uptil -2
 * characters from the end of the response string
 * .i.e.,(cutting of the last brace from the string.)
 */
function getSheetData() {
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
    //console.info(json);
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
 *  @abstract Event Listener for set, and preset input elements.
 */
function setEventListeners() {
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
            //console.info(this.id + " checked=" + this.checked);

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
            procesPreset(lstPreset)
        })
    };


    /**
     * Event Listener for set input elements. 
     * chkSet[0] = document.querySelector("input[id=chk_sall]")
     */
    var chkSet = [];
    //chkSet[0] = document.querySelector("input[id=chk_sall]");
    chkSet[0] = document.querySelector("input[id=chk_s1]");
    chkSet[1] = document.querySelector("input[id=chk_s2]");
    chkSet[2] = document.querySelector("input[id=chk_s3]");
    chkSet[3] = document.querySelector("input[id=chk_s4]");
    chkSet[4] = document.querySelector("input[id=chk_s5]");
    chkSet[5] = document.querySelector("input[id=chk_s6]");

    for (i in chkSet) {
        chkSet[i].addEventListener('change', function () {
            //console.info(`${this.id} checked=${this.checked}`);
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
            // Add to csvRc
            procesSet(lstSet) //
        });
    }

}

/**
 * @abstract 
 */
function initGraphBox() {
    // var graphBox
    var gBox = {
        graphId: "",
        graphCalib: "", //  Iest data
        top: {
            x: 103,     //  78      103,
            y: 15       //  85      15
        },
        bottom: {
            x: 393,     //  583     393
            y: 420      //  310     420
        },
        rPix: "<calc>",
        rYears: 20000,
        yPerPix: "<calc>",
        reverseX: true,
        gFileName: "",
        gStored: "",
        dsetURI: "",
        gURI: "",
        gDocURI: ""
    }

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
            strlit: 'a*b*c*d*e*f*g*h*i',
            AorM: 'M',
            csvRc: ""
        },
        set2: {
            chkId: 'chk_s2',
            show: false,
            info: "Set 2",
            strlit: 'a+b+c+d+e+f+g+h+i',
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
            strlit: 'Math.sqrt(a*b*c*d*e*f*g*h*i)',
            AorM: 'M',
            csvRc: ""
        },
        set5: {
            chkId: 'chk_s5',
            show: false,
            info: "Set 5",
            strlit: '(a**2)*(b**2)*(c**2)*(d**2)*(e**2)*(f**2)*(g**2)*(h**2)*(i**2)',
            AorM: 'M',
            csvRc: ""
        },
        set6: {
            chkId: 'chk_s6',
            show: false,
            info: "Set 6",
            strlit: '(a**0.5)+(b**0.5)+(c**0.5)+(d**0.5)+(e**0.5)+(f**0.5)+(g**0.5)+(h**0.5)+(i**0.5)',
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
