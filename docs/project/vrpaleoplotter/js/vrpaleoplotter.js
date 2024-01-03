
/**
 * @example
 * // returns 6
 * multiplication(2, 3);
 * @example
 * // returns -6
 * @param {number} a - a number to multiply
 * @param {number} b - a number to multiply
 * multiplication(-2, 3);
 * function multiplication(a, b) {
 *    return a * b;
 * };
 */

function initConvexSet(gBox) {
    const fLeft = f(19.099999999, 1950, 20000).RelX;
    const fRight = f(999999999999, 1950, 20000).RelX;
    const tmpPix = gBox.bottom.x - gBox.top.x;
    let cSet = {
        xPix: tmpPix,
        cX: gBox.top.x + ((gBox.bottom.x - gBox.top.x) * (fLeft)),
        cY: gBox.top.y,
        cW: (fRight * tmpPix) - (fLeft * tmpPix),
        cH: gBox.bottom.y - gBox.top.y,
        fill: {
            color: "lightblue",
            gAlpha: 0.21
        },
        mPad: {
            top: 5,
            bottom: -5
        } // draw mapping lines in/outside bounds 
    };
    return cSet
}

/**
 * 
 * TODO: Plotting rebuild ... 
 */
function plotMarker() {
    let plotSelection = "";

    /*  Preserve users manually added  Royal cubit values */
    let manualInput = document.getElementById("csvRc").value;
    plotSelection += manualInput;

    /*  plotMarker() will add the current preset 
        selection (lstPreset.addPresets.csvRc) to the 
        Rc list got from the csvMap manual entry. */
    plotSelection += lstPreset.addPresets.csvRc;

    /*  plotMarker() will add the current set 
        selection (lstSet.addSets.csvRc) to the 
        Rc list got from the csvMap manual entry. */
    plotSelection += lstSet.addSets.csvRc;

    /*  shade the convex set area   
        Array declaration: Use eval() for on the fly array construction. */
    lstRc = eval("[" + plotSelection + "]");
    
    // shade convex set area
    shadeConvexSet();
    var markX = 0; //
    // Start loop over Rc list to draw mappings
    for (let x in lstRc) {
        
        /*  Call The Algorithm with current 
            Royal cubit value -AND- the calibration
            for the current graph */
        curf = f(lstRc[x], gBox.graphCalib, gBox.rYears);
        RcX = gBox.top.x + (curf.RelX * (gBox.bottom.x - gBox.top.x));
        
        // Define a new Path:
        ctx.beginPath();
        //======================
        // reversed x-axis
        // works in test gBox.top.x + ((gBox.bottom.x - gBox.top.x) * (fLeft))
        // How big a chunck from the x-axis?
        chunck = (curf.RelX * (gBox.bottom.x - gBox.top.x));
        console.info(`chunck <- ${chunck} = ${curf.RelX} * (${gBox.bottom.x} - ${gBox.top.x})`);
        markX = gBox.bottom.x - chunck;
        console.info("markX = " + markX);
        
        ctx.setLineDash([4, 2]);
        ctx.moveTo(markX, gBox.bottom.y + cSet.mPad.bottom);
        ctx.lineTo(markX, gBox.top.y + cSet.mPad.top);
        //======================
        // Stroke it (Do the Drawing)
        ctx.stroke();

    }

}

//==============================================
//==============================================
//==============================================

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



//==============================================
//==============================================
//==============================================







/**
 * 
 * @param {*} e 
 */
function setPosition(e) {
    let canvas = document.getElementById("canvas")
    let bounds = canvas.getBoundingClientRect()
    pos.x = e.clientX - bounds.x
    pos.y = e.clientY - bounds.y
}



/**
 * @abstract The m(arker) Plot array: mPlot array. The array contains the active mPlot session. Each mPlot session: plotId; Description. A focus list of Royal cubits for this plot. Links to: plotWikiURI and a plotDocURI. 
 * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
 */
var mPlot = {
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
 * @abstract The r(ange) Value array: rValue contains formatting information needed for the use of graphs as backdrop to overlay the algorithms mappings. The mPlot>>rValue has a one-to-many relation.
 * TODO: switch backdrop graphs dynamically, e.g., Alley 2004 Gisp2 ice core, and, for instance, the Lea 2003 Caraco Basin sediment core data. 
 * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
 */
/*
var rValue = {
    graphId: '',
    GraphCalib: 0,
    Lx: 0,
    Ty: 0,
    Rx: 0,
    By: 0,
    Rpix: 0,
    Ryears: 0,
    YperPix: 0,
    reverseR: true,
    dataSet: '',
    GraphFileName: '',
    GraphStored: '',
    dsetURI: '',
    GraphURI: '',
    GraphDocURI: 0
};
*/

/**
 * @abstract Populate rValue array (todo: UI, db). Db of graphs and callibration info. Google share links, format URI as follows: 'https://drive.google.com/uc?id=...<long number>...';  Location: ..\sitesgoogle\vrmedia\graphs.
 * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
 */

/*
rValue.graphId = "vr_graph_0001";
rValue.GraphCalib = 1950;
rValue.Lx = 78;
rValue.Ty = 85;
rValue.Rx = 505;
rValue.By = 225;
rValue.Rpix = rValue.Rx - rValue.Lx;
rValue.Ryears = 20000;
rValue.YperPix = (rValue.rangeYears / rValue.Rpix);
rValue.reverseR = true;
rValue.dataSet = "Alley_Gisp_2004";
rValue.GraphFileName = "Alley, R.B.. 2004. GISP2 Ice Core Temperature .png";
rValue.GraphStored = "..\virgorises\google_site\vrmedia\graphs";
rValue.dsetURI = 'https://drive.google.com/uc?...';
rValue.GraphURI = 'https://drive.google.com/uc?id=11FcRDMQ1UXYX6g6N9z18GTSiSMvkhDMh';
rValue.GraphDocURI = "void";
*/

/**
 * @abstract Status array sets. Each set has an arithmetic template for expanding the core seed values into mappings of events in time. Template string literals in back-tic:'a*b*c*...', `${a}*${b}*${c}*...`, execute automatically. Therefore are stored in quotes "2*2.02*2.52* ..", triggered --> calc = eval("2*2.02*2.52* .."). Depending on AorM={A,M}, zero value columns get set to 0 or 1, to preserve overall results. A(dditive)-> 0, or M(ultiplicative), e.g., (A)[a+0+c+d+0+...], or (M)[a*1*c*d*1*...]
 * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
 */
var lstSet = {
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
 * @abstract Status array presets
 * TODO: getSheetData() imports google sheet data to HTML tabels. Replace the use of the arrays by use of the HTML tabels.
 */
var lstPreset = {
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



// Temporary test goof
var graph = Array.from(['https://drive.google.com/uc?id=11FcRDMQ1UXYX6g6N9z18GTSiSMvkhDMh', 'https://drive.google.com/uc?id=171Me953e5MFlMZvAltIkyKI0HiPk1NA_']);

var coord = [
    [
        [78, 85],
        [583, 310]
    ],
    [
        [103, 15],
        [393, 420]
    ]
];

//===============
var set = 0;
//===============

gBox.gURI = graph[set];
//console.info(gBox.gURI);

gBox.top.x = coord[set][0][0];
gBox.top.y = coord[set][0][1];
gBox.bottom.x = coord[set][1][0];
gBox.bottom.y = coord[set][1][1];
console.info(gBox);

// initialize convex set
cSet = initConvexSet(gBox);

console.info(cSet);


/**
 *  @abstract Delay execution until canvas is ready for bussiness
 */

var canvas = document.getElementById("vrCanvasPlotRc");
var ctx = canvas.getContext("2d");
var img = new Image();
img.onload = function() {

    ctx.drawImage(img, 0, 0);    
    
    // Initial run 
    // Fetch google sheet data
    // fetches all tables
    getSheetData();
    // Call expandSeedSet()
    expandSeedSet();
    // Call plotMarker()
    plotMarker();

    // drawConvexSet();
};

img.src = gBox.gURI; //strDataURI;
//img.clientWidth
rect=canvas.getBoundingClientRect();
img.style.width = rect.width+'px';
img.style.height= (rect.width / (img.width/img.height))+'px';
console.info(rect.width + " : " + rect.height);
console.info(img.width + " : " + img.height);



/**
 * @abstract Event Listener for preset input elements. chkPres[0] = document.querySelector("input[id=chk_pall]")
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
 * @abstract Event Listener for set input elements. chkSet[0] = document.querySelector("input[id=chk_sall]")
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




var theSet = '',
    binaryLabels = '',
    numVars = '',
    numberXhaustive = '';
/**
 * @abstract Indicate convex set by shading. The convex set. All function values map Royal cubits line segments to presessional degree circle segments. The algorithm's domain is (all) the rational numbers, given in Royal cubits. The output range, f(Rc) ∈ ℝ, is given in Gon (decimal degrees), but are treated as if x°(360 degrees). 'Gon' is a correct assumption because the range consists of a 200 gon semi circle. It is obvious that the gon is treated as if a value in x° because, without further conversion, those gon are multiplied by 72 presessional years. The presessional model, of course, is based on the 12 sign 360 dgr(°), minute('), second ('') system.
 * TODO: Plotting rebuild (working)
 */
function shadeConvexSet() {  // was drawConvexSet() {
    // init 
    ctx.drawImage(img, 0, 0);

    ctx.beginPath();
    // Convex set
    // draw gBox window
    ctx.fillStyle = "lightgrey"; //"#F5F5F5";
    ctx.globalAlpha = 0.3;
    //ctx.fillRect(gBox.top.x, gBox.top.y, (gBox.bottom.x - gBox.top.x), (gBox.bottom.y - gBox.top.y));

    ctx.fillStyle = cSet.fill.color; //"#F5F5F5";
    //Draw convex set window
    ctx.globalAlpha = cSet.fill.gAlpha;

    //shading
    ctx.fillRect(cSet.cX, cSet.cY, cSet.cW, cSet.cH);
    ctx.globalAlpha = 1.0;
    // Stroke it (Do the Drawing)
    ctx.stroke();

    ctx.strokeStyle = "black"; //"#F5F5F5";
    //End draw convex set window

}