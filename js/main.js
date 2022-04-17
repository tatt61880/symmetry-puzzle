'use strict';
const version = 'Version: 2022.04.17';

const levels = [
  {width: 5, height: 5, stateStr: 's00bb-0110b-0100b--a0002'},
  {width: 5, height: 5, stateStr: 's-000bb-aa002-a110x-a1'},
  {width: 5, height: 5, stateStr: 'sb00x-0b-20d-xc11-001'},
  {width: 5, height: 5, stateStr: 's30a-20b-0000c-x011-001'},
  {width: 5, height: 5, stateStr: 's02-0040x-011-00103'},

  {width: 6, height: 6, stateStr: 'sa-00022-0002-001b-011'},
  {width: 6, height: 6, stateStr: 's-00022-0012-0011-011'},

  {width: 5, height: 6, stateStr: 'sx--01-011-1122-002'},
  {width: 6, height: 6, stateStr: 'sx0x--01000x-011-1122-x02'},

  {width: 4, height: 5, stateStr: 's-02-xx-111-003'},
  {width: 4, height: 5, stateStr: 's---111-003'},
];
let levelId = 1;

const undos = [];
let undoIdx = 0;

window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';

let width = 6;
let height = 6;
const upEnd = 2;
let rightEnd = width - 3;
let downEnd = height - 3;
const leftEnd = 2;

const keyInputMsec = 100;// キー入力間隔(ミリ秒)

const stateHero = -2; // 自機
const stateWall = -1; // 壁
const stateNone = 0;
const stateTargetMin = 1;
const stateTargetMax = 9;
const stateOtherMin = 10;
const stateOtherMax = 35;

const stateToChar = {};
const charToState = {};

stateToChar[stateHero] = 's';
stateToChar[stateWall] = 'x';
stateToChar[stateNone] = '0';
for (let i = stateTargetMin; i <= stateTargetMax; ++i) {
  stateToChar[i] = `${i}`;
}
for (let i = stateOtherMin; i <= stateOtherMax; ++i) {
  stateToChar[i] = `${String.fromCharCode(97 + i - stateOtherMin)}`;
}

for (const key in stateToChar) {
  const val = stateToChar[key];
  charToState[val] = key;
}

const colors = {};
colors[stateHero] = {fill: 'aqua', stroke: 'blue'};
colors[stateWall] = {fill: '#222', stroke: '#333'};
for (let i = stateTargetMin; i <= stateTargetMax; ++i) {
  colors[i] = {fill: 'pink', stroke: 'red'};
}
for (let i = stateOtherMin; i <= stateOtherMax; ++i) {
  colors[i] = {fill: '#ddd', stroke: '#aaa'};
}

const colorNone = 'white';
const colorLine = '#333';

const blockSize = 28;

const Dir = {
  ArrowUp: 0,
  ArrowRight: 1,
  ArrowDown: 2,
  ArrowLeft: 3
};

const dys = [-1, 0, 1, 0];
const dxs = [0, 1, 0, -1];

let states = [];

let elemLevelPrev;
let elemLevelId;
let elemLevelNext;
let elemSvg;

let keyFlag = true;
let lastTime = 0;

function analyzeUrl() {
  const res = {
    width: width, 
    height: height,
    stateStr: '',
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
      res.stateStr = paramVal;
      break;
    }
  }
  return res;
}

function getStateStr() {
  let res = '';
  for (let y = upEnd; y <= downEnd; ++y) {
    let line = '';
    for (let x = leftEnd; x <= rightEnd; ++x) {
      line += stateToChar[states[y][x]];
    }
    res += line.replace(/0+$/, '');
    res += '-';
  }
  return res;
}

function applyStateStr(stateStr) {
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
      states[y][1] = stateWall;
      states[y][width - 2] = stateWall;
    }
    for (let x = 2; x < width - 2; ++x) {
      states[1][x] = stateWall;
      states[height - 2][x] = stateWall;
    }
  }
  let y = 2;
  let x = 2;
  for (const c of stateStr) {
    if (c == '-') {
      y++;
      if (y == height - 2) break;
      x = 2;
    } else {
      if (x > width - 3) continue;
      states[y][x] = charToState[c];
      x++;
    }
  }
  draw();
}

function setSize(w, h) {
  width = w + 4;
  height = h + 4;
  rightEnd = width - 3;
  downEnd = height - 3;
  elemSvg.setAttribute('width', blockSize * width);
  elemSvg.setAttribute('height', blockSize * height);
}

function move(dir) {
  const dx = dxs[dir];
  const dy = dys[dir];

  const moveState = {}; // 移動予定の状態番号
  moveState[stateHero] = true;
  const st = new Stack(); // 移動可能か検証必要な状態番号
  st.push(stateHero);
  let flag = true; // 移動フラグ。
  while (!st.empty()) {
    const state = st.pop();
    loop:
    for (let y = upEnd; y <= downEnd; ++y) {
      for (let x = leftEnd; x <= rightEnd; ++x) {
        if (states[y][x] != state) continue;
        const neighborState = states[y + dy][x + dx];
        if (neighborState == stateNone) continue;
        if (neighborState == stateWall) {
          flag = false;
          break loop;
        } else if (!moveState[neighborState]) {
          moveState[neighborState] = true;
          st.push(neighborState);
        }
      }
    }
  }

  if (flag) {
    undos[undoIdx++] = getStateStr();
    const statesTemp = new Array(height);
    for (let y = 0; y < height; ++y) {
      statesTemp[y] = states[y].slice();
    }

    for (let y = upEnd; y <= downEnd; ++y) {
      for (let x = leftEnd; x <= rightEnd; ++x) {
        if (moveState[states[y][x]]) {
          states[y][x] = stateNone;
        }
      }
    }
    for (let y = upEnd; y <= downEnd; ++y) {
      for (let x = leftEnd; x <= rightEnd; ++x) {
        if (moveState[statesTemp[y - dy][x - dx]]) {
          states[y][x] = statesTemp[y - dy][x - dx];
        }
      }
    }
  }
}

function keydown(e) {
  const now = Date.now();
  const key = e.key;
  if (key == 'r') {
    changeLevel(levelId);
  } else if (key == 'z') {
    if (undoIdx != 0) {
      applyStateStr(undos[--undoIdx]);
    }
  } else if (e.shiftKey || e.ctrlKey) {
    if (key == 'ArrowLeft') {
      gotoPrevLevel();
    } else if (key == 'ArrowRight') {
      gotoNextLevel();
    }
  } else if (keyFlag || now > lastTime + keyInputMsec) {
    keyFlag = false;
    lastTime = now;
    const dir = Dir[key];
    if (dir !== undefined) {
      move(dir);
      draw();
    }
  }
  return false; 
}

function keyup() {
  keyFlag = true;
  return false; 
}

function applyLevel(levelObj) {
  setSize(levelObj.width, levelObj.height);
  applyStateStr(levelObj.stateStr);
}

function changeLevel(id) {
  undoIdx = 0;
  levelId = id;
  if (levelId < 1) levelId = 1;
  if (levelId > levels.length) levelId = levels.length;
  setButtonVisibility();
  elemLevelId.innerText = levelId;
  const level = levelId - 1;
  applyLevel(levels[level]);
}

function setButtonVisibility() {
  elemLevelPrev.style.visibility = levelId == 1 ? 'hidden' : 'visible';
  elemLevelNext.style.visibility = levelId == levels.length ? 'hidden' : 'visible';
}

function gotoPrevLevel() {
  if (levelId > 1) {
    changeLevel(levelId - 1);
  }
}

function gotoNextLevel() {
  if (levelId < levels.length) {
    changeLevel(levelId + 1);
  }
}

function init() {
  document.getElementById('versionInfo').innerText = version;

  elemLevelPrev = document.getElementById('levelPrev');
  elemLevelId = document.getElementById('levelId');
  elemLevelNext = document.getElementById('levelNext');

  elemSvg = document.getElementById('svgBoard');

  const res = analyzeUrl();

  if (res.stateStr == '') {
    changeLevel(levelId);
  } else {
    applyLevel(res);
  }

  {
    document.addEventListener('keydown', keydown, false);
    document.addEventListener('keyup', keyup, false);

    elemLevelPrev.addEventListener('click', gotoPrevLevel, false);
    elemLevelNext.addEventListener('click', gotoNextLevel, false);
  }
}

function createLine(param) {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', blockSize * param.x1);
  line.setAttribute('y1', blockSize * param.y1);
  line.setAttribute('x2', blockSize * param.x2);
  line.setAttribute('y2', blockSize * param.y2);
  return line;
}

function createRect(param) {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', blockSize * param.x);
  rect.setAttribute('y', blockSize * param.y);
  rect.setAttribute('width', blockSize * param.width);
  rect.setAttribute('height', blockSize * param.height);
  return rect;
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

// 描画
function draw() {
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

    const paddingWidth = 0.12;
    const paddingWidthHalf = paddingWidth / 2;

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
        if (states[y - 1][x] != state) {
          flag1 = false;
          const line = createLine({x1: x, y1: y + paddingWidthHalf, x2: x + 1, y2: y + paddingWidthHalf});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', paddingWidth * blockSize);
          g.appendChild(line);
        }
        // 右側
        if (states[y][x + 1] != state) {
          flag2 = false;
          const line = createLine({x1: x + 1 - paddingWidthHalf, y1: y, x2: x + 1 - paddingWidthHalf, y2: y + 1});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', paddingWidth * blockSize);
          g.appendChild(line);
        }
        // 下側
        if (states[y + 1][x] != state) {
          flag3 = false;
          const line = createLine({x1: x, y1: y + 1 - paddingWidthHalf, x2: x + 1, y2: y + 1 - paddingWidthHalf});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', paddingWidth * blockSize);
          g.appendChild(line);
        }
        // 左側
        if (states[y][x - 1] != state) {
          flag4 = false;
          const line = createLine({x1: x + paddingWidthHalf, y1: y, x2: x + paddingWidthHalf, y2: y + 1});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', paddingWidth * blockSize);
          g.appendChild(line);
        }
        // 右上
        if (flag1 && flag2 && states[y - 1][x + 1] != state) {
          const rect = createRect({x: x + 1 - paddingWidth, y: y, width: paddingWidth, height: paddingWidth});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
        // 右下
        if (flag2 && flag3 && states[y + 1][x + 1] != state) {
          const rect = createRect({x: x + 1 - paddingWidth, y: y + 1 - paddingWidth, width: paddingWidth, height: paddingWidth});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
        // 左上
        if (flag3 && flag4 && states[y + 1][x - 1] != state) {
          const rect = createRect({x: x, y: y + 1 - paddingWidth, width: paddingWidth, height: paddingWidth});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
        // 左下
        if (flag4 && flag1 && states[y - 1][x - 1] != state) {
          const rect = createRect({x: x, y: y, width: paddingWidth, height: paddingWidth});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
      }
    }
  }

  drawFrame(g);

  // 額縁
  {
    const paddingWidth = 1.3;
    const paddingColor = isOk(isTarget) ? '#8d5' : '#753';
    // 上側
    {
      const rect = createRect({x: 0, y: 0, width: width, height: paddingWidth});
      rect.setAttribute('fill', paddingColor);
      rect.setAttribute('stroke', 'none');
      g.appendChild(rect);
    }
    // 右側
    {
      const rect = createRect({x: width - paddingWidth, y: 0, width: width, height: height});
      rect.setAttribute('fill', paddingColor);
      rect.setAttribute('stroke', 'none');
      g.appendChild(rect);
    }
    // 下側
    {
      const rect = createRect({x: 0, y: height - paddingWidth, width: width, height: height});
      rect.setAttribute('fill', paddingColor);
      rect.setAttribute('stroke', 'none');
      g.appendChild(rect);
    }
    // 左側
    {
      const rect = createRect({x: 0, y: 0, width: paddingWidth, height: height});
      rect.setAttribute('fill', paddingColor);
      rect.setAttribute('stroke', 'none');
      g.appendChild(rect);
    }
  }

  elemSvg.appendChild(g);
}

function isTarget(x) {
  return stateTargetMin <= x && x <= stateTargetMax;
}

function isOk(isX) {
  if (count(isX) == 0) return false;
  if (!isConnected(isX)) return false;
  if (!isPointSymmetry(isX)) return false;
  return true;
}

function count(isX) {
  let cnt = 0;
  for (let y = upEnd; y <= downEnd; ++y) {
    for (let x = leftEnd; x <= rightEnd; ++x) {
      if (isX(states[y][x])) cnt++;
    }
  }
  return cnt;
}

// 図形が点対称か否か。
function isPointSymmetry(isX) {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  for (let y = upEnd; y <= downEnd; ++y) {
    for (let x = leftEnd; x <= rightEnd; ++x) {
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
  loop:
  for (let y = upEnd; y <= downEnd; ++y) {
    for (let x = leftEnd; x <= rightEnd; ++x) {
      if (isX(statesTemp[y][x])) {
        x0 = x;
        y0 = y;
        break loop;
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
