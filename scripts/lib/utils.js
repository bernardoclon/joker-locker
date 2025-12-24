export function getRGBfromCSSColor(color) {
    const temp = document.createElement("div");
    temp.style.color = color;
    document.body.appendChild(temp);
    const computedColor = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);

    const matchRGB = computedColor.match(/\d+/g);

    return { r: parseInt(matchRGB[0]), g: parseInt(matchRGB[1]), b: parseInt(matchRGB[2]) };
}