/**
 * @abstract Defines the coordinates for the bounds in which the function values for f(Rc), i.e., 'the mappings', will occur.
 * TODO: rebuild. 
 * @param {*} gBox 
 * @returns cSet
 */
function initConvexSet(gBox) {
    //var fLeft = f(999999999999, 1950, 20000).RelX; // x-axis 0-->20k
    //var fRight = f(19.099999999, 1950, 20000).RelX; // x-axis 0-->20k
    var fLeft = f(999999999999, gBox.graphCalib, gBox.rYears).RelX; // x-axis 0-->20k
    var fRight = f(19.099999999, gBox.graphCalib, gBox.rYears).RelX; // x-axis 0-->20k
    var tmpPix = gBox.bottom.x - gBox.top.x;
    if (gBox.reverseX=='R2L'){
        fLeft=1-fLeft;
        fRight=1-fRight;
    }
    let cSet = {
        xPix: gBox.bottom.x - gBox.top.x,
        cX: (gBox.top.x + ((1 - fLeft) * tmpPix)), //),
        cY: gBox.top.y,
        cW: ((fLeft * tmpPix) - (fRight * tmpPix)),
        cH: (gBox.bottom.y - gBox.top.y),
        fill: {
            color: "lightblue",
            gAlpha: 0.15
        },
        mPad: {
            top: 5,
            bottom: -5
        }, // draw mapping lines in/outside bounds 
        img: "" // image for redrawing
    };

    // If the x-axis is reversed;
        if (gBox.reverseX=='R2L') {
        gBox.top.x - (fLeft * gBox.rPix);
        cSet.cX = (gBox.bottom.x - ((1 - fLeft) * tmpPix));
        cSet.cW = -cSet.cW;
    }

    return cSet
    // console.info(`gBox.reverseX=${gBox.reverseX}`);
    //console.info(`passed: if (gBox.reverseX)=${gBox.reverseX}`);
}

