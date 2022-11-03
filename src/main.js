(function() {
  'use strict';
  const versionText = 'Version: 2022.11.02';

  const levels = [
    // LEVEL 1～
    {w: 6, h: 6, s: 's---00001-002211-00211', r: '111112223122302333001233001110012'},
    {w: 5, h: 5, s: 's0aa-011b-010b-0x-0c002', r: '21012233221'},
    {w: 5, h: 5, s: 'saaa-0110b-c100b-c-00d02', r: '12112223100033321012321'},
    {w: 5, h: 5, s: 'sa-000bb-cc001-c220x-c2', r: '12121223023301210301'},
    {w: 5, h: 5, s: 'saa-0a-10b-xc22-002', r: '12220110331112232300'},

    // LEVEL 6～
    {w: 5, h: 5, s: 's10a-20b-c000d-0e33-003', r: '122110311223230011003'},
    {w: 5, h: 5, s: 's01-002ax-033-0b304-000c', r: '22221110003122233300130012120332111333221100'},
    {w: 5, h: 5, s: 's00a-b1ca-0d-2222-e0f3', r: '111223311003321211223'},
    {w: 5, h: 5, s: 's00a-0b0a-0bb-1111-0002', r: '112312112230332110100322'},
    {w: 6, h: 5, s: '001sa-00111x-2201-02bc', r: '3112222333301211110033112230002323233012110112333303001232111210'},

    // LEVEL 11～
    {w: 6, h: 6, s: '001sa-xb111x-c001-22-0200d-000xd', r: '203321222233011300010311123311223022323301110'},
    {w: 6, h: 6, s: '00000s--111-201-222-02', r: '2222233302330111211033301110003333210122232330111'},
    {w: 6, h: 6, s: '0aa-012-01222b-022cde-0sfff', r: '3000011211123303013332222210301300012232221100110332223301210'},
    {w: 6, h: 6, s: 'x-000111-0021aa-s221a--x0000x', r: '2111030032321132211100103100312222332303301210'},
    {w: 6, h: 6, s: '001s0a-b011-bc12de-00220e-f022', r: '1212230222333000022212103010310032212223330100012321'},

    // LEVEL 16～
    {w: 6, h: 4, s: '-0112s-0012', r: '0333232100111122230103333221021103'},
    {w: 6, h: 5, s: '-s11222-01122', r: '01112033322210301122211103330'},
    {w: 6, h: 6, s: 's0000x-0112-00122-00344-0334-x0000x', r: '21011123223223011000033321012220033211'},
    {w: 5, h: 5, s: '-01s2-0303-0333-00x', r: '0332213001222000111232330101222003321'},
    {w: 6, h: 6, s: '000aa-0x0sa-0011a-02103-00113-00bb', r: '1223001223212330330111100322210033321'},

    // LEVEL 21～
    {w: 6, h: 6, s: '0000a-0x0sa-0011a-021b3-00113-00cc', r: '033322123221100301332211'},
    {w: 6, h: 5, s: 's-t-0001-02211-0211', r: '22101111230122230012223302300130'},
  ];

  let autoMode = false;
  let rotateNum = 0;
  let mirrorFlag = false;

  let debugFlag = false;
  let editMode = false;
  let autoStep;

  let levelId;
  let levelObj;

  let undoInfo;
  let undoFlag = false;
  let undoCount = 0;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  let width;
  let height;
  const upEnd = 2;
  let rightEnd;
  let downEnd;
  const leftEnd = 2;
  let clearFlag = false;

  const stateWall = -1; // 壁
  const stateNone = 0;
  const stateTargetMin = 1;
  const stateTargetMax = 9;
  const stateOtherMin = 10;
  const stateOtherMax = 15;
  const stateUserMin = 100; // 自機
  const stateUserMax = 102; // 自機

  let drawingState = stateNone;
  const editboxFunctions = {};

  const stateToChar = {};
  const charToState = {};

  stateToChar[stateWall] = 'x';
  stateToChar[stateNone] = '0';
  for (let i = stateTargetMin; i <= stateTargetMax; ++i) {
    stateToChar[i] = `${i}`; // '1' ～
  }
  for (let i = stateOtherMin; i <= stateOtherMax; ++i) {
    stateToChar[i] = `${String.fromCharCode(0x61 + i - stateOtherMin)}`; // 'a' ～
  }
  for (let i = stateUserMin; i <= stateUserMax; ++i) {
    stateToChar[i] = `${String.fromCharCode(0x73 + i - stateUserMin)}`; // 's' ～
  }

  for (const key in stateToChar) {
    const val = stateToChar[key];
    charToState[val] = Number(key);
  }

  const colors = {};
  colors[stateNone] = {fill: 'white', stroke: '#aaa', text: '#ccc'};
  colors[stateWall] = {fill: '#222', stroke: '#666', text: 'white'};
  for (let i = stateTargetMin; i <= stateTargetMax; ++i) {
    colors[i] = {fill: 'pink', stroke: 'red', text: 'black'};
  }
  for (let i = stateOtherMin; i <= stateOtherMax; ++i) {
    colors[i] = {fill: '#e5e5e5', stroke: '#aaa', text: 'black'};
  }
  for (let i = stateUserMin; i <= stateUserMax; ++i) {
    colors[i] = {fill: 'aqua', stroke: 'blue', text: 'black'};
  }

  const colorLine = '#888';

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

  const states = [];
  const moveFlags = [];
  let moveFlag = false;
  let moveCount = 0;
  let moveDir = dirs.neutral;

  const elems = {};
  const elemIds = {
    resetLevel: 'buttonResetLevel',
    levelPrev: 'levelPrev',
    levelId: 'levelId',
    levelNext: 'levelNext',
    editLevel: 'buttonEditLevel',

    svg: 'svgMain',
    editbox: 'editbox',
    editShape: 'edit_drawing_shape',
    editState: 'edit_drawing_state',
    url: 'url',

    undo: 'buttonUndo',
    stick: 'stick',
    stickBase: 'stickBase',
  };

  let inputFlag = false;
  const inputInterval = 8;
  const undoInterval = 6;
  let inputCountPrev = 0;
  let inputCount = inputInterval;
  let inputDir = dirs.neutral;
  const inputKeys = {};

  document.addEventListener('DOMContentLoaded', onload, false);

  function getW() {
    return rightEnd - leftEnd + 1;
  }

  function getH() {
    return downEnd - upEnd + 1;
  }

  function getUrlStr() {
    const w = getW();
    const h = getH();
    const s = getStateStr(states, upEnd, rightEnd, downEnd, leftEnd);
    console.log(`{w: ${w}, h: ${h}, s: '${s}'},`);
    return `${location.href.split('?')[0]}?w=${w}&h=${h}&s=${s}`;
  }

  function getStateStr(states, upEnd, rightEnd, downEnd, leftEnd) {
    let res = '';
    for (let y = upEnd; y <= downEnd; ++y) {
      let line = '';
      for (let x = leftEnd; x <= rightEnd; ++x) {
        line += stateToChar[states[y][x]];
      }
      res += line.replace(/0+$/, '');
      res += '-';
    }
    return res.replace(/-+$/, '');
  }

  // 初期化
  function initStates() {
    for (let y = 0; y < height; ++y) {
      states[y] = [];
      for (let x = 0; x < width; ++x) {
        states[y][x] = stateNone;
      }
    }

    // 枠(外周2マス分)
    {
      for (let y = 0; y < height; ++y) {
        states[y][0] = stateWall;
        states[y][1] = stateWall;
        states[y][width - 2] = stateWall;
        states[y][width - 1] = stateWall;
      }
      for (let x = 2; x < width - 2; ++x) {
        states[0][x] = stateWall;
        states[1][x] = stateWall;
        states[height - 2][x] = stateWall;
        states[height - 1][x] = stateWall;
      }
    }
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
    elems.stick.setAttribute('transform', transforms[dir]);
  }

  function move(dir) {
    const dx = dxs[dir];
    const dy = dys[dir];

    for (let i = stateUserMin; i <= stateUserMax; ++i) {
      if (count((x)=>{ return x == i; }) == 0) continue;

      const moveState = []; // 移動予定の状態番号
      moveState[i] = true;

      let flag = true;
      const st = new Stack(); // 移動可能か検証必要な状態番号
      st.push(i);
      while (!st.empty()) {
        const state = st.pop();
        loop: for (let y = upEnd; y <= downEnd; ++y) {
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

      // 各座標に移動フラグを設定
      if (flag) {
        showElem(elems.undo);

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
    if (moveFlag) {
      undoInfo.pushData({
        dir: dir,
        w: getW(),
        h: getH(),
        s: getStateStr(states, upEnd, rightEnd, downEnd, leftEnd),
      });
    }
  }

  // 盤面を更新
  function stateUpdate() {
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

    updateUrl();
  }

  function undoStart() {
    if (undoFlag) return;
    undoFlag = true;
    elems.undo.style.filter = 'contrast(60%)';
    undoCount = undoInterval;
  }

  function undoEnd() {
    if (!undoFlag) return;
    undoFlag = false;
    elems.undo.style.filter = 'none';
  }

  function undodown(e) {
    e.preventDefault();
    undoStart();
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
    const cursorPos = getCursorPos(elems.stickBase, e);
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
    undoEnd();
    inputFlag = false;
    inputDir = dirs.neutral;
    updateController(inputDir);
  }

  function keydown(e) {
    if (e.shiftKey) {
      if (e.key == 'T') {
        // 強制editモード (Shift + t)
        levelId = null;
        updateLevelVisibility();
        toggleEditLevel();
      } else {
        if (e.key == 'ArrowLeft') {
          gotoPrevLevel();
        } else if (e.key == 'ArrowRight') {
          gotoNextLevel();
        }
      }
    } else if (e.key == ' ') {
      e.preventDefault();
      debugFlag = true;
      draw();
    } else if (e.key == 't') {
      if (levelId == null) {
        toggleEditLevel();
      }
    } else if (e.key == 'r') {
      resetLevel();
    } else if (e.key == 'z') {
      undoStart();
    } else if (e.key.length > 2) {
      const dir = dirs[e.key];
      if (dir !== undefined) {
        e.preventDefault();
        inputFlag = true;
        inputDir = dir;
        updateController(inputDir);
        inputKeys[e.key] = true;
      }
    } else if (editMode && editboxFunctions[e.key]) {
      editboxFunctions[e.key]();
    }
    return false;
  }

  function keyup(e) {
    if (debugFlag && e.key == ' ') {
      debugFlag = false;
      draw();
    }
    delete inputKeys[e.key];
    if (Object.keys(inputKeys).length == 0) {
      updateController(dirs.neutral);
      inputFlag = false;
    }
    if (e.key == 'z') {
      undoEnd();
    }
    return false;
  }

  function resetLevel() {
    elems.resetLevel.style.filter = 'contrast(60%)';
    elems.svg.textContent = '';
    initStates();

    setTimeout(() => {
      elems.resetLevel.style.filter = 'none';
      loadLevel(levelObj);
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

  function resetUndo() {
    clearFlag = false;
    undoInfo = new UndoInfo();
    hideElem(elems.undo);
  }

  function applySize(w, h) {
    width = w + 4;
    height = h + 4;
    blockSize = 250 / height;
    rightEnd = width - 3;
    downEnd = height - 3;
    elems.svg.setAttribute('width', blockSize * width);
    elems.svg.setAttribute('height', blockSize * height);
  }

  function applyStateStr(stateStr) {
    initStates();
    resetDirs();

    let y = upEnd;
    let x = leftEnd;
    for (const c of stateStr) {
      if (c == '-') {
        y++;
        if (y > downEnd) break;
        x = leftEnd;
      } else {
        if (x > rightEnd) continue;
        states[y][x] = charToState[c];
        x++;
      }
    }
    draw();
    updateUrl();
  }

  function execUndo() {
    if (undoInfo.isUndoable()) {
      const data = undoInfo.undo();
      applySize(data.w, data.h);
      applyStateStr(data.s);
    }

    if (undoInfo.getIndex() == 0) {
      resetUndo();
    }
    resetDirs();
  }

  function loadLevel(levelObj) {
    applySize(levelObj.w, levelObj.h);
    applyStateStr(levelObj.s);
    updateLevelVisibility();
    resetUndo();

    autoStep = 0;
    resetDirs();
    inputDir = dirs.neutral;
    inputCount = inputInterval;
    inputCountPrev = 0;
  }

  function loadLevelById(id) {
    resetUndo();
    levelId = id;
    if (levelId < 1) levelId = 1;
    if (levelId > levels.length) levelId = levels.length;
    updateLevelVisibility();
    elems.levelId.textContent = levelId;
    levelObj = levels[levelId - 1]; // リセット用にここで代入します。

    if (mirrorFlag) mirrorLevel();
    rotateLevel(rotateNum);

    loadLevel(levelObj);
    return;

    // 左右反転する。
    function mirrorLevel() {
      const w = levelObj.w;
      const h = levelObj.h;
      const stateStr = levelObj.s;
      const statesTemp = [];
      for (let y = 0; y < h; ++y) {
        statesTemp[y] = [];
        for (let x = 0; x < w; ++x) {
          statesTemp[y][x] = stateNone;
        }
      }

      let x = w - 1;
      let y = 0;
      for (const c of stateStr) {
        if (c == '-') {
          y++;
          if (y == h) break;
          x = w - 1;
        } else {
          if (x == -1) continue;
          statesTemp[y][x] = charToState[c];
          x--;
        }
      }
      let r = levelObj.r;
      if (r !== undefined) {
        let rotatedR = '';
        for (const c of r) {
          rotatedR += (4 - Number(c)) % 4;
        }
        r = rotatedR;
      }
      const s = getStateStr(statesTemp, 0, w - 1, h - 1, 0);
      levelObj = {w: w, h: h, s: s, r: r};
    }

    // 時計回りに90度×num回 回転する。
    function rotateLevel(rotateNum) {
      for (let i = 0; i < rotateNum; ++i) {
        const w = levelObj.h; // 90度回転後
        const h = levelObj.w; // 90度回転後
        const stateStr = levelObj.s;
        const statesTemp = [];
        for (let y = 0; y < h; ++y) {
          statesTemp[y] = [];
          for (let x = 0; x < w; ++x) {
            statesTemp[y][x] = stateNone;
          }
        }

        let x = w - 1;
        let y = 0;
        for (const c of stateStr) {
          if (c == '-') {
            x--;
            if (x < 0) break;
            y = 0;
          } else {
            if (y == h) continue;
            statesTemp[y][x] = charToState[c];
            y++;
          }
        }
        let r = levelObj.r;
        if (r !== undefined) {
          let rotatedR = '';
          for (const c of r) {
            rotatedR += (Number(c) + 1) % 4;
          }
          r = rotatedR;
        }
        const s = getStateStr(statesTemp, 0, w - 1, h - 1, 0);
        levelObj = {w: w, h: h, s: s, r: r};
      }
    }
  }

  function updateLevelVisibility() {
    if (levelId == null) {
      hideElem(elems.levelPrev);
      hideElem(elems.levelId);
      hideElem(elems.levelNext);
      showElem(elems.editLevel);
    } else {
      (levelId == 1 ? hideElem : showElem)(elems.levelPrev);
      showElem(elems.levelId);
      (levelId == levels.length ? hideElem : showElem)(elems.levelNext);
      hideElem(elems.editLevel);
    }
  }

  function gotoPrevLevel() {
    if (levelId == null) return;
    if (levelId > 1) {
      loadLevelById(levelId - 1);
    }
  }

  function gotoNextLevel() {
    if (levelId == null) return;
    if (levelId < levels.length) {
      loadLevelById(levelId + 1);
    }
  }

  function updateUrl() {
    if (!editMode) return;
    const url = getUrlStr();
    elems.url.innerHTML = `<a href="${url}">現在の盤面のURL</a>`;
  }

  function updateEditLevel() {
    if (editMode) {
      showElem(elems.url);
      showElem(elems.editbox);
    } else {
      hideElem(elems.url);
      hideElem(elems.editbox);
    }
    draw();
    updateUrl();
  }

  function toggleEditLevel() {
    editMode = !editMode;
    updateEditLevel();
  }

  function onload() {
    document.getElementById('versionInfo').innerText = versionText;

    for (const elemName in elemIds) {
      elems[elemName] = document.getElementById(elemIds[elemName]);
    }

    const res = window.analyzeUrl();
    autoMode = res.autoMode;
    rotateNum = res.rotateNum;
    mirrorFlag = res.mirrorFlag;
    levelObj = res.levelObj;
    if (levelObj.s == '') {
      levelId = 1;
      loadLevelById(levelId);
    } else {
      levelId = null;
      loadLevel(levelObj);
    }
    updateEditLevel();

    // editモード用
    {
      for (const char in charToState) {
        const state = charToState[char];
        const elem = document.getElementById(`edit_${char}`);
        if (elem === null) continue;
        const func = () => {
          elems.editShape.setAttribute('fill', colors[state].fill);
          elems.editShape.setAttribute('stroke', colors[state].stroke);
          elems.editState.textContent = char;
          elems.editState.setAttribute('fill', colors[state].text);
          drawingState = state;
        };
        editboxFunctions[char] = func;
        elem.addEventListener('click', func, false);

        {
          const rect = document.createElementNS(SVG_NS, 'rect');
          rect.setAttribute('x', 0);
          rect.setAttribute('y', 0);
          rect.setAttribute('width', 30);
          rect.setAttribute('height', 30);
          rect.setAttribute('fill', colors[state].fill);
          rect.setAttribute('stroke', colors[state].stroke);
          rect.setAttribute('stroke-width', 4);
          elem.appendChild(rect);
        }
        {
          const text = document.createElementNS(SVG_NS, 'text');
          text.setAttribute('x', 15);
          text.setAttribute('y', 17);
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('font-size', '18px');
          text.setAttribute('fill', colors[state].text);
          text.textContent = char;
          elem.appendChild(text);
        }
      }
      editboxFunctions[stateToChar[stateNone]]();
    }

    {
      document.addEventListener('keydown', keydown, false);
      document.addEventListener('keyup', keyup, false);

      elems.resetLevel.addEventListener('click', resetLevel, false);
      elems.levelPrev.addEventListener('click', gotoPrevLevel, false);
      elems.levelNext.addEventListener('click', gotoNextLevel, false);
      elems.editLevel.addEventListener('click', toggleEditLevel, false);

      const touchDevice = document.ontouchstart !== undefined;
      const pointerdownEventName = touchDevice ? 'touchstart' : 'mousedown';
      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      const pointerupEventName = touchDevice ? 'touchend' : 'mouseup';

      elems.svg.addEventListener(pointerdownEventName, editSvg, false);

      elems.stickBase.addEventListener(pointerdownEventName, pointerdown, false);
      elems.stickBase.addEventListener(pointermoveEventName, pointermove, false);
      elems.stickBase.addEventListener(pointerupEventName, pointerup, false);
      document.addEventListener(pointerupEventName, pointerup, false);

      elems.undo.addEventListener(pointerdownEventName, undodown, false);
    }

    setInterval(() => {
      if (inputCount < inputCountPrev + inputInterval) {
        inputCount++;
      }
      if (autoMode && levelObj.r !== undefined && inputDir == dirs.neutral && autoStep < levelObj.r.length) {
        inputDir = levelObj.r[autoStep++];
      }

      if (!moveFlag && (inputFlag || autoMode)) {
        if (inputDir != dirs.neutral) {
          if (inputCount >= inputCountPrev + inputInterval) {
            move(inputDir);
            inputCount = 0;
            inputCountPrev = 0;
          }
        }
        if (autoMode) {
          inputDir = dirs.neutral;
        }
      }
      if (moveFlag) {
        moveCount++;
        if (moveCount == inputInterval) {
          moveCount = 0;
          moveFlag = false;
          stateUpdate();
        }
        draw();
      }
      if (undoFlag) {
        if (undoCount == undoInterval) {
          undoCount = 0;
          execUndo();
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

  function createPolygon(param) {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    let points = '';
    for (const point of param.points) {
      if (points != '') points += ' ';
      points += `${blockSize * point[0]},${blockSize * point[1]}`;
    }
    polygon.setAttribute('points', points);
    return polygon;
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

  function createBackground() {
    const g = createG();

    const isCleared = isOk(isTarget);
    const paddingColor = isCleared ? '#8f8' : '#753';

    {
      const rect = createRect({x: 0, y: 0, width: width, height: height});
      rect.setAttribute('fill', paddingColor);
      g.appendChild(rect);
    }
    {
      const rect = createRect({x: 1, y: 1, width: width - 2, height: height - 2});
      rect.setAttribute('fill', 'white');
      g.appendChild(rect);
    }

    // クリアメッセージ
    if (isCleared) {
      if (autoMode) {
        setTimeout(gotoNextLevel, 1000);
      }
      const text = createText({x: width * 0.5, y: height - 0.95, text: 'CLEAR'});
      text.setAttribute('font-size', `${blockSize * 0.8}px`);
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', 'blue');
      g.appendChild(text);
      if (!clearFlag && !moveFlag) {
        clearFlag = true;
        const w = levelObj.w;
        const h = levelObj.h;
        const s = levelObj.s;
        const replayStr = undoInfo.getReplayStr();
        console.log(`{w: ${w}, h: ${h}, s: '${s}', r: '${replayStr}'},`);
        const steps = undoInfo.getIndex();
        console.log(`${steps} 手`);
        const r = levelObj.r;
        if (levelId === null || r === undefined) {
          console.warn('過去最高記録の情報がありません！');
        } else {
          const bestRecord = r.length;
          if (steps < bestRecord) {
            console.log(`新記録!\n${bestRecord} → ${steps} (${steps - bestRecord} 手)`);
          } else {
            console.log(`過去最高記録は ${bestRecord} 手です。\n(差: ${steps - bestRecord} 手)`);
            if (replayStr == r) {
              console.log('(完全に同じ手順です。)');
            }
          }
        }
      }
    }
    return g;
  }

  // 描画
  function draw() {
    elems.svg.textContent = '';

    // 図形の描画
    {
      // 背景
      {
        const g = createG();
        g.appendChild(createBackground());
        elems.svg.appendChild(g);
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
            const eps = 0.01; // サイズを少し大きくすることで、隙間をなくします。
            const rect = createRect({x: x - eps, y: y - eps, width: 1 + eps * 2, height: 1 + eps * 2});
            rect.setAttribute('fill', color.fill);
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

            if (stateUserMin <= state && state <= stateUserMax) {
              const size = 0.35;
              // 右上
              if (!flags[dirs.u] && !flags[dirs.r]) {
                const polygon = createPolygon({
                  points: [
                    [x + 1 - size, y],
                    [x + 1, y],
                    [x + 1, y + size],
                  ],
                });
                polygon.setAttribute('fill', color.stroke);
                g.appendChild(polygon);
              }
              // 右下
              if (!flags[dirs.d] && !flags[dirs.r]) {
                const polygon = createPolygon({
                  points: [
                    [x + 1, y + 1 - size],
                    [x + 1, y + 1],
                    [x + 1 - size, y + 1],
                  ],
                });
                polygon.setAttribute('fill', color.stroke);
                g.appendChild(polygon);
              }
              // 左下
              if (!flags[dirs.d] && !flags[dirs.l]) {
                const polygon = createPolygon({
                  points: [
                    [x, y + 1 - size],
                    [x + size, y + 1],
                    [x, y + 1],
                  ],
                });
                polygon.setAttribute('fill', color.stroke);
                g.appendChild(polygon);
              }
              // 左上
              if (!flags[dirs.u] && !flags[dirs.l]) {
                const polygon = createPolygon({
                  points: [
                    [x, y],
                    [x + size, y],
                    [x, y + size],
                  ],
                });
                polygon.setAttribute('fill', color.stroke);
                g.appendChild(polygon);
              }
            }
            // 移動モーション
            if (moveFlags[y][x]) {
              let ratio0 = moveCount / inputInterval * 1.1;
              ratio0 = Math.min(ratio0, 1.0);
              const ratio = Math.sin(0.5 * Math.PI * ratio0) ** 0.5;

              // 移動時のエフェクト（残像）
              if (!moveFlags[y - dys[moveDir]][x - dxs[moveDir]]) {
                const g2 = createG();
                {
                  const dd = 0.2;
                  const ddd = 0.1;
                  const rectArg = {x: x, y: y, width: 1, height: 1};
                  if (moveDir == dirs.ArrowUp || moveDir == dirs.ArrowDown) {
                    if (!flags[dirs.l]) rectArg.x += dd;
                    if (!flags[dirs.l]) rectArg.width -= dd;
                    if (!flags[dirs.r]) rectArg.width -= dd;
                    rectArg.y -= ddd;
                    rectArg.height += ddd * 2;
                  } else {
                    if (!flags[dirs.u]) rectArg.y += dd;
                    if (!flags[dirs.u]) rectArg.height -= dd;
                    if (!flags[dirs.d]) rectArg.height -= dd;
                    rectArg.x -= ddd;
                    rectArg.width += ddd * 2;
                  }

                  const rect = createRect(rectArg);
                  rect.setAttribute('fill', color.fill);
                  rect.setAttribute('fill-opacity', 0.5);
                  const dx = dxs[moveDir] * blockSize * ratio * (moveCount / inputInterval) ** 2;
                  const dy = dys[moveDir] * blockSize * ratio * (moveCount / inputInterval) ** 2;
                  rect.setAttribute('transform', `translate(${dx},${dy})`);
                  g2.appendChild(rect);
                }
                elems.svg.appendChild(g2);
              }

              const dx = dxs[moveDir] * blockSize * ratio;
              const dy = dys[moveDir] * blockSize * ratio;
              if (dx + dy != 0) {
                g.setAttribute('transform', `translate(${dx},${dy})`);
              }
            }
          }
          if (editMode ^ debugFlag) {
            const text = createText({x: x + 0.5, y: y + 0.05, text: stateToChar[state]});
            text.setAttribute('fill', colors[state].text);
            text.setAttribute('font-size', `${blockSize * 0.7}px`);
            text.setAttribute('font-weight', 'bold');
            g.appendChild(text);
          }
          elems.svg.appendChild(g);
        }
      }
    }

    // 点線
    {
      const dasharray = '1, 4';
      const g = createG();
      // 横線
      for (let y = 2; y < height - 1; ++y) {
        const line = createLine({x1: 1, y1: y, x2: width - 1, y2: y});
        line.setAttribute('stroke', colorLine);
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      // 縦線
      for (let x = 2; x < width - 1; ++x) {
        const line = createLine({x1: x, y1: 1, x2: x, y2: height - 1});
        line.setAttribute('stroke', colorLine);
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      elems.svg.appendChild(g);
    }
  }

  function isTarget(x) {
    return stateTargetMin <= x && x <= stateTargetMax;
  }

  function isOk(isX) {
    if (count(isX) == 0) return false;
    if (!isConnected(isX)) return false;
    if (!isPointSymmetry(isX)) return false;
    return true;

    // 図形が連結か否か。
    function isConnected(isX) {
      const statesTemp = new Array(height);
      for (let y = 0; y < height; ++y) {
        statesTemp[y] = states[y].slice();
      }
      let x0;
      let y0;
      loop: for (let y = upEnd; y <= downEnd; ++y) {
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

  function editSvg(e) {
    if (!editMode) return;

    const curXY = getCurXY(e);
    const x = curXY.x;
    const y = curXY.y;
    if (x < leftEnd || rightEnd < x) return;
    if (y < upEnd || downEnd < y) return;

    // 画面端付近はスワイプ操作できるように編集操作を無効にします。
    if (isTouchScreenNearEdge(e)) return;

    e.preventDefault();
    if (states[y][x] != drawingState) {
      states[y][x] = drawingState;
      draw();
      updateUrl();
    } else if (states[y][x] != stateNone) {
      states[y][x] = stateNone;
      draw();
      updateUrl();
    }
    return;

    // タッチ環境において、画面端付近か否か。
    function isTouchScreenNearEdge(e) {
      if (e.touches === undefined) return false;
      const x = e.touches[0].clientX;
      return x < 30; // 画面の左端付近ならtrue
    }

    // カーソル位置の座標を得る
    function getCurXY(e) {
      const cursorPos = getCursorPos(elems.svg, e);
      const x = Math.floor(cursorPos.x / blockSize);
      const y = Math.floor(cursorPos.y / blockSize);
      return {x: x, y: y};
    }
  }

  function showElem(elem) {
    if (elem === undefined) return;
    elem.style.display = 'block';
  }

  function hideElem(elem) {
    if (elem === undefined) return;
    elem.style.display = 'none';
  }

  class UndoInfo {
    constructor() {
      this.undoArray = [];
      this.undoIdx = 0;
    }
    pushData(data) {
      this.undoArray[this.undoIdx++] = data;
    }
    isUndoable() {
      return this.undoIdx != 0;
    }
    undo() {
      return this.undoArray[--this.undoIdx];
    }
    getIndex() {
      return this.undoIdx;
    }
    getReplayStr() {
      let replayStr = '';
      for (let i = 0; i < this.undoIdx; ++i) {
        replayStr += this.undoArray[i].dir;
      }
      return replayStr;
    }
  }
})();
