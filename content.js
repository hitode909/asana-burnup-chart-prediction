// http://paulbourke.net/geometry/pointlineplane/javascript.txt
// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  let denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  // Return a object with the x and y coordinates of the intersection
  let x = x1 + ua * (x2 - x1);
  let y = y1 + ua * (y2 - y1);

  return { x, y };
}

// based on https://qiita.com/quzq/items/c1a4929f47d986b0f77f, https://www.w3schools.com/ai/ai_regressions.asp
const linearReg = (coordinates) => {
  const n = coordinates.length;
  const sigX = coordinates.reduce((acc, c) => acc + c[0], 0.0);
  const sigY = coordinates.reduce((acc, c) => acc + c[1], 0.0);
  const sigXX = coordinates.reduce((acc, c) => acc + c[0] * c[0], 0.0);
  const sigXY = coordinates.reduce((acc, c) => acc + c[0] * c[1], 0.0);
  const slope = (n * sigXY - sigX * sigY) / (n * sigXX - Math.pow(sigX, 2));
  const intercept =
    (sigXX * sigY - sigXY * sigX) / (n * sigXX - Math.pow(sigX, 2));
  return { slope, intercept };
};

let overlayElementsPool = [];

const predict = () => {
  for (const path of overlayElementsPool) path.remove();
  overlayElementsPool = [];

  const charts = [...document.querySelectorAll(".BurnupChart")];
  const renderChart = (chart) => {
    const lines = [
      ...chart.querySelectorAll(".highcharts-series .highcharts-tracker-line"),
    ];
    const linePoints = [];
    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("stroke", "gray");
      path.setAttribute("stroke-width", "1");
      path.setAttribute("fill", "none");
      const points = line
        .getAttribute("d")
        .match(/([\d\.]+) ([\d\.]+)/g)
        .map((pair) => pair.split(" ").map((i) => +i));
      // drop while there are no points
      while (points.length > 1 && points[0][1] === points[1][1]) {
        points.shift();
      }
      if (lineNumber === 1) {
        // total line
        const lastPoint = points[points.length - 1];
        path.setAttribute(
          "d",
          `M 0 ${lastPoint[1]} L  ${screen.width} ${lastPoint[1]}`
        );
        linePoints.push([0, lastPoint[1], screen.width, lastPoint[1]]);
      } else {
        // done line
        const reg = linearReg(points);
        path.setAttribute(
          "d",
          `M 0 ${reg.intercept} L  ${screen.width} ${
            reg.intercept + reg.slope * screen.width
          }`
        );
        linePoints.push([
          0,
          reg.intercept,
          screen.width,
          reg.intercept + reg.slope * screen.width,
        ]);
      }
      line.parentElement.appendChild(path);
      overlayElementsPool.push(path);
    }
    if (linePoints.length === 2) {
      const intersectPoint = intersect(...linePoints[0], ...linePoints[1]);
      console.log(intersectPoint);
      if (!intersectPoint) return;
      const svgElement = chart.querySelector("svg.highcharts-root");
      const OFFSET = +svgElement.getAttribute("width") * 0.2;
      svgElement.setAttribute(
        "viewBox",
        `0 ${Math.min(intersectPoint.y, 0)} ${intersectPoint.x + OFFSET} ${
          svgElement.getAttribute("height") - Math.min(intersectPoint.y, 0)
        }`
      );

      const goalPoint = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      goalPoint.setAttribute("cx", intersectPoint.x);
      goalPoint.setAttribute("cy", intersectPoint.y);
      goalPoint.setAttribute("r", 5);
      goalPoint.setAttribute("fill", "red");
      chart
        .querySelector(".highcharts-series .highcharts-tracker-line")
        .parentElement.appendChild(goalPoint);
      overlayElementsPool.push(goalPoint);
    }
  };

  for (const chart of charts) renderChart(chart);
};
predict();
window.addEventListener("resize", () => {
  setTimeout(predict, 100);
});
// XXX!!!
setInterval(predict, 1000);
