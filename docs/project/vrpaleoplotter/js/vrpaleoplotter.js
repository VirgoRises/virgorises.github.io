
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
gBox.top.x = coord[set][0][0];
gBox.top.y = coord[set][0][1];
gBox.bottom.x = coord[set][1][0];
gBox.bottom.y = coord[set][1][1];

// initialize convex set
cSet = initConvexSet(gBox);


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
     * @abstract junk off screen - (so) answered Jul, 2022 user imvain2
     * 
     */
    menuBar.addEventListener("click", function(e) {
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
