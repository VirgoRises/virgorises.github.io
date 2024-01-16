
// Initialize global arrays
var lstPreset = initArrayPresets();
var lstSet = initArraySets();
var mPlot = initArrayMplot();
var lstTables = initArrayLstTables();

var useGraph = document.querySelector('input[name="radio_graph"]:checked').value; // {0,1,2}
var gBox = initGraphBox(useGraph);

// Declare global variables
var theSet = '',
    binaryLabels = '',
    numVars = '',
    numberXhaustive = '';


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
