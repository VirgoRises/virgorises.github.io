
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
 * @abstract Defines the coordinates for the bounds in which the function values for f(Rc), i.e., the mappings, will occur. The algorithm 'folds' the real number line, and segments the real numberline in sections of interlaced function values. It, in fact, structures an addressable overlay onto a 14400 year window of time. The overlay has two hyperdense focii at f(1), the geometric center, and at f(infinity), at the right side (time 0) of the timeline. The latter represented by fRight=f(9 x10^(12)). The 'fold' occurs at f(Rc < 20), at which the function values 'reflect back' and a subset of these pile-up creating the hyperdensity at f(1), while the rest go to f(infinity) causing the hyperdensity there.
 * TODO: Goobledigook to math jargon. 
 * @param {*} gBox 
 * @returns cSet
 */
function initConvexSet(gBox) {
    var fLeft = f(999999999999, 1950, 20000).RelX; // x-axis 0-->20k
    var fRight = f(19.099999999, 1950, 20000).RelX; // x-axis 0-->20k
    var tmpPix= gBox.bottom.x - gBox.top.x;
    console.info(`fLeft = f(999999999999, 1950, 20000).RelX = ${fLeft}`);
    console.info(`fRight = f(19.099999999, 1950, 20000).RelX = ${fRight}`);
    
    let cSet = {
        xPix: gBox.bottom.x - gBox.top.x,
        cX: (gBox.top.x + ((1-fLeft) * tmpPix)), //),
        cY: gBox.top.y ,
        cW: ((fLeft * tmpPix) - (fRight * tmpPix)),
        cH: (gBox.bottom.y - gBox.top.y),
        fill: {
            color: "lightblue",
            gAlpha: 0.15
        },
        mPad: {
            top: 5,
            bottom: -5
        } // draw mapping lines in/outside bounds 
    };
    // calculated values
    //gBox.reverseX = true;
    if (gBox.reverseX) {
        console.info("gBox reverse");
        gBox.top.x - (fLeft * gBox.rPix);
        }

    // shade Convex Set;
    ctx = document.getElementById("vrCanvasPlotRc").getContext("2d");
    
    // If the x-axis is reversed;
    if (gBox.reverseX) {
        cSet.cX = (gBox.bottom.x - ((1-fLeft) * tmpPix));
        cSet.cW = -cSet.cW;
    }

    ctx.beginPath();
    ctx.fillStyle = cSet.fill.color;
    ctx.globalAlpha = cSet.fill.gAlpha;

    // shade offset and reverse flag of rectangle width
    ctx.fillRect(cSet.cX , cSet.cY, cSet.cW, cSet.cH );
    //};
    ctx.globalAlpha = 1.0;
    // Stroke it (Do the Drawing)
    ctx.stroke();
    // ctx.strokeStyle = "black"; //"#F5F5F5";
    //End draw convex set window

    // console.info(`ctx.fillRect(${cSet.cX}, ${cSet.mPad.bottom}, ${cSet.cW}, ${cSet.cH + cSet.mPad.top})`);
    return cSet
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
    //console.info(`manualInput+=${manualInput}`);

    /* add the current preset 
        selection to the Rc list */
    plotSelection += lstPreset.addPresets.csvRc;
    //console.info(`lstPreset.addPresets.csvRc=${lstPreset.addPresets.csvRc}`)

    /* add the current set selection to the Rc list. */
    plotSelection += lstSet.addSets.csvRc;
    //console.info(`lstSet.addPresets.csvRc=${lstSet.addSets.csvRc}`)

    /* shade the convex set area */
    lstRc = eval("[" + plotSelection + "]");

    // Plot markers
    ctx = document.getElementById("vrCanvasPlotRc").getContext("2d");
    // Set orientation of the x-axis
    const reverseAxis = gBox.reverseX ? -1 : 1;
    //translate(x,y) based on axis orientation
    /*
    if (reverseAxis == -1) {
        ctx.translate(gBox.bottom.x, gBox.bottom.y);
    } else {
        ctx.translate(gBox.top.x, gBox.bottom.y);
    };
    */
    let cSet = initConvexSet(gBox);
    const markerLength = (-1) * ((gBox.bottom.y + cSet.mPad.bottom) - (gBox.top.y + cSet.mPad.top));
    const markerYoffset = cSet.mPad.bottom;
    // console.info(plotSelection);
    // console.info(lstRc);

    // Start loop over Rc list to draw mappings
    for (let x in lstRc) {

        /*  Call The Algorithm with current 
            Royal cubit value -AND- the calibration
            for the current graph */
        curf = f(lstRc[x], gBox.graphCalib, gBox.rYears);

        RcX = curf.RelX * gBox.rPix * reverseAxis;
        //console.info(`RcX = ${curf.RelX} * ${gBox.rPix} * ${reverseAxis} = ${RcX}`);

        // Define a new Path:
        ctx.beginPath();

        ctx.setLineDash([4, 2]);
        ctx.moveTo(RcX, markerYoffset);
        ctx.lineTo(RcX, markerLength);
        //======================
        // Stroke it (Do the Drawing)
        ctx.stroke();

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
var set = 1;
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

