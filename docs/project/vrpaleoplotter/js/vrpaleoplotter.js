
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



// Initialize global arrays
//console.info('init Arrays over here');
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
var graph = Array.from(['https://drive.google.com/uc?id=11FcRDMQ1UXYX6g6N9z18GTSiSMvkhDMh', 'https://drive.google.com/uc?id=171Me953e5MFlMZvAltIkyKI0HiPk1NA_','https://drive.google.com/uc?id=1J6a0GsHypYRLuxSXikfWIekiguPQaZM3']);

var coord = [
    [
        [78, 85],
        [583, 310]
    ],
    [
        [103, 15],
        [393, 420]
    ],
    [
        [73, 73],
        [902, 1428]
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

document.addEventListener('DOMContentLoaded', (event) => {

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
        // Save the pristene picture 
        gBox.saveImg = canvas.toDataURL();

        // Draw graph
        ctx.drawImage(img, 0, 0);
        // Actions 
        // event listeners
        setEventListener();
        presetEventListener();
        // Call expandSeedSet()
        expandSeedSet();
        // Call plotMarker()
        plotMarker();
    };
    var rect = canvas.getBoundingClientRect();
    img.src = gBox.gURI;  
}); // end document.addEventListener('DOMContentLoaded', (event))
