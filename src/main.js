(function() {
  'use strict';
  Object.freeze(showkoban);

  const versionText = 'v2022.11.07b';

  let settings = {
    autoMode: false,
    rotateNum: 0,
    mirrorFlag: false,
  };

  let debugFlag = false;
  let editMode = false;
  let autoStep;

  let levelId = null;
  let currentLevelObj;

  let undoInfo;
  let undoFlag = false;
  let undoCount = 0;

  let clearFlag = false;
  let clearStep = null;
  let bestRecord = null;
  let clearMessageFlag = false;

  let drawingState = showkoban.states.none;
  const editboxFunctions = {};

  let blockSize = 0;

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

  const level = showkoban.Level();
  const moveFlags = [];
  let moveFlag = false;
  let moveDir = dirs.neutral;

  let inputFlag = false;
  const intervalMsec = 35;
  const inputInterval = 5;
  const undoInterval = 6;
  let inputCountPrev = 0;
  let inputCount = inputInterval;
  let inputDir = dirs.neutral;
  const inputKeys = {};

  document.documentElement.style.setProperty('--animation-duration', `${inputInterval * intervalMsec}ms`);
  document.documentElement.style.setProperty('--animation-duration-shadow', `${inputInterval * intervalMsec * 2}ms`);
  document.documentElement.style.setProperty('--animation-duration-rotation', `${inputInterval * intervalMsec * 3}ms`);

  document.addEventListener('DOMContentLoaded', onload, false);
  return;
  // ==========================================================================

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
    showkoban.elems.stick.setAttribute('transform', transforms[dir]);
  }

  function move(dir) {
    const dx = dxs[dir];
    const dy = dys[dir];

    moveFlag = level.move(dx, dy, moveFlags);

    if (moveFlag) {
      document.documentElement.style.setProperty('--animation-transform', `translate(${dx * blockSize}px, ${dy * blockSize}px)`);
      showElem(showkoban.elems.undo);
      moveDir = dir;
      undoInfo.pushData({
        dir: dir,
        w: level.getW(),
        h: level.getH(),
        s: level.getStateStr(),
      });
    }
  }

  function clearCheck() {
    const center = level.getRotateCenter(showkoban.states.isTarget);
    clearFlag = center !== null;
    clearMessageFlag = clearFlag;
    if (clearFlag) {
      document.documentElement.style.setProperty('--animation-origin-rotation', `${blockSize * center.x}px ${blockSize * center.y}px`);
    }
  }

  // 盤面を更新
  function stateUpdate() {
    const statesTemp = level.copyStates();

    for (let y = level.upEnd; y <= level.downEnd; ++y) {
      for (let x = level.leftEnd; x <= level.rightEnd; ++x) {
        if (moveFlags[y][x]) {
          level.setState(x, y, showkoban.states.none);
        }
      }
    }
    for (let y = level.upEnd; y <= level.downEnd; ++y) {
      for (let x = level.leftEnd; x <= level.rightEnd; ++x) {
        const dx = dxs[moveDir];
        const dy = dys[moveDir];
        if (moveFlags[y - dy][x - dx]) {
          level.setState(x, y, statesTemp[y - dy][x - dx]);
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
    showkoban.elems.undo.classList.add('low-contrast');
    undoCount = undoInterval;
  }

  function undoEnd() {
    if (!undoFlag) return;
    undoFlag = false;
    showkoban.elems.undo.classList.remove('low-contrast');
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
    const cursorPos = getCursorPos(showkoban.elems.stickBase, e);
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
      if (e.key === 'T') {
        // 強制editモード (Shift + t)
        levelId = null;
        updateLevelVisibility();
        toggleEditLevel();
      } else {
        if (e.key === 'ArrowLeft') {
          gotoPrevLevel();
        } else if (e.key === 'ArrowRight') {
          gotoNextLevel();
        }
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      debugFlag = true;
      draw();
    } else if (e.key === 't') {
      if (levelId === null) {
        toggleEditLevel();
      }
    } else if (e.key === 'r') {
      resetLevel();
    } else if (e.key === 'z') {
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
    if (debugFlag && e.key === ' ') {
      debugFlag = false;
      draw();
    }
    delete inputKeys[e.key];
    if (Object.keys(inputKeys).length === 0) {
      updateController(dirs.neutral);
      inputFlag = false;
    }
    if (e.key === 'z') {
      undoEnd();
    }
    return false;
  }

  function resetLevel() {
    showkoban.elems.resetLevel.style.filter = 'contrast(60%)';
    showkoban.elems.svg.textContent = '';

    setTimeout(() => {
      showkoban.elems.resetLevel.style.filter = 'none';
      loadLevelObj(currentLevelObj, true);
    }, 50);
  }

  function resetDirs() {
    for (let y = 0; y < level.getHeight(); ++y) {
      moveFlags[y] = [];
      for (let x = 0; x < level.getWidth(); ++x) {
        moveFlags[y][x] = false;
      }
    }
    moveFlag = false;
  }

  function resetUndo() {
    undoInfo = showkoban.UndoInfo();
    hideElem(showkoban.elems.undo);
  }

  function applyObj(obj) {
    level.applyObj(obj);
    blockSize = 250 / level.getHeight();
    clearCheck();
    resetDirs();
    updateUrl();

    showkoban.elems.svg.setAttribute('width', blockSize * level.getWidth());
    showkoban.elems.svg.setAttribute('height', blockSize * level.getHeight());
    draw();
  }

  function execUndo() {
    if (undoInfo.isUndoable()) {
      const data = undoInfo.undo();
      applyObj(data);
    }

    if (undoInfo.getIndex() === 0) {
      resetUndo();
    }
  }

  function loadLevelById(id) {
    resetUndo();
    if (id < 1) id = 1;
    if (id > showkoban.levels.length) id = showkoban.levels.length;
    levelId = id;
    updateLevelVisibility();
    showkoban.elems.levelId.textContent = levelId;
    const levelObj = showkoban.levels[levelId - 1];

    loadLevelObj(levelObj);
  }

  function loadLevelObj(LevelObj, isReset = false) {
    if (!isReset) {
      if (settings.mirrorFlag) LevelObj = mirrorLevel(LevelObj);
      LevelObj = rotateLevel(LevelObj, settings.rotateNum);
    }
    currentLevelObj = LevelObj;

    applyObj(currentLevelObj);
    updateLevelVisibility();
    resetUndo();

    autoStep = 0;
    inputDir = dirs.neutral;
    inputCount = inputInterval;
    inputCountPrev = 0;

    // 左右反転する。
    function mirrorLevel(levelObj) {
      const w = levelObj.w;
      const h = levelObj.h;
      const stateStr = levelObj.s;
      const statesTemp = [];
      for (let y = 0; y < h; ++y) {
        statesTemp[y] = [];
        for (let x = 0; x < w; ++x) {
          statesTemp[y][x] = showkoban.states.none;
        }
      }

      let x = w - 1;
      let y = 0;
      for (const c of stateStr) {
        if (c === '-') {
          y++;
          if (y === h) break;
          x = w - 1;
        } else {
          if (x === -1) continue;
          statesTemp[y][x] = showkoban.states.charToState[c];
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
      const s = level.getStateStrSub(statesTemp, 0, w - 1, h - 1, 0);
      levelObj = {w: w, h: h, s: s, r: r};
      return levelObj;
    }

    // 時計回りに90度×num回 回転する。
    function rotateLevel(levelObj, rotateNum) {
      for (let i = 0; i < rotateNum; ++i) {
        const w = levelObj.h; // 90度回転後
        const h = levelObj.w; // 90度回転後
        const stateStr = levelObj.s;
        const statesTemp = [];
        for (let y = 0; y < h; ++y) {
          statesTemp[y] = [];
          for (let x = 0; x < w; ++x) {
            statesTemp[y][x] = showkoban.states.none;
          }
        }

        let x = w - 1;
        let y = 0;
        for (const c of stateStr) {
          if (c === '-') {
            x--;
            if (x < 0) break;
            y = 0;
          } else {
            if (y === h) continue;
            statesTemp[y][x] = showkoban.states.charToState[c];
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
        const s = level.getStateStrSub(statesTemp, 0, w - 1, h - 1, 0);
        levelObj = {w: w, h: h, s: s, r: r};
      }
      return levelObj;
    }
  }

  function updateLevelVisibility() {
    if (levelId === null) {
      hideElem(showkoban.elems.levelPrev);
      hideElem(showkoban.elems.levelId);
      hideElem(showkoban.elems.levelNext);
      showElem(showkoban.elems.editLevel);
    } else {
      (levelId === 1 ? hideElem : showElem)(showkoban.elems.levelPrev);
      showElem(showkoban.elems.levelId);
      (levelId === showkoban.levels.length ? hideElem : showElem)(showkoban.elems.levelNext);
      hideElem(showkoban.elems.editLevel);
    }
  }

  function gotoPrevLevel() {
    if (levelId === null) return;
    if (levelId > 1) {
      loadLevelById(levelId - 1);
    }
  }

  function gotoNextLevel() {
    if (levelId === null) return;
    if (levelId < showkoban.levels.length) {
      loadLevelById(levelId + 1);
    }
  }

  function updateUrl() {
    if (!editMode) return;
    const url = level.getUrlStr();
    showkoban.elems.url.innerHTML = `<a href="${url}">現在の盤面のURL</a>`;
  }

  function updateEditLevel() {
    if (editMode) {
      showElem(showkoban.elems.url);
      showElem(showkoban.elems.editbox);
    } else {
      hideElem(showkoban.elems.url);
      hideElem(showkoban.elems.editbox);
    }
    updateUrl();
  }

  function toggleEditLevel() {
    editMode = !editMode;
    updateEditLevel();
    draw();
  }

  function onload() {
    showkoban.initElems();
    showkoban.elems.versionInfo.textContent = versionText;

    const res = showkoban.analyzeUrl();
    settings = res.settings;
    if (res.levelObj.s === '') {
      levelId = 1;
      loadLevelById(levelId);
    } else {
      levelId = null;
      loadLevelObj(res.levelObj);
    }
    updateEditLevel();

    // editモード用
    {
      for (const char in showkoban.states.charToState) {
        const state = showkoban.states.charToState[char];
        const elem = document.getElementById(`edit_${char}`);
        if (elem === null) continue;
        const func = () => {
          showkoban.elems.editShape.setAttribute('fill', showkoban.colors[state].fill);
          showkoban.elems.editShape.setAttribute('stroke', showkoban.colors[state].stroke);
          showkoban.elems.editState.textContent = char;
          showkoban.elems.editState.setAttribute('fill', showkoban.colors[state].text);
          drawingState = state;
        };
        editboxFunctions[char] = func;
        elem.addEventListener('click', func, false);

        {
          const rect = showkoban.svg.createRect(30, {x: 0, y: 0, width: 1, height: 1});
          rect.setAttribute('fill', showkoban.colors[state].fill);
          rect.setAttribute('stroke', showkoban.colors[state].stroke);
          rect.setAttribute('stroke-width', 4);
          elem.appendChild(rect);
        }
        {
          const text = showkoban.svg.createText(30, {x: 0.5, y: 0, text: char});
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('font-size', '18px');
          text.setAttribute('fill', showkoban.colors[state].text);
          elem.appendChild(text);
        }
      }
      editboxFunctions[showkoban.states.stateToChar[showkoban.states.none]]();
    }

    {
      document.addEventListener('keydown', keydown, false);
      document.addEventListener('keyup', keyup, false);

      showkoban.elems.resetLevel.addEventListener('click', resetLevel, false);
      showkoban.elems.levelPrev.addEventListener('click', gotoPrevLevel, false);
      showkoban.elems.levelNext.addEventListener('click', gotoNextLevel, false);
      showkoban.elems.editLevel.addEventListener('click', toggleEditLevel, false);

      const touchDevice = document.ontouchstart !== undefined;
      const pointerdownEventName = touchDevice ? 'touchstart' : 'mousedown';
      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      const pointerupEventName = touchDevice ? 'touchend' : 'mouseup';

      showkoban.elems.svg.addEventListener(pointerdownEventName, editSvg, false);
      showkoban.elems.svg.oncontextmenu = function() {return !editMode;};

      showkoban.elems.stickBase.addEventListener(pointerdownEventName, pointerdown, false);
      showkoban.elems.stickBase.addEventListener(pointermoveEventName, pointermove, false);
      showkoban.elems.stickBase.addEventListener(pointerupEventName, pointerup, false);
      document.addEventListener(pointerupEventName, pointerup, false);

      showkoban.elems.undo.addEventListener(pointerdownEventName, undodown, false);
    }

    setInterval(() => {
      if (inputCount < inputCountPrev + inputInterval) {
        inputCount++;
      }
      if (settings.autoMode && currentLevelObj.r !== undefined && inputDir === dirs.neutral && autoStep < currentLevelObj.r.length) {
        inputDir = Number(currentLevelObj.r[autoStep]);
      }
      if (!moveFlag && (clearFlag || inputFlag || settings.autoMode)) {
        if (inputCount >= inputCountPrev + inputInterval) {
          if (clearFlag) {
            if (clearMessageFlag) {
              clearMessageFlag = false;
              draw();
            }
          } else if (inputDir !== dirs.neutral) {
            autoStep++;
            move(inputDir);
            inputCount = 0;
            inputCountPrev = 0;
          }
        }
        if (settings.autoMode) {
          inputDir = dirs.neutral;
        }
      }
      if (moveFlag) {
        moveFlag = false;
        draw();
        stateUpdate();
        clearCheck();
      }
      if (undoFlag) {
        if (undoCount === undoInterval) {
          undoCount = 0;
          execUndo();
        }
        undoCount++;
      }
    }, intervalMsec);
  }

  function drawFrame() {
    const paddingColor = clearFlag ? '#8f8' : '#753';

    const g = showkoban.svg.createG();

    {
      const rect = showkoban.svg.createRect(blockSize, {x: 0, y: 0, width: level.getWidth(), height: 1});
      rect.setAttribute('fill', paddingColor);
      g.appendChild(rect);
    }
    {
      const rect = showkoban.svg.createRect(blockSize, {x: 0, y: 0, width: 1, height: level.getHeight()});
      rect.setAttribute('fill', paddingColor);
      g.appendChild(rect);
    }
    {
      const rect = showkoban.svg.createRect(blockSize, {x: 0, y: level.getHeight() - 1, width: level.getWidth(), height: 1});
      rect.setAttribute('fill', paddingColor);
      g.appendChild(rect);
    }
    {
      const rect = showkoban.svg.createRect(blockSize, {x: level.getWidth() - 1, y: 0, width: 1, height: level.getHeight()});
      rect.setAttribute('fill', paddingColor);
      g.appendChild(rect);
    }

    // クリアメッセージ
    if (clearFlag) {
      const text = showkoban.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: level.getHeight() - 1, text: 'CLEAR'});
      text.setAttribute('font-size', `${blockSize * 0.8}px`);
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', 'blue');
      g.appendChild(text);
      if (undoInfo) {
        clearStep = undoInfo.getIndex();
        const w = currentLevelObj.w;
        const h = currentLevelObj.h;
        const s = currentLevelObj.s;
        const replayStr = undoInfo.getReplayStr();
        console.log(`{w: ${w}, h: ${h}, s: '${s}', r: '${replayStr}'},`);
        const r = currentLevelObj.r;
        if (levelId === null || r === undefined) {
          console.warn('過去最高記録の情報がありません！');
          bestRecord = null;
        } else {
          bestRecord = r.length;
          if (clearStep < bestRecord) {
            console.log(`新記録!\n${bestRecord} → ${clearStep} (${clearStep - bestRecord} 手)`);
          } else {
            console.log(`過去最高記録は ${bestRecord} 手です。\n(差: ${clearStep - bestRecord} 手)`);
            if (replayStr === r) {
              console.log('(完全に同じ手順です。)');
            }
          }
        }
      }

      {
        const text = showkoban.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: 0, text: `${clearStep} steps`});
        text.setAttribute('font-size', `${blockSize * 0.6}px`);
        if (bestRecord === null) {
          text.setAttribute('fill', 'black');
          text.setAttribute('font-weight', 'bold');
        } else if (clearStep > bestRecord) {
          text.setAttribute('fill', 'green');
        } else if (clearStep === bestRecord) {
          text.setAttribute('fill', 'orange');
          text.setAttribute('font-weight', 'bold');
        } else {
          text.setAttribute('fill', 'red');
          text.setAttribute('font-weight', 'bold');
        }
        g.appendChild(text);
      }
      if (settings.autoMode) {
        setTimeout(gotoNextLevel, 1000);
      }
    }

    showkoban.elems.svg.appendChild(g);
  }

  function createBackground() {
    const g = showkoban.svg.createG();
    const rect = showkoban.svg.createRect(blockSize, {x: 1, y: 1, width: level.getWidth() - 2, height: level.getHeight() - 2});
    rect.setAttribute('fill', 'white');
    g.appendChild(rect);
    return g;
  }

  // 描画
  function draw() {
    showkoban.elems.svg.textContent = '';

    // 背景
    {
      const g = showkoban.svg.createG();
      g.appendChild(createBackground());
      showkoban.elems.svg.appendChild(g);
    }

    const paddingWidth = 0.12;
    const paddingWidthHalf = paddingWidth / 2;

    // ターゲット以外を作成し、追加する。（描画順のためにターゲットは後で追加します。）
    for (let y = 1; y < level.getHeight() - 1; ++y) {
      for (let x = 1; x < level.getWidth() - 1; ++x) {
        const state = level.getState(x, y);
        if (state === showkoban.states.none) continue;
        if (showkoban.states.isTarget(state)) continue;
        const g = createBlock(x, y, state);
        showkoban.elems.svg.appendChild(g);
      }
    }

    // ターゲットを作成し、追加する。
    for (let y = 1; y < level.getHeight() - 1; ++y) {
      for (let x = 1; x < level.getWidth() - 1; ++x) {
        const state = level.getState(x, y);
        if (!showkoban.states.isTarget(state)) continue;
        const g = createBlock(x, y, state);
        showkoban.elems.svg.appendChild(g);
      }
    }

    // 点線
    {
      const dasharray = '1, 4';
      const g = showkoban.svg.createG();
      // 横線
      for (let y = 2; y < level.getHeight() - 1; ++y) {
        const line = showkoban.svg.createLine(blockSize, {x1: 1, y1: y, x2: level.getWidth() - 1, y2: y});
        line.setAttribute('stroke', showkoban.colors.line);
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      // 縦線
      for (let x = 2; x < level.getWidth() - 1; ++x) {
        const line = showkoban.svg.createLine(blockSize, {x1: x, y1: 1, x2: x, y2: level.getHeight() - 1});
        line.setAttribute('stroke', showkoban.colors.line);
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      showkoban.elems.svg.appendChild(g);
    }
    drawFrame();

    function createBlock(x, y, state) {
      const g = showkoban.svg.createG();
      const color = showkoban.colors[state];
      {
        const eps = 0.01; // サイズを少し大きくすることで、隙間をなくします。
        const rect = showkoban.svg.createRect(blockSize, {x: x - eps, y: y - eps, width: 1 + eps * 2, height: 1 + eps * 2});
        rect.setAttribute('fill', color.fill);
        g.appendChild(rect);
      }
      {
        const flags = [];
        for (let dir = 0; dir < 8; ++dir) {
          flags[dir] = level.getState(x + dxs[dir], y + dys[dir]) === state;
        }
        // 上側
        if (!flags[dirs.u]) {
          const line = showkoban.svg.createLine(blockSize, {x1: x, y1: y + paddingWidthHalf, x2: x + 1, y2: y + paddingWidthHalf});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', paddingWidth * blockSize);
          g.appendChild(line);
        }
        // 右側
        if (!flags[dirs.r]) {
          const line = showkoban.svg.createLine(blockSize, {x1: x + 1 - paddingWidthHalf, y1: y, x2: x + 1 - paddingWidthHalf, y2: y + 1});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', paddingWidth * blockSize);
          g.appendChild(line);
        }
        // 下側
        if (!flags[dirs.d]) {
          const line = showkoban.svg.createLine(blockSize, {x1: x, y1: y + 1 - paddingWidthHalf, x2: x + 1, y2: y + 1 - paddingWidthHalf});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', paddingWidth * blockSize);
          g.appendChild(line);
        }
        // 左側
        if (!flags[dirs.l]) {
          const line = showkoban.svg.createLine(blockSize, {x1: x + paddingWidthHalf, y1: y, x2: x + paddingWidthHalf, y2: y + 1});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', paddingWidth * blockSize);
          g.appendChild(line);
        }
        // 右上
        if (flags[dirs.u] && flags[dirs.r] && !flags[dirs.ur]) {
          const rect = showkoban.svg.createRect(blockSize, {x: x + 1 - paddingWidth, y: y, width: paddingWidth, height: paddingWidth});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
        // 右下
        if (flags[dirs.d] && flags[dirs.r] && !flags[dirs.dr]) {
          const rect = showkoban.svg.createRect(blockSize, {x: x + 1 - paddingWidth, y: y + 1 - paddingWidth, width: paddingWidth, height: paddingWidth});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
        // 左下
        if (flags[dirs.d] && flags[dirs.l] && !flags[dirs.dl]) {
          const rect = showkoban.svg.createRect(blockSize, {x: x, y: y + 1 - paddingWidth, width: paddingWidth, height: paddingWidth});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }
        // 左上
        if (flags[dirs.u] && flags[dirs.l] && !flags[dirs.ul]) {
          const rect = showkoban.svg.createRect(blockSize, {x: x, y: y, width: paddingWidth, height: paddingWidth});
          rect.setAttribute('fill', color.stroke);
          g.appendChild(rect);
        }

        if (showkoban.states.userMin <= state && state <= showkoban.states.userMax) {
          const size = 0.35;
          // 右上
          if (!flags[dirs.u] && !flags[dirs.r]) {
            const polygon = showkoban.svg.createPolygon(blockSize, {
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
            const polygon = showkoban.svg.createPolygon(blockSize, {
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
            const polygon = showkoban.svg.createPolygon(blockSize, {
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
            const polygon = showkoban.svg.createPolygon(blockSize, {
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
        if (clearFlag) {
          if (showkoban.states.isTarget(state)) {
            g.classList.add('animation-rotation');
          }
        }
        // 移動モーション
        if (moveFlags[y][x]) {
          const dx = dxs[moveDir];
          const dy = dys[moveDir];
          g.classList.add('animation-block');

          // 移動時のエフェクト（残像）
          if (!moveFlags[y - dys[moveDir]][x - dxs[moveDir]]) {
            const g2 = showkoban.svg.createG();
            {
              const dd = 0.2;
              const ddd = 0.15;
              const rectArg = {x: x, y: y, width: 1, height: 1};
              if (moveDir === dirs.ArrowUp || moveDir === dirs.ArrowDown) {
                if (!flags[dirs.l]) rectArg.x += dd;
                if (!flags[dirs.l]) rectArg.width -= dd;
                if (!flags[dirs.r]) rectArg.width -= dd;
                rectArg.height -= ddd;
                if (moveDir === dirs.ArrowDown) {
                  rectArg.y += ddd;
                }
              } else {
                if (!flags[dirs.u]) rectArg.y += dd;
                if (!flags[dirs.u]) rectArg.height -= dd;
                if (!flags[dirs.d]) rectArg.height -= dd;
                rectArg.width -= ddd;
                if (moveDir === dirs.ArrowRight) {
                  rectArg.x += ddd;
                }
              }

              const rect = window.showkoban.svg.createRect(blockSize, rectArg);
              rect.setAttribute('fill', color.fill);
              rect.setAttribute('fill-opacity', 1);
              rect.setAttribute('transform', `translate(${dx},${dy})`);
              g2.appendChild(rect);
            }
            showkoban.elems.svg.appendChild(g2);
            g2.classList.add('animation-shadow');
          }
        }
      }
      if (editMode ^ debugFlag) {
        const text = showkoban.svg.createText(blockSize, {x: x + 0.5, y: y, text: showkoban.states.stateToChar[state]});
        text.setAttribute('fill', showkoban.colors[state].text);
        text.setAttribute('font-size', `${blockSize * 0.7}px`);
        text.setAttribute('font-weight', 'bold');
        g.appendChild(text);
      }
      return g;
    }
  }

  function editSvg(e) {
    if (!editMode) return;

    const curXY = getCurXY(e);
    const x = curXY.x;
    const y = curXY.y;
    if (!level.isInside(x, y)) return;

    // 画面端付近はスワイプ操作できるように編集操作を無効にします。
    if (isTouchScreenNearEdge(e)) return;

    e.preventDefault();
    if ((e.button === 0 || e.button === undefined) && level.getState(x, y) !== drawingState) {
      level.setState(x, y, drawingState);
      clearCheck();
      draw();
      updateUrl();
    } else if (level.getState(x, y) !== showkoban.states.none) {
      if (e.button !== 0) {
        level.setState(x, y, showkoban.states.none);
        clearCheck();
        draw();
        updateUrl();
      }
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
      const cursorPos = getCursorPos(showkoban.elems.svg, e);
      const x = Math.floor(cursorPos.x / blockSize);
      const y = Math.floor(cursorPos.y / blockSize);
      return {x: x, y: y};
    }
  }

  function showElem(elem) {
    if (elem === undefined) return;
    elem.classList.remove('hide');
  }

  function hideElem(elem) {
    if (elem === undefined) return;
    elem.classList.add('hide');
  }
})();
