(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const svg = {};

  const SVG_NS = 'http://www.w3.org/2000/svg';

  svg.createSvg = () => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    return svg;
  };

  svg.createG = (className = null) => {
    const g = document.createElementNS(SVG_NS, 'g');
    if (className !== null) {
      g.classList.add(className);
    }
    return g;
  };

  svg.createPath = ({ d, fill }) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    if (fill) path.setAttribute('fill', fill);
    return path;
  };

  svg.createLine = (blockSize, { x1, y1, x2, y2, stroke, strokeWidth, strokeOpacity }) => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * x1);
    line.setAttribute('y1', blockSize * y1);
    line.setAttribute('x2', blockSize * x2);
    line.setAttribute('y2', blockSize * y2);
    line.setAttribute('stroke-width', `${blockSize / 50}`);
    if (stroke) line.setAttribute('stroke', stroke);
    if (strokeWidth) line.setAttribute('stroke-width', blockSize * strokeWidth);
    if (strokeOpacity !== undefined) line.setAttribute('stroke-opacity', strokeOpacity);
    return line;
  };

  svg.createCircle = (blockSize, { cx, cy, r, fill, stroke, strokeWidth }) => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', blockSize * cx);
    circle.setAttribute('cy', blockSize * cy);
    circle.setAttribute('r', blockSize * r);
    if (fill) circle.setAttribute('fill', fill);
    if (stroke) circle.setAttribute('stroke', stroke);
    if (strokeWidth) circle.setAttribute('stroke-width', blockSize * strokeWidth);
    return circle;
  };

  svg.createEllipse = (blockSize, { cx, cy, rx, ry, fill, stroke, strokeWidth, strokeOpacity }) => {
    const ellipse = document.createElementNS(SVG_NS, 'ellipse');
    ellipse.setAttribute('cx', blockSize * cx);
    ellipse.setAttribute('cy', blockSize * cy);
    ellipse.setAttribute('rx', blockSize * rx);
    ellipse.setAttribute('ry', blockSize * ry);
    if (fill) ellipse.setAttribute('fill', fill);
    if (stroke) ellipse.setAttribute('stroke', stroke);
    if (strokeWidth) ellipse.setAttribute('stroke-width', blockSize * strokeWidth);
    if (strokeOpacity !== undefined) ellipse.setAttribute('stroke-opacity', strokeOpacity);
    return ellipse;
  };

  svg.createRect = (blockSize, { x, y, width, height, fill, stroke, strokeWidth }) => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', blockSize * x);
    rect.setAttribute('y', blockSize * y);
    rect.setAttribute('width', blockSize * width);
    rect.setAttribute('height', blockSize * height);
    if (fill) rect.setAttribute('fill', fill);
    if (stroke) rect.setAttribute('stroke', stroke);
    if (strokeWidth) rect.setAttribute('stroke-width', blockSize * strokeWidth);
    return rect;
  };

  svg.createPolygon = (blockSize, { points, fill, stroke, strokeWidth, strokeOpacity }) => {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    let pointsStr = '';
    for (const point of points) {
      if (pointsStr !== '') pointsStr += ' ';
      pointsStr += `${blockSize * point[0]},${blockSize * point[1]}`;
    }
    polygon.setAttribute('points', pointsStr);
    if (fill) polygon.setAttribute('fill', fill);
    if (stroke) polygon.setAttribute('stroke', stroke);
    if (strokeWidth) polygon.setAttribute('stroke-width', blockSize * strokeWidth);
    if (strokeOpacity !== undefined) polygon.setAttribute('stroke-opacity', strokeOpacity);
    return polygon;
  };

  svg.createCrown = (blockSize, { x, y, fill, stroke, strokeWidth }) => {
    const g = svg.createG();

    // 100 × 100 の座標で、先端の丸と本体をひと続きの輪郭として描きます。
    const crown = svg.createPath({
      d: [
        'M 20 70 L 11.70 36.79 A 7 7 0 1 1 15.28 34.59',
        'L 33 50 L 46.94 21.30 A 7 7 0 1 1 53.06 21.30',
        'L 67 50 L 84.72 34.59 A 7 7 0 1 1 88.30 36.79 L 80 70 Z',
        'M 20 75 H 80 V 90 H 20 Z',
      ].join(' '),
      fill,
    });
    crown.setAttribute('transform', `translate(${x * blockSize},${y * blockSize}) scale(${blockSize / 100})`);
    if (stroke) crown.setAttribute('stroke', stroke);
    if (strokeWidth) crown.setAttribute('stroke-width', strokeWidth * 100);
    g.appendChild(crown);
    return g;
  };

  svg.createStar = (blockSize, { x, y, fill, stroke, strokeWidth = 0.05 }) => {
    const g = svg.createG();

    const polygon = svg.createPolygon(blockSize, {
      points: [
        [x + 0.5, y + 0.05],
        [x + 0.61, y + 0.38],
        [x + 0.95, y + 0.38],
        [x + 0.67, y + 0.58],
        [x + 0.78, y + 0.91],
        [x + 0.5, y + 0.72],
        [x + 0.22, y + 0.91],
        [x + 0.33, y + 0.58],
        [x + 0.05, y + 0.38],
        [x + 0.39, y + 0.38],
      ],
      fill,
      stroke,
      strokeWidth,
    });
    polygon.setAttribute('stroke-linejoin', 'round');

    g.appendChild(polygon);

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

  window.app = window.app || {};
  window.app.svg = svg;
})();
