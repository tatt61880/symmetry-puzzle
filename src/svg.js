(function() {
  'use strict';
  window.showkoban = window.showkoban || {};
  window.showkoban.svg = {};

  const SVG_NS = 'http://www.w3.org/2000/svg';

  window.showkoban.svg.createG = () => {
    const g = document.createElementNS(SVG_NS, 'g');
    return g;
  };

  window.showkoban.svg.createLine = (blockSize, param) => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * param.x1);
    line.setAttribute('y1', blockSize * param.y1);
    line.setAttribute('x2', blockSize * param.x2);
    line.setAttribute('y2', blockSize * param.y2);
    return line;
  };

  window.showkoban.svg.createRect = (blockSize, param) => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', blockSize * param.x);
    rect.setAttribute('y', blockSize * param.y);
    rect.setAttribute('width', blockSize * param.width);
    rect.setAttribute('height', blockSize * param.height);
    return rect;
  };

  window.showkoban.svg.createPolygon = (blockSize, param) => {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    let points = '';
    for (const point of param.points) {
      if (points !== '') points += ' ';
      points += `${blockSize * point[0]},${blockSize * point[1]}`;
    }
    polygon.setAttribute('points', points);
    return polygon;
  };

  window.showkoban.svg.createText = (blockSize, param) => {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', blockSize * param.x);
    text.setAttribute('y', blockSize * (param.y + 0.55));
    text.textContent = param.text;
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('text-anchor', 'middle');
    return text;
  };

  Object.freeze(window.showkoban.svg);
})();
