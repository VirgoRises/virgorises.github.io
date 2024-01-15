
// Initialize global arrays
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
//var graph = Array.from(['https://drive.google.com/uc?id=11FcRDMQ1UXYX6g6N9z18GTSiSMvkhDMh', 'https://drive.google.com/uc?id=171Me953e5MFlMZvAltIkyKI0HiPk1NA_','https://drive.google.com/uc?id=1J6a0GsHypYRLuxSXikfWIekiguPQaZM3']);
var graph = Array.from(['media\\Alley, R.B.. 2004. GISP2 Ice Core Temperature .png', 'media\\Years-before-present-Younger-Dryasplushydro.png', 'media\\Comparison-of-climate-records-The-intervals-of-Heinrich-event-2-H2-the-Last-Glacial.png']);


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
    ]
];

//==============
var set = 0;
//===============

gBox.gURI = graph[set];

gBox.top.x = coord[set][0][0];
gBox.top.y = coord[set][0][1];
gBox.bottom.x = coord[set][1][0];
gBox.bottom.y = coord[set][1][1];
gBox.graphCalib = coord[set][2][0];
gBox.rYears = coord[set][2][1];
gBox.reverseX = coord[set][3][0];


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

    let menuBar = document.querySelector("#top-menu-bar");
    /**
     * 
     * @abstract Handle menu bar
     * 
     */
    menuBar.addEventListener("click", function (e) {
        e.preventDefault();
        let nav = e.target;
        let targetPage = nav.getAttribute("href");
        if (targetPage) {
            let visible = document.querySelector(".page.active");
            if (visible) {
                visible.classList.remove("active");
            }
            let target = document.querySelector(targetPage);
            target.classList.toggle("active");
        }
    });

}); // end document.addEventListener('DOMContentLoaded', (event))
