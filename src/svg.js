(function () {
  'use strict';

  const svg = {};
  if (typeof window !== 'undefined') {
    window.app = window.app || {};
    window.app.svg = svg;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';

  svg.createG = () => {
    const g = document.createElementNS(SVG_NS, 'g');
    return g;
  };

  svg.createLine = (blockSize, param) => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * param.x1);
    line.setAttribute('y1', blockSize * param.y1);
    line.setAttribute('x2', blockSize * param.x2);
    line.setAttribute('y2', blockSize * param.y2);
    line.setAttribute('stroke-width', `${blockSize / 50}`);
    line.setAttribute('stroke', param.stroke);
    return line;
  };

  svg.createCircle = (blockSize, param) => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', blockSize * param.cx);
    circle.setAttribute('cy', blockSize * param.cy);
    circle.setAttribute('r', blockSize * param.r);
    circle.setAttribute('fill', param.fill);
    return circle;
  };

  svg.createRect = (blockSize, param) => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', blockSize * param.x);
    rect.setAttribute('y', blockSize * param.y);
    rect.setAttribute('width', blockSize * param.width);
    rect.setAttribute('height', blockSize * param.height);
    rect.setAttribute('fill', param.fill);
    return rect;
  };

  svg.createPolygon = (blockSize, param) => {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    let points = '';
    for (const point of param.points) {
      if (points !== '') points += ' ';
      points += `${blockSize * point[0]},${blockSize * point[1]}`;
    }
    polygon.setAttribute('points', points);
    polygon.setAttribute('fill', param.fill);
    return polygon;
  };

  svg.createCrown = (blockSize, param) => {
    const g = svg.createG();
    const polygon = svg.createPolygon(blockSize, {
      points: [
        [param.x + 0.1, param.y + 0.3],
        [param.x + 0.33, param.y + 0.5],
        [param.x + 0.5, param.y + 0.15],
        [param.x + 0.67, param.y + 0.5],
        [param.x + 0.9, param.y + 0.3],
        [param.x + 0.8, param.y + 0.7],
        [param.x + 0.2, param.y + 0.7],
      ],
      fill: param.fill,
    });
    const rect = svg.createRect(blockSize, {
      x: param.x + 0.2,
      y: param.y + 0.75,
      width: 0.6,
      height: 0.15,
      fill: param.fill,
    });
    g.appendChild(polygon);
    g.appendChild(svg.createCircle(blockSize, {cx: param.x + 0.1, cy: param.y + 0.3, r: 0.05, fill: param.fill}));
    g.appendChild(svg.createCircle(blockSize, {cx: param.x + 0.5, cy: param.y + 0.15, r: 0.05, fill: param.fill}));
    g.appendChild(svg.createCircle(blockSize, {cx: param.x + 0.9, cy: param.y + 0.3, r: 0.05, fill: param.fill}));
    g.appendChild(rect);
    return g;
  };

  svg.createText = (blockSize, param) => {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', blockSize * param.x);
    text.setAttribute('y', blockSize * (param.y + 0.55));
    text.textContent = param.text;
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', param.fill);
    return text;
  };

  Object.freeze(svg);
})();
