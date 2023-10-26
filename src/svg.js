(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const svg = {};

  const SVG_NS = 'http://www.w3.org/2000/svg';

  svg.createSvg = () => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    return svg;
  };

  svg.createG = () => {
    const g = document.createElementNS(SVG_NS, 'g');
    return g;
  };

  svg.createLine = (blockSize, { x1, y1, x2, y2, stroke, strokeWidth }) => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * x1);
    line.setAttribute('y1', blockSize * y1);
    line.setAttribute('x2', blockSize * x2);
    line.setAttribute('y2', blockSize * y2);
    line.setAttribute('stroke-width', `${blockSize / 50}`);
    if (stroke) line.setAttribute('stroke', stroke);
    if (strokeWidth) line.setAttribute('stroke-width', blockSize * strokeWidth);
    return line;
  };

  svg.createCircle = (blockSize, { cx, cy, r, fill, stroke, strokeWidth }) => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', blockSize * cx);
    circle.setAttribute('cy', blockSize * cy);
    circle.setAttribute('r', blockSize * r);
    if (fill) circle.setAttribute('fill', fill);
    if (stroke) circle.setAttribute('stroke', stroke);
    if (strokeWidth)
      circle.setAttribute('stroke-width', blockSize * strokeWidth);
    return circle;
  };

  svg.createEllipse = (
    blockSize,
    { cx, cy, rx, ry, fill, stroke, strokeWidth }
  ) => {
    const ellipse = document.createElementNS(SVG_NS, 'ellipse');
    ellipse.setAttribute('cx', blockSize * cx);
    ellipse.setAttribute('cy', blockSize * cy);
    ellipse.setAttribute('rx', blockSize * rx);
    ellipse.setAttribute('ry', blockSize * ry);
    if (fill) ellipse.setAttribute('fill', fill);
    if (stroke) ellipse.setAttribute('stroke', stroke);
    if (strokeWidth)
      ellipse.setAttribute('stroke-width', blockSize * strokeWidth);
    return ellipse;
  };

  svg.createRect = (
    blockSize,
    { x, y, width, height, fill, stroke, strokeWidth },
    eps = 0
  ) => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', blockSize * (x - eps));
    rect.setAttribute('y', blockSize * (y - eps));
    rect.setAttribute('width', blockSize * (width + eps * 2));
    rect.setAttribute('height', blockSize * (height + eps * 2));
    if (fill) rect.setAttribute('fill', fill);
    if (stroke) rect.setAttribute('stroke', stroke);
    if (strokeWidth) rect.setAttribute('stroke-width', blockSize * strokeWidth);
    return rect;
  };

  svg.createPolygon = (blockSize, { points, fill, stroke, strokeWidth }) => {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    let pointsStr = '';
    for (const point of points) {
      if (pointsStr !== '') pointsStr += ' ';
      pointsStr += `${blockSize * point[0]},${blockSize * point[1]}`;
    }
    polygon.setAttribute('points', pointsStr);
    if (fill) polygon.setAttribute('fill', fill);
    if (stroke) polygon.setAttribute('stroke', stroke);
    if (strokeWidth)
      polygon.setAttribute('stroke-width', blockSize * strokeWidth);
    return polygon;
  };

  svg.createCrown = (blockSize, { x, y, fill, stroke }) => {
    const g = svg.createG();
    const polygon = svg.createPolygon(blockSize, {
      points: [
        [x + 0.1, y + 0.3],
        [x + 0.33, y + 0.5],
        [x + 0.5, y + 0.15],
        [x + 0.67, y + 0.5],
        [x + 0.9, y + 0.3],
        [x + 0.8, y + 0.7],
        [x + 0.2, y + 0.7],
      ],
      fill,
      stroke,
    });
    const rect = svg.createRect(blockSize, {
      x: x + 0.2,
      y: y + 0.75,
      width: 0.6,
      height: 0.15,
      fill,
      stroke,
    });
    g.appendChild(polygon);
    g.appendChild(
      svg.createCircle(blockSize, {
        cx: x + 0.1,
        cy: y + 0.3,
        r: 0.05,
        fill,
        stroke,
      })
    );
    g.appendChild(
      svg.createCircle(blockSize, {
        cx: x + 0.5,
        cy: y + 0.15,
        r: 0.05,
        fill,
        stroke,
      })
    );
    g.appendChild(
      svg.createCircle(blockSize, {
        cx: x + 0.9,
        cy: y + 0.3,
        r: 0.05,
        fill,
        stroke,
      })
    );
    g.appendChild(rect);
    return g;
  };

  svg.createText = (blockSize, { x, y, text, fill }) => {
    const textElem = document.createElementNS(SVG_NS, 'text');
    textElem.setAttribute('x', blockSize * x);
    textElem.setAttribute('y', blockSize * (y + 0.08));
    textElem.textContent = text;
    textElem.setAttribute('dominant-baseline', 'middle');
    textElem.setAttribute('text-anchor', 'middle');
    textElem.setAttribute('font-weight', 'bold');
    textElem.setAttribute('fill', fill);
    return textElem;
  };

  Object.freeze(svg);

  if (isBrowser) {
    window.app = window.app || {};
    window.app.svg = svg;
  }
})();
