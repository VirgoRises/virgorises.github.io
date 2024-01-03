
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
 * @abstract Indicate convex set by shading. The convex set. All function values map Royal cubits line segments to presessional degree circle segments. The algorithm's domain is (all) the rational numbers, given in Royal cubits. The output range, f(Rc) ∈ ℝ, is given in Gon (decimal degrees), but are treated as if x°(360 degrees). 'Gon' is a correct assumption because the range consists of a 200 gon semi circle. It is obvious that the gon is treated as if a value in x° because, without further conversion, those gon are multiplied by 72 presessional years. The presessional model, of course, is based on the 12 sign 360 dgr(°), minute('), second ('') system.
 * TODO: Plotting rebuild (working)
 * TODO: Goobledigook to math jargon. 
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
        //console.info(`chunck <- ${chunck} = ${curf.RelX} * (${gBox.bottom.x} - ${gBox.top.x})`);
        markX = gBox.bottom.x - chunck;
        //console.info("markX = " + markX);

        ctx.setLineDash([4, 2]);
        ctx.moveTo(markX, gBox.bottom.y + cSet.mPad.bottom);
        ctx.lineTo(markX, gBox.top.y + cSet.mPad.top);
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
img.onload = function () {

    // Draw graph
    ctx.drawImage(img, 0, 0);
    // Actions 
    setEventListeners();
    // Fetch google sheet data
    // fetches all tables
    // getSheetData(); // All in init Arrays now
    // Call expandSeedSet()
    expandSeedSet();
    // Call plotMarker()
    plotMarker();
};

var rect = canvas.getBoundingClientRect();
img.src = gBox.gURI; //strDataURI;

