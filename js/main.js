'use strict';
const version = 'Version: 2022.04.11';

const debug = false;
window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';

let prev = {x: -1, y: -1};
let drawingState;
let drawingFlag = false;
let width = 6;
let height = 6;

const stateNone = 0;
const stateA = 1;
const stateB = 2;

const kWall = -1;

const colors = {};
colors[kWall] = {fill: '#333', stroke: 'black'};
for (let i = 1; i < 9; i++) {
  colors[i] = {fill: 'pink', stroke: 'red'};
}

const colorNone = 'white';
const colorA = 'pink';
const colorB = 'aqua';

const colorNormalMode = 'white';
const colorSizeMode = '#ffffaa';

const colorLine = '#333';

const colorNormal = 'red';
const colorSelected = 'darkviolet';
const colorCenterB = 'blue';

const sizeNormal = 3;
const sizeSelected = 6;
const sizeCenterB = 6;

const blockSize = 28;

const dys = [-1, 0, 1, 0];
const dxs = [0, 1, 0, -1];
const dys2 = [-1, 1, 1, -1];
const dxs2 = [1, 1, -1, -1];

let states = [];

let elemSizeInfo;
let elemWidth;
let elemHeight;
let elemSizeModeButton;
let elemSvg;
let elemUrlInfo;
let elemModeNameInfo;
let elemModeInfo;

function analyzeUrl() {
  const res = {
    width: width, 
    height: height,
    blockStr: '',
  };
  const queryStrs = location.href.split('?')[1];
  if (queryStrs == null) return res;
  for (const queryStr of queryStrs.split('&')) {
    const paramArray = queryStr.split('=');
    if (paramArray.length != 2) continue;
    const paramName = paramArray[0];
    const paramVal = paramArray[1];
    switch (paramName) {
    case 'w':
      res.width = Number(paramVal);
      break;
    case 'h':
      res.height = Number(paramVal);
      break;
    case 's':
      res.blockStr = paramVal;
      break;
    }
  }
  return res;
}

function getUrlInfo() {
  return location.href.split('?')[0] + `?w=${width}&h=${height}&s=${getBlockStr()}`;
}

function updateUrlInfo() {
  const url = getUrlInfo();
  elemUrlInfo.innerHTML = `↓現在の盤面のURL↓<br><a href="${url}">${url}</a>`;
}

function getBlockStr() {
  let res = '';
  for (let y = 0; y < height; ++y) {
    let line = '';
    for (let x = 0; x < width; ++x) {
      line += states[y][x];
    }
    res += line.replace(/0+$/, '');
    res += '-';
  }
  return res.replace(/-+$/, '');
}

function applyBlockStr(e, str) {
  // 初期化
  for (let y = 0; y < height; ++y) {
    states[y] = [];
    for (let x = 0; x < width; ++x) {
      states[y][x] = stateNone;
    }
  }
  // 枠
  {
    for (let y = 1; y < height - 1; ++y) {
      states[y][1] = kWall;
      states[y][width - 2] = kWall;
    }
    for (let x = 2; x < width - 2; ++x) {
      states[1][x] = kWall;
      states[height - 2][x] = kWall;
    }
  }
  let y = 2;
  let x = 2;
  for (const c of str) {
    if (c == '-') {
      y++;
      if (y == height - 2) break;
      x = 2;
    } else {
      states[y][x] = c;
      x++;
    }
  }
  update(e);
}

function setSize(w, h) {
  width = w + 4;
  height = h + 4;
  elemSvg.setAttribute('width', blockSize * width);
  elemSvg.setAttribute('height', blockSize * height);
  elemWidth.value = w;
  elemHeight.value = h;
}

function changeSize(e) {
  const blockStr = getBlockStr();
  const w = Number(elemWidth.value);
  const h = Number(elemHeight.value);
  setSize(w, h);
  applyBlockStr(e, blockStr);
}

function init(e) {
  document.getElementById('versionInfo').innerText = version;

  elemSizeInfo = document.getElementById('sizeInfo');
  elemWidth = document.getElementById('widthVal');
  elemHeight = document.getElementById('heightVal');

  elemSvg = document.getElementById('svgBoard');
  elemUrlInfo = document.getElementById('urlInfo');

  elemModeNameInfo = document.getElementById('modeNameInfo');
  elemModeInfo = document.getElementById('modeInfo');

  const res = analyzeUrl();
  setSize(res.width, res.height);
  applyBlockStr(e, res.blockStr);

  {
    if (window.ontouchstart === undefined) {
      elemSvg.addEventListener('mousedown', pointerdown, false);
    } else {
      elemSvg.addEventListener('touchstart', pointerdown, false);
    }
    if (window.ontouchmove === undefined) {
      elemSvg.addEventListener('mousemove', pointermove, false);
    } else {
      elemSvg.addEventListener('touchmove', pointermove, false);
    }
    if (window.ontouchend === undefined) {
      elemSvg.addEventListener('mouseup', pointerup, false);
      document.addEventListener('mouseup', pointerup, false);
    } else {
      elemSvg.addEventListener('touchend', pointerup, false);
      document.addEventListener('touchend', pointerup, false);
    }

    elemWidth.addEventListener('change', changeSize, false);
    elemHeight.addEventListener('change', changeSize, false);
  }
}

function getCursorPos(elem, e) {
  const bcRect = elem.getBoundingClientRect();
  let cursorX;
  let cursorY;
  if (e.touches !== undefined) {
    cursorX = e.touches[0].clientX - bcRect.left;
    cursorY = e.touches[0].clientY - bcRect.top;
  } else {
    cursorX = e.clientX - bcRect.left;
    cursorY = e.clientY - bcRect.top;
  }
  return {x: cursorX, y: cursorY};
}

function createLine(param) {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', blockSize * param.x1);
  line.setAttribute('y1', blockSize * param.y1);
  line.setAttribute('x2', blockSize * param.x2);
  line.setAttribute('y2', blockSize * param.y2);
  return line;
}

function createCircle(param) {
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', blockSize * param.cx);
  circle.setAttribute('cy', blockSize * param.cy);
  circle.setAttribute('r', param.r);
  return circle;
}

function createRect(param) {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', blockSize * param.x);
  rect.setAttribute('y', blockSize * param.y);
  rect.setAttribute('width', blockSize * param.width);
  rect.setAttribute('height', blockSize * param.height);
  return rect;
}

function createText(param) {
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', blockSize * param.x);
  text.setAttribute('y', blockSize * param.y);
  text.setAttribute('font-size', `${Math.floor(blockSize * 0.4)}px`);
  text.textContent = param.text;
  return text;
}

function drawFrame(g) {
  // 横線
  for (let y = 0; y <= height; ++y) {
    const line = createLine({x1: 0, y1: y, x2: width, y2: y});
    line.setAttribute('stroke', colorLine);
    line.setAttribute('stroke-dasharray', '1, 3');
    g.appendChild(line);
  }
  // 縦線
  for (let x = 0; x <= width; ++x) {
    const line = createLine({x1: x, y1: 0, x2: x, y2: height});
    line.setAttribute('stroke', colorLine);
    line.setAttribute('stroke-dasharray', '1, 3');
    g.appendChild(line);
  }
  // 外枠
  {
    const rect = createRect({x: 0, y: 0, width: width, height: height});
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', colorLine);
    g.appendChild(rect);
  }
}

function draw(e) {
  while (elemSvg.firstChild) {
    elemSvg.removeChild(elemSvg.firstChild);
  }
  const g = document.createElementNS(SVG_NS, 'g');

  // 図形の描画
  {
    // 背景
    {
      const rect = createRect({x: 0, y: 0, width: width, height: height});
      rect.setAttribute('fill', colorNone);
      rect.setAttribute('stroke', 'none');
      g.appendChild(rect);
    }

    // 図形
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const state = states[y][x];
        if (state == 0) continue;

        const color = colors[state];
        {
          const rect = createRect({x: x, y: y, width: 1, height: 1});
          rect.setAttribute('fill', color.fill);
          rect.setAttribute('stroke', 'none');
          g.appendChild(rect);
        }
        let flag1 = true;
        let flag2 = true;
        let flag3 = true;
        let flag4 = true;
        if (y == 0 || states[y - 1][x] != state) {
          flag1 = false;
          const line = createLine({x1: x, y1: y + 0.08, x2: x + 1, y2: y + 0.08});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', 0.16 * blockSize);
          g.appendChild(line);
        }
        // 右側
        if (x == width - 1 || states[y][x + 1] != state) {
          flag2 = false;
          const line = createLine({x1: x + 1 - 0.08, y1: y, x2: x + 1 - 0.08, y2: y + 1});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', 0.16 * blockSize);
          g.appendChild(line);
        }
        // 下側
        if (y == height - 1 || states[y + 1][x] != state) {
          flag3 = false;
          const line = createLine({x1: x, y1: y + 1 - 0.08, x2: x + 1, y2: y + 1 - 0.08});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', 0.16 * blockSize);
          g.appendChild(line);
        }
        // 左側
        if (x == 0 || states[y][x - 1] != state) {
          flag4 = false;
          const line = createLine({x1: x + 0.08, y1: y, x2: x + 0.08, y2: y + 1});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', 0.16 * blockSize);
          g.appendChild(line);
        }
        // 右上
        if (flag1 && flag2 && states[y - 1][x + 1] != state) {
          const rect = createRect({x: x + 1 - 0.16, y: y, width: 0.16, height: 0.16});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
        // 右下
        if (flag2 && flag3 && states[y + 1][x + 1] != state) {
          const rect = createRect({x: x + 1 - 0.16, y: y + 1 - 0.16, width: 0.16, height: 0.16});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
        // 左上
        if (flag3 && flag4 && states[y + 1][x - 1] != state) {
          const rect = createRect({x: x, y: y + 1 - 0.16, width: 0.16, height: 0.16});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
        // 左下
        if (flag4 && flag1 && states[y - 1][x - 1] != state) {
          const rect = createRect({x: x, y: y, width: 0.16, height: 0.16});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
      }
    }
  }

  drawFrame(g);

  // 上側
  {
    const rect = createRect({x: 0, y: 0, width: width, height: 1.5});
    rect.setAttribute('fill', '#aaa');
    rect.setAttribute('stroke', 'none');
    g.appendChild(rect);
  }
  // 右側
  {
    const rect = createRect({x: width - 1.5, y: 0, width: width, height: height});
    rect.setAttribute('fill', '#aaa');
    rect.setAttribute('stroke', 'none');
    g.appendChild(rect);
  }
  // 下側
  {
    const rect = createRect({x: 0, y: height - 1.5, width: width, height: height});
    rect.setAttribute('fill', '#aaa');
    rect.setAttribute('stroke', 'none');
    g.appendChild(rect);
  }
  // 左側
  {
    const rect = createRect({x: 0, y: 0, width: 1.5, height: height});
    rect.setAttribute('fill', '#aaa');
    rect.setAttribute('stroke', 'none');
    g.appendChild(rect);
  }

  elemSvg.appendChild(g);
}

function clamp(val, min, max) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

// カーソル位置の座標を得る
function getCurXY(e) {
  const cursorPos = getCursorPos(elemSvg, e);
  const x = clamp(Math.floor(cursorPos.x / blockSize), 0, width - 1);
  const y = clamp(Math.floor(cursorPos.y / blockSize), 0, height - 1);
  return {x: x, y: y};
}

function pointerup() {
  if (debug) window.console.log('pointerup');

  drawingFlag = false;
}

// タッチ環境において、画面端付近か否か。
function isTouchScreenNearEdge(e) {
  if (e.touches === undefined) return false;
  const x = e.touches[0].clientX;
  return x < 30; // 画面の左端付近ならtrue
}

function pointerdown(e) {
  if (debug) window.console.log('pointerdown');

  const touches = e.changedTouches;
  if (touches !== undefined && touches.length > 1) {
    return;
  }
  if (isTouchScreenNearEdge(e)) {
    draw(e);
    return;
  }

  e.preventDefault();

  const cur = getCurXY(e);

  const targetState = stateA;
  drawingState = states[cur.y][cur.x] == targetState ? stateNone : targetState;
  drawingFlag = true;

  prev = {x: -1, y: -1};
  pointermove(e);
}

function pointermove(e) {
  if (debug) window.console.log('pointermove');

  if (!drawingFlag) {
    draw(e);
    return;
  }

  const cur = getCurXY(e);
  e.preventDefault();

  if (cur.x == prev.x && cur.y == prev.y) return;
  prev.x = cur.x;
  prev.y = cur.y;
  states[cur.y][cur.x] = drawingState;

  update(e);
}

function isAorB(x) {
  return x != stateNone;
}

function isA(x) {
  return x == stateA;
}

function isB(x) {
  return x == stateB;
}

// 図形が点対称か否か。
function isPointSymmetry(isX) {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      if (isX(states[y][x])) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  for (let y = minY; y <= maxY; ++y) {
    for (let x = minX; x <= maxX; ++x) {
      if (isX(states[y][x]) && !isX(states[minY + maxY - y][minX + maxX - x])) {
        return false;
      }
    }
  }
  return true;
}

// 図形が連結か否か。
function isConnected(isX) {
  const statesTemp = new Array(height);
  for (let y = 0; y < height; ++y) {
    statesTemp[y] = states[y].slice();
  }
  let x0;
  let y0;
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      if (isX(statesTemp[y][x])) {
        x0 = x;
        y0 = y;
        break;
      }
    }
  }

  const st = new Stack();
  st.push([x0, y0]);
  statesTemp[y0][x0] = stateNone;
  while (!st.empty()) {
    const xy = st.pop();
    for (let i = 0; i < 4; i++) {
      const xx = xy[0] + dxs[i];
      const yy = xy[1] + dys[i];
      if (xx == -1) continue;
      if (yy == -1) continue;
      if (xx == width) continue;
      if (yy == height) continue;
      if (isX(statesTemp[yy][xx])) {
        statesTemp[yy][xx] = stateNone;
        st.push([xx, yy]);
      }
    }
  }

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      if (isX(statesTemp[y][x])) return false;
    }
  }
  return true;
}

function getCenter(isX) {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      if (isX(states[y][x])) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {x: minX + maxX + 1, y: minY + maxY + 1};
}

function count(isX) {
  let cnt = 0;
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      if (isX(states[y][x])) cnt++;
    }
  }
  return cnt;
}

function update(e) {
  if (debug) window.console.log('update');

  draw(e);
  return;
}

// {{{ Stack
function Stack() {
  this.data = [];
}
Stack.prototype.push = function(val) {
  this.data.push(val);
  return val;
};
Stack.prototype.pop = function() {
  return this.data.pop();
};
Stack.prototype.top = function() {
  return this.data[this.data.length - 1];
};
Stack.prototype.size = function() {
  return this.data.length;
};
Stack.prototype.empty = function() {
  return this.data.length == 0;
};
// }}}
