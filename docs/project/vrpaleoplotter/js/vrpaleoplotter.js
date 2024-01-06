
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


// TEST GRAPHS [0,1,2]
/**
 *   [0]  GISP2, reverse axis, range 0-20000ka, 1950
 */ 

/** 
 *      [1] GISP2, Cariaco, Dome C, fresh water flux 
 *          reverse axis, range 0-20000ka, 1950
 * / 
      
/** 
 * TODO [2] b) Soreq Cave, c) GISP2, d) EM TEX, e) Red Sea, 
 *          f) Alboran Sea, g) EM proportion Sahara dust 
 *          axis left to right, range 0-28 000ka 1950
 */

var graph = Array.from(
    ['https://drive.google.com/uc?id=11FcRDMQ1UXYX6g6N9z18GTSiSMvkhDMh', 
    'https://drive.google.com/uc?id=171Me953e5MFlMZvAltIkyKI0HiPk1NA_',
    'https://drive.google.com/uc?id=1J6a0GsHypYRLuxSXikfWIekiguPQaZM3']
    );

var coord = [                      
    [               // [0]
        [78, 85],
        [583, 310]
    ],
    [               // [1] 
        [103, 15],   
        [393, 420]
    ],
    [               // TODO: [2] Normal axis, range 28000
        [73, 73],    
        [902, 1428]  
    ]
];

//===============
var set = 2;
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
