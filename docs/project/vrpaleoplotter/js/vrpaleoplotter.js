
/**
 * for reminder
 * multiplication(2, 3);
 * @--example // returns -6
 * @--param {number} a - a number to multiply
 * @--param {number} b - a number to multiply
 * multiplication(-2, 3);
    function multiplication(a, b) {
        return a * b;
    };
 */

/**
 * for reminder
 * @--param {*} e 
    function setPosition(e) {
        let canvas = document.getElementById("canvas")
        let bounds = canvas.getBoundingClientRect()
        pos.x = e.clientX - bounds.x
        pos.y = e.clientY - bounds.y
    }
 */



/**
 * 
 * TODO: Plotting rebuild ... 
 */
function plotMarker() {
    let plotSelection = "";
    /*  Preserve userlist of manually added Royal cubit values */
    const manualInput = document.getElementById("csvRc").value;
    plotSelection += manualInput;
    //console.info(`manualInput+=${manualInput}`);
    /* add the current preset 
        selection to the Rc list */
    plotSelection += lstPreset.addPresets.csvRc;
    //console.info(`lstPreset.addPresets.csvRc=${lstPreset.addPresets.csvRc}`)
    /* add the current set selection to the Rc list. */
    plotSelection += lstSet.addSets.csvRc;
    //console.info(`lstSet.addPresets.csvRc=${lstSet.addSets.csvRc}`)
    /* plotselection to array */
    lstRc = eval("[" + plotSelection + "]");

    // Plot markers
    ctx = document.getElementById("vrCanvasPlotRc").getContext("2d");
    let cSet = initConvexSet(gBox);
    const markerLength = (cSet.cH);
    const markerYoffset = cSet.mPad.bottom;

    // Start loop over Rc list to draw mappings
    var testcnt = 0;
    for (let x in lstRc) {

        /*  Call The Algorithm with current 
            Royal cubit value -AND- the calibration
            for the current graph */
        curf = f(lstRc[x], gBox.graphCalib, gBox.rYears);

        // If the x-axis is reversed;
        if (gBox.reverseX) {
            // Works! Hands off!
            RcX = cSet.cX - ((1 - curf.RelX) * cSet.xPix);
            console.info(`${RcX} = ${cSet.cX} - ((${1 - curf.RelX}) * ${cSet.xPix})`);
        } else {
            //
            RcX = cSet.cX + (curf.RelX * cSet.xPix);
            console.info(`${RcX} = ${cSet.cX} + (${curf.RelX} * ${cSet.xPix})`);
        }
        //console.info(`RcX = ${RcX} : cSet.cX - ${cSet.cX}`);

        // Define a new Path:
        ctx.beginPath();
        ctx.setLineDash([5, 2]);
        ctx.moveTo(RcX, cSet.cY + cSet.mPad.top);
        ctx.lineTo(RcX, cSet.cY + markerLength + cSet.mPad.bottom);
        // Stroke it (Do the Drawing)
        ctx.stroke();
        testcnt += 4;

    }

}

// Initialize global arrays
console.info('init Arrays over here');
var lstPreset = initArrayPresets();
var lstSet = initArraySets();
var mPlot = initArrayMplot();
var gBox = initGraphBox();
var lstTables = initArrayLstTables();

// Declare global variables
var theSet = '',
    binaryLabels = '',
    numVars = '',
    numberXhaustive = '';


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
//console.info(gBox);

// initialize convex set
cSet = initConvexSet(gBox);
//console.info(cSet);

/**
 *  @abstract Delay execution until canvas is ready for bussiness
 */
var canvas = document.getElementById("vrCanvasPlotRc");
var ctx = canvas.getContext("2d");
var img = new Image();
img.onload = function () {
    // tidy up
    canvas.width = img.width;
    canvas.height = canvas.width / (img.width / img.height);

    // Draw graph
    ctx.drawImage(img, 0, 0);
    // Actions 
    setEventListeners();
    // Call expandSeedSet()
    expandSeedSet();
    // Call plotMarker()
    plotMarker();
};
var rect = canvas.getBoundingClientRect();
img.src = gBox.gURI;

