(function() {
  'use strict';
  const version = 'Version: 2022.05.28';

  const levels = [
    {width: 6, height: 6, stateStr: 's---00001-002211-00211'},

    {width: 5, height: 5, stateStr: 's0aa-011a-010a-0x-0b002'},
    {width: 5, height: 5, stateStr: 's0aaa-0110a-0100a-b-b0c02'},
    {width: 5, height: 5, stateStr: 's-000aa-bb001-b220x-b2'},
    {width: 5, height: 5, stateStr: 'saa0x-0a-10b-xc22-002'},
    {width: 5, height: 5, stateStr: 's10a-20b-c000d-c033-003'},
    {width: 5, height: 5, stateStr: 's01-002ax-033-0b304-000c'},

    {width: 5, height: 5, stateStr: 's00a-b1ca-0d-2222-x003'},
    {width: 5, height: 5, stateStr: 's00a-0b0a-0bb-1111-0002'},

    {width: 5, height: 6, stateStr: 'sx--01-011-1122-002'},
    {width: 6, height: 6, stateStr: 'sx0x--01000x-011-1122-x02'},
  ];
  let levelId;
  let levelObj;

  const undos = [];
  let undoIdx = 0;
  let undoFlag = false;
  let undoCount = 0;

  const debugMode = false;
  let debugFlag = false;

  window.addEventListener('load', init, false);

  const SVG_NS = 'http://www.w3.org/2000/svg';

  let width = 6;
  let height = 6;
  const upEnd = 2;
  let rightEnd = width - 3;
  let downEnd = height - 3;
  const leftEnd = 2;

  const stateHero = -2; // 自機
  const stateWall = -1; // 壁
  const stateNone = 0;
  const stateTargetMin = 1;
  const stateTargetMax = 9;
  const stateOtherMin = 10;
  const stateOtherMax = 15;

  const stateToChar = {};
  const charToState = {};

  stateToChar[stateHero] = 's';
  stateToChar[stateWall] = 'x';
  stateToChar[stateNone] = '0';
  for (let i = stateTargetMin; i <= stateTargetMax; ++i) {
    stateToChar[i] = `${i}`; // '1' ～
  }
  for (let i = stateOtherMin; i <= stateOtherMax; ++i) {
    stateToChar[i] = `${String.fromCharCode(97 + i - stateOtherMin)}`; // 'a' ～
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

  let blockSize;

  const dirs = {
    u: 0,
    r: 1,
    d: 2,
    l: 3,
    ur: 4,
    dr: 5,
    dl: 6,
    ul: 7,
    neutral: 8,
    ArrowUp: 0,
    ArrowRight: 1,
    ArrowDown: 2,
    ArrowLeft: 3,
  };

  const dys = [-1, 0, 1, 0, -1, 1, 1, -1, 0];
  const dxs = [0, 1, 0, -1, 1, 1, -1, -1, 0];

  let states = [];
  let moveFlags = [];
  let moveFlag = false;
  let moveCount = 0;
  let moveDir = dirs.neutral;

  let elemLevelPrev;
  let elemLevelId;
  let elemLevelNext;
  let elemSvg;
  let elemUndo;
  let elemResetLevel;
  let elemStick;
  let elemStickBase;

  let inputFlag = false;
  const inputInterval = 8;
  const undoInterval = 6;
  let inputCountPrev = 0;
  let inputCount = inputInterval;
  let inputDir = dirs.neutral;
  const inputKeys = {};

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

  // 初期化
  function initStates() {
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
  }

  function applyStateStr(stateStr) {
    initStates();
    resetDirs();

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
    blockSize = 250 / height;
    rightEnd = width - 3;
    downEnd = height - 3;
    elemSvg.setAttribute('width', blockSize * width);
    elemSvg.setAttribute('height', blockSize * height);
  }

  function updateController(dir) {
    const transforms = [
      'scale(1.0, 0.7) translate(0, -27)',
      'scale(0.7, 1.0) translate(27, 0)',
      'scale(1.0, 0.7) translate(0, 27)',
      'scale(0.7, 1.0) translate(-27, 0)',
      '',
      '',
      '',
      '',
      'scale(1.0, 1.0) translate(0, 0)',
    ];
    elemStick.setAttribute('transform', transforms[dir]);
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
      elemUndo.style.display = 'block';

      for (let y = upEnd; y <= downEnd; ++y) {
        for (let x = leftEnd; x <= rightEnd; ++x) {
          if (moveState[states[y][x]]) {
            moveFlags[y][x] = true;
          }
        }
      }
      moveDir = dir;
      moveFlag = true;
      moveCount = 0;
    }
  }

  function moveUpdate() {
    const statesTemp = new Array(height);
    for (let y = 0; y < height; ++y) {
      statesTemp[y] = states[y].slice();
    }

    for (let y = upEnd; y <= downEnd; ++y) {
      for (let x = leftEnd; x <= rightEnd; ++x) {
        if (moveFlags[y][x]) {
          states[y][x] = stateNone;
        }
      }
    }
    for (let y = upEnd; y <= downEnd; ++y) {
      for (let x = leftEnd; x <= rightEnd; ++x) {
        const dx = dxs[moveDir];
        const dy = dys[moveDir];
        if (moveFlags[y - dy][x - dx]) {
          states[y][x] = statesTemp[y - dy][x - dx];
          moveFlags[y - dy][x - dx] = false;
        }
      }
    }
    moveDir = dirs.neutral;
  }

  function undodown(e) {
    e.preventDefault();
    undoFlag = true;
    undoCount = undoInterval;
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

  function pointerdown(e) {
    e.preventDefault();
    inputFlag = true;
    pointermove(e);
  }

  function pointermove(e) {
    e.preventDefault();
    if (!inputFlag) return;
    const cursorPos = getCursorPos(elemStickBase, e);
    const ax = cursorPos.x - 100.0;
    const ay = cursorPos.y - 100.0;
    const minDist = 60;
    if (ax ** 2 + ay ** 2 < minDist ** 2) {
      inputDir = dirs.neutral;
    } else if (Math.abs(ax) > Math.abs(ay)) {
      inputDir = ax < 0 ? dirs.ArrowLeft : dirs.ArrowRight;
    } else {
      inputDir = ay < 0 ? dirs.ArrowUp : dirs.ArrowDown;
    }
    updateController(inputDir);
  }

  function pointerup() {
    undoFlag = false;
    inputFlag = false;
    inputDir = dirs.neutral;
    updateController(inputDir);
  }

  function resetLevel() {
    elemSvg.textContent = '';
    initStates();
    draw();

    window.setTimeout(function() {
      if (levelId != 0) {
        changeLevel(levelId);
      } else {
        applyLevel(levelObj);
      }
    }, 50);
  }

  function resetDirs() {
    for (let y = 0; y < height; ++y) {
      moveFlags[y] = [];
      for (let x = 0; x < width; ++x) {
        moveFlags[y][x] = false;
      }
    }
    moveCount = 0;
    moveFlag = false;
  }

  function undo() {
    if (undoIdx != 0) {
      applyStateStr(undos[--undoIdx]);
    }
    if (undoIdx == 0) {
      resetUndo();
    }
    resetDirs();
  }

  function keydown(e) {
    if (e.shiftKey || e.ctrlKey) {
      if (e.key == 'ArrowLeft') {
        gotoPrevLevel();
      } else if (e.key == 'ArrowRight') {
        gotoNextLevel();
      }
    } else if (e.key == ' ') {
      debugFlag = true;
      draw();
    } else if (e.key == 'u') {
      return false;
    } else if (e.key == 'd') {
      return false;
    } else if (e.key == 'l') {
      return false;
    } else if (e.key == 'r') {
      resetLevel();
    } else if (e.key == 'z') {
      if (!undoFlag) {
        undoFlag = true;
        undoCount = undoInterval;
      }
    } else {
      const dir = dirs[e.key];
      if (dir !== undefined) {
        inputFlag = true;
        inputDir = dir;
        updateController(inputDir);
        inputKeys[e.key] = true;
      }
    }
    return false; 
  }

  function keyup(e) {
    debugFlag = false;
    delete inputKeys[e.key];
    if (Object.keys(inputKeys).length == 0) {
      updateController(dirs.neutral);
      inputFlag = false;
    }
    if (e.key == 'z') {
      undoFlag = false;
    }
    return false; 
  }

  function applyLevel(levelObj) {
    setSize(levelObj.width, levelObj.height);
    applyStateStr(levelObj.stateStr);
    setButtonVisibility();
  }

  function resetUndo() {
    undoIdx = 0;
    elemUndo.style.display = 'none';
  }

  function changeLevel(id) {
    resetUndo();
    levelId = id;
    if (levelId < 1) levelId = 1;
    if (levelId > levels.length) levelId = levels.length;
    setButtonVisibility();
    elemLevelId.innerText = levelId;
    const level = levelId - 1;
    applyLevel(levels[level]);
  }

  function setButtonVisibility() {
    elemLevelPrev.style.visibility = levelId <= 1 ? 'hidden' : 'visible';
    elemLevelNext.style.visibility = levelId % levels.length == 0 ? 'hidden' : 'visible';
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

    elemSvg = document.getElementById('svgMain');

    elemUndo = document.getElementById('buttonUndo');
    elemResetLevel = document.getElementById('buttonResetLevel');
    elemStick = document.getElementById('stick');
    elemStickBase = document.getElementById('stickBase');

    levelObj = analyzeUrl();
    if (levelObj.stateStr == '') {
      levelId = 1;
      changeLevel(levelId);
    } else {
      levelId = 0;
      applyLevel(levelObj);
    }

    {
      document.addEventListener('keydown', keydown, false);
      document.addEventListener('keyup', keyup, false);

      elemResetLevel.addEventListener('click', resetLevel, false);
      elemLevelPrev.addEventListener('click', gotoPrevLevel, false);
      elemLevelNext.addEventListener('click', gotoNextLevel, false);

      const touchDevice = window.ontouchstart !== undefined;
      const pointerdownEventName = touchDevice ? 'touchstart' : 'mousedown';
      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      const pointerupEventName = touchDevice ? 'touchend' : 'mouseup';

      elemStickBase.addEventListener(pointerdownEventName, pointerdown, false);
      elemStickBase.addEventListener(pointermoveEventName, pointermove, false);
      elemStickBase.addEventListener(pointerupEventName, pointerup, false);
      document.addEventListener(pointerupEventName, pointerup, false);

      elemUndo.addEventListener(pointerdownEventName, undodown, false);
    }

    window.setInterval(function() {
      if (inputCount < inputCountPrev + inputInterval) {
        inputCount++;
      }
      if (!moveFlag && inputFlag) {
        if (inputDir != dirs.neutral) {
          if (inputCount >= inputCountPrev + inputInterval) {
            move(inputDir);
            inputCount = 0;
            inputCountPrev = 0;
          }
        }
      }
      if (moveFlag) {
        moveCount++;
        if (moveCount == inputInterval) {
          moveCount = 0;
          moveFlag = false;
          moveUpdate();
        }
        draw();
      }
      if (undoFlag) {
        if (undoCount == undoInterval) {
          undoCount = 0;
          undo();
        }
        undoCount++;
      }
    }, 20);
  }

  function createG() {
    const g = document.createElementNS(SVG_NS, 'g');
    return g;
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

  function createText(param) {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', blockSize * param.x);
    text.setAttribute('y', blockSize * (param.y + 0.5));
    text.textContent = param.text;
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('text-anchor', 'middle');
    return text;
  }

  function drawFrame() {
    const g = createG();
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
    elemSvg.appendChild(g);

    // 額縁
    {
      const g = createG();
      const paddingWidth = 1.15;
      const isCleared = isOk(isTarget);
      const paddingColor = isCleared ? '#8d5' : '#753';
      // 上側
      {
        const rect = createRect({x: 0, y: 0, width: width, height: paddingWidth});
        rect.setAttribute('fill', paddingColor);
        rect.setAttribute('stroke', 'none');
        g.appendChild(rect);
      }
      // 右側
      {
        const rect = createRect({x: width - paddingWidth, y: 0, width: paddingWidth, height: height});
        rect.setAttribute('fill', paddingColor);
        rect.setAttribute('stroke', 'none');
        g.appendChild(rect);
      }
      // 下側
      {
        const rect = createRect({x: 0, y: height - paddingWidth, width: width, height: paddingWidth});
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
      // クリアメッセージ
      if (isCleared) {
        const text = createText({x: width * 0.5, y: height - 1, text: 'CLEAR'});
        text.setAttribute('font-size', `${blockSize * 0.8}px`);
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', 'blue');
        g.appendChild(text);
      }
      elemSvg.appendChild(g);
    }
  }

  // 描画
  function draw() {
    elemSvg.textContent = '';

    // 図形の描画
    {
      // 背景
      {
        const g = createG();
        const rect = createRect({x: 0, y: 0, width: width, height: height});
        rect.setAttribute('fill', colorNone);
        rect.setAttribute('stroke', 'none');
        g.appendChild(rect);
        elemSvg.appendChild(g);
      }

      const paddingWidth = 0.12;
      const paddingWidthHalf = paddingWidth / 2;

      // 図形
      for (let y = 1; y < height - 1; ++y) {
        for (let x = 1; x < width - 1; ++x) {
          const state = states[y][x];
          if (state == stateNone) continue;

          const g = createG();
          const color = colors[state];
          {
            const rect = createRect({x: x, y: y, width: 1, height: 1});
            rect.setAttribute('fill', color.fill);
            rect.setAttribute('stroke', 'none');
            g.appendChild(rect);
          }
          {
            const flags = [];
            for (let dir = 0; dir < 8; ++dir) {
              flags[dir] = states[y + dys[dir]][x + dxs[dir]] == state;
            }
            // 上側
            if (!flags[dirs.u]) {
              const line = createLine({x1: x, y1: y + paddingWidthHalf, x2: x + 1, y2: y + paddingWidthHalf});
              line.setAttribute('stroke', color.stroke);
              line.setAttribute('stroke-width', paddingWidth * blockSize);
              g.appendChild(line);
            }
            // 右側
            if (!flags[dirs.r]) {
              const line = createLine({x1: x + 1 - paddingWidthHalf, y1: y, x2: x + 1 - paddingWidthHalf, y2: y + 1});
              line.setAttribute('stroke', color.stroke);
              line.setAttribute('stroke-width', paddingWidth * blockSize);
              g.appendChild(line);
            }
            // 下側
            if (!flags[dirs.d]) {
              const line = createLine({x1: x, y1: y + 1 - paddingWidthHalf, x2: x + 1, y2: y + 1 - paddingWidthHalf});
              line.setAttribute('stroke', color.stroke);
              line.setAttribute('stroke-width', paddingWidth * blockSize);
              g.appendChild(line);
            }
            // 左側
            if (!flags[dirs.l]) {
              const line = createLine({x1: x + paddingWidthHalf, y1: y, x2: x + paddingWidthHalf, y2: y + 1});
              line.setAttribute('stroke', color.stroke);
              line.setAttribute('stroke-width', paddingWidth * blockSize);
              g.appendChild(line);
            }
            // 右上
            if (flags[dirs.u] && flags[dirs.r] && !flags[dirs.ur]) {
              const rect = createRect({x: x + 1 - paddingWidth, y: y, width: paddingWidth, height: paddingWidth});
              rect.setAttribute('fill', color.stroke);
              g.appendChild(rect);
            }
            // 右下
            if (flags[dirs.d] && flags[dirs.r] && !flags[dirs.dr]) {
              const rect = createRect({x: x + 1 - paddingWidth, y: y + 1 - paddingWidth, width: paddingWidth, height: paddingWidth});
              rect.setAttribute('fill', color.stroke);
              g.appendChild(rect);
            }
            // 左下
            if (flags[dirs.d] && flags[dirs.l] && !flags[dirs.dl]) {
              const rect = createRect({x: x, y: y + 1 - paddingWidth, width: paddingWidth, height: paddingWidth});
              rect.setAttribute('fill', color.stroke);
              g.appendChild(rect);
            }
            // 左上
            if (flags[dirs.u] && flags[dirs.l] && !flags[dirs.ul]) {
              const rect = createRect({x: x, y: y, width: paddingWidth, height: paddingWidth});
              rect.setAttribute('fill', color.stroke);
              g.appendChild(rect);
            }
          }
          if (moveFlags[y][x]) {
            let ratio0 = moveCount / inputInterval * 1.1;
            ratio0 = Math.min(ratio0, 1.0);
            const ratio = Math.sin(0.5 * Math.PI * ratio0) ** 0.5;
            const dx = dxs[moveDir] * blockSize * ratio;
            const dy = dys[moveDir] * blockSize * ratio;
            if (dx + dy != 0) {
              g.setAttribute('transform', `translate(${dx},${dy})`);
            }
          }
          if (debugMode || debugFlag) {
            const text = createText({x: x + 0.5, y: y, text: stateToChar[state]});
            g.appendChild(text);
          }
          elemSvg.appendChild(g);
        }
      }
    }

    drawFrame(elemSvg);
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

  class Stack {
    constructor() {
      this.data = [];
    }
    push(val) {
      this.data.push(val);
      return val;
    }
    pop() {
      return this.data.pop();
    }
    top() {
      return this.data[this.data.length - 1];
    }
    size() {
      return this.data.length;
    }
    empty() {
      return this.data.length == 0;
    }
  }
})();
