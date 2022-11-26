(function() {
  'use strict';
  Object.freeze(app);

  const VERSION_TEXT = 'v2022.11.26';

  const savedata = app.savedata();

  const dirs = {
    neutral: 'N',
    ArrowUp: '0',
    ArrowRight: '1',
    ArrowDown: '2',
    ArrowLeft: '3',
  };

  const dys = [-1, 0, 1, 0];
  const dxs = [0, 1, 0, -1];

  let inputFlag = false;
  const INPUT_INTERVAL_MSEC = 35;
  const INPUT_INTERVAL_COUNT = 5;
  const UNDO_INTERVAL_COUNT = 5;
  let inputCount = INPUT_INTERVAL_COUNT;
  let inputDir = dirs.neutral;
  const inputKeys = {};

  let settings = {
    autoMode: false,
    debugFlag: false,
    mirrorFlag: false,
    rotateNum: 0,
  };

  const settingsAuto = {
    paused: false,
    interval: INPUT_INTERVAL_COUNT,
    INTERVAL_MIN: 1,
    INTERVAL_MAX: INPUT_INTERVAL_COUNT * 3,
  };

  let editMode = false;
  let temporaryShowCharsFlag = false;

  let levelId = null;

  let undoInfo = app.UndoInfo();
  let undoFlag = false;
  let undoCount = 0;
  let nextLevelTimerId = null;
  const AUTO_NEXT_LEVEL_DELAY = 1000;
  const RESET_DELAY = 50;

  let clearFlag = false;
  let redrawFlag = false;

  let drawingState = app.states.none;
  const editboxFunctions = {};

  let blockSize = 0;

  const level = app.Level();

  document.documentElement.style.setProperty('--animation-duration', `${INPUT_INTERVAL_COUNT * INPUT_INTERVAL_MSEC}ms`);
  document.documentElement.style.setProperty('--animation-duration-shadow', `${INPUT_INTERVAL_COUNT * INPUT_INTERVAL_MSEC * 2}ms`);
  document.documentElement.style.setProperty('--animation-duration-rotation', `${INPUT_INTERVAL_COUNT * INPUT_INTERVAL_MSEC * 3}ms`);

  document.addEventListener('DOMContentLoaded', onload, false);
  return;
  // ==========================================================================

  function updateController(dir) {
    const transforms = {
      'N': '',
      '0': 'rotateX(45deg)',
      '1': 'rotateY(45deg)',
      '2': 'rotateX(-45deg)',
      '3': 'rotateY(-45deg)',
    };
    app.elems.stick.style.setProperty('transform', transforms[dir]);
  }

  function move(dir) {
    const dx = dxs[dir];
    const dy = dys[dir];

    const moveFlag = level.updateMoveFlags(dx, dy);
    if (moveFlag) {
      document.documentElement.style.setProperty('--animation-transform', `translate(${-dx * blockSize}px, ${-dy * blockSize}px)`);
      addUndo(dir);
      level.move();
    }
    return moveFlag;
  }

  function clearCheck() {
    const center = level.getRotateCenter(app.states.isTarget);
    clearFlag = center !== null;
    redrawFlag = clearFlag;
    if (clearFlag) {
      document.documentElement.style.setProperty('--animation-origin-rotation', `${blockSize * center.x}px ${blockSize * center.y}px`);
    }
  }

  function undoStart() {
    if (undoFlag) return;
    undoFlag = true;
    clearTimeout(nextLevelTimerId);
    app.elems.undo.classList.add('low-contrast');
    undoCount = UNDO_INTERVAL_COUNT;
  }

  function undoEnd() {
    if (!undoFlag) return;
    undoFlag = false;
    app.elems.undo.classList.remove('low-contrast');
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
    if (!inputFlag || settings.autoMode) return;
    const cursorPos = getCursorPos(app.elems.stickBase, e);
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
      if (e.key === 'ArrowLeft') {
        gotoPrevLevel();
      } else if (e.key === 'ArrowRight') {
        gotoNextLevel();
      }
    } else if (e.key === ' ') {
      if (!temporaryShowCharsFlag) {
        e.preventDefault();
        temporaryShowCharsFlag = true;
        draw();
      }
    } else if (e.key === '@') {
      levelId = null;
      updateLevelVisibility();
      toggleEditLevel();
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
    if (temporaryShowCharsFlag && e.key === ' ') {
      temporaryShowCharsFlag = false;
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
    clearTimeout(nextLevelTimerId);

    app.elems.level.reset.classList.add('low-contrast');
    app.elems.svg.textContent = '';

    setTimeout(() => {
      app.elems.level.reset.classList.remove('low-contrast');
      loadLevelObj(level.getLevelObj(), true);
    }, RESET_DELAY);
  }

  function resetUndo() {
    undoInfo = app.UndoInfo();
    hideElem(app.elems.undo);
  }

  function applyObj(obj, isInit = false) {
    level.applyObj(obj, isInit);
    const svgMaxWidth = 480;
    const svgMaxHeight = 250;
    blockSize = Math.min(svgMaxWidth / level.getWidth(), svgMaxHeight / level.getHeight());
    clearCheck();
    updateUrl();

    app.elems.svg.setAttribute('width', blockSize * level.getWidth());
    app.elems.svg.setAttribute('height', blockSize * level.getHeight());
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
    clearTimeout(nextLevelTimerId);
    id = Number(id);
    resetUndo();
    if (id < 1) id = 1;
    if (id > app.levels.length) id = app.levels.length;
    levelId = id;
    updateLevelVisibility();
    app.elems.level.id.textContent = levelId;
    const levelObj = app.levels[levelId - 1];
    console.log(`[LEVEL-${id}]${levelObj.ja !== undefined ? ` ${levelObj.ja}` : ''}`);

    replaceUrl();
    loadLevelObj(levelObj);
  }

  function loadLevelObj(LevelObj, isReset = false) {
    if (!isReset) {
      if (settings.mirrorFlag) LevelObj = mirrorLevel(LevelObj);
      LevelObj = rotateLevel(LevelObj, settings.rotateNum);
    }

    resetUndo();
    applyObj(LevelObj, true);
    updateLevelVisibility();

    inputDir = dirs.neutral;
    inputCount = INPUT_INTERVAL_COUNT;

    // 左右反転する。
    function mirrorLevel(levelObj) {
      const w = levelObj.w;
      const h = levelObj.h;
      const stateStr = levelObj.s;
      const statesTemp = [];
      for (let y = 0; y < h; ++y) {
        statesTemp[y] = [];
        for (let x = 0; x < w; ++x) {
          statesTemp[y][x] = app.states.none;
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
          statesTemp[y][x] = app.states.charToState[c];
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
            statesTemp[y][x] = app.states.none;
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
            statesTemp[y][x] = app.states.charToState[c];
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
      hideElem(app.elems.level.prev);
      hideElem(app.elems.level.id);
      hideElem(app.elems.level.next);
      showElem(app.elems.level.edit);
    } else {
      (levelId === 1 ? hideElem : showElem)(app.elems.level.prev);
      showElem(app.elems.level.id);
      (levelId === app.levels.length ? hideElem : showElem)(app.elems.level.next);
      hideElem(app.elems.level.edit);
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
    if (levelId < app.levels.length) {
      loadLevelById(levelId + 1);
    }
  }

  function updateUrl() {
    if (!editMode) return;
    const url = level.getUrlStr();
    app.elems.url.innerHTML = `<a href="${url}">現在の盤面のURL</a>`;
  }

  function updateEditLevel() {
    if (editMode) {
      showElem(app.elems.url);
      showElem(app.elems.edit.editbox);
    } else {
      hideElem(app.elems.url);
      hideElem(app.elems.edit.editbox);
    }
    updateUrl();
  }

  function toggleEditLevel() {
    editMode = !editMode;
    updateEditLevel();
    draw();
  }

  function showHelpDialog() {
    app.elems.help.dialog.showModal();
  }

  function closeHelpDialog() {
    app.elems.help.dialog.close();
  }

  function applyLang(lang) {
    for (const elem of document.getElementsByClassName('setting-lang-button')) {
      elem.classList.remove('active');
    }
    const langButton = document.getElementById(`setting-lang-${lang}`);
    langButton.classList.add('active');
    for (const elem of document.getElementsByClassName('translatable')) {
      elem.classList.add('hidden');
    }
    for (const elem of document.getElementsByClassName(`translatable ${lang}`)) {
      elem.classList.remove('hidden');
    }
  }

  function selectLang(e, lang) {
    applyLang(lang);
    e.stopPropagation();
    savedata.saveLang(lang);
  }

  function showLevelsDialog() {
    app.elems.levels.dialogSvg.innerHTML = '';
    const HEIGHT = 90;
    const WIDTH = 90;
    const COLS = 5;
    const MARGIN = 20;
    app.elems.levels.dialogSvg.style.setProperty('height', `${HEIGHT * Math.ceil(app.levels.length / COLS)}px`);

    let id = 0;
    for (const levelObj of app.levels) {
      const blockSize = 5;
      id++;
      const g = app.svg.createG();
      g.classList.add('level-select');
      const level = app.Level();
      level.applyObj(levelObj, true);
      const levelSvg = level.createSvg(blockSize);
      g.appendChild(levelSvg);
      {
        const text = app.svg.createText(blockSize, {x: -0.1, y: -0.8, text: id});
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-size', '16px');
        g.appendChild(text);
      }
      {
        const highestScore = savedata.getHighestScore(levelObj);
        const bestStep = level.getBestStep();
        if (highestScore !== null) {
          const rect = app.svg.createRect(blockSize, {x: -1.5, y: 1.5, width: 2, height: 2});
          const color = getStepColor(highestScore, bestStep);
          rect.setAttribute('fill', color);
          g.appendChild(rect);
        }
      }
      const x = ((id - 1) % COLS) * WIDTH + MARGIN;
      const y = Math.floor((id - 1) / COLS) * HEIGHT + MARGIN;
      g.setAttribute('transform', `translate(${x},${y})`);
      g.setAttribute('data-id', id);
      g.addEventListener('click', function() {
        const id = Number(g.getAttribute('data-id'));
        loadLevelById(id);
        closeLevelsDialog();
      }, false);
      app.elems.levels.dialogSvg.appendChild(g);
    }
    app.elems.levels.dialog.showModal();
  }

  function closeLevelsDialog() {
    app.elems.levels.dialog.close();
  }

  function onload() {
    app.elems.init();
    app.elems.version.textContent = VERSION_TEXT;
    applyLang(savedata.loadLang());

    const queryParams = app.analyzeUrl();
    settings = queryParams.settings;
    if (settings.autoMode) {
      showElem(app.elems.auto.buttons);
      app.elems.auto.buttonStop.addEventListener('click', onButtonStop);
      app.elems.auto.buttonStart.addEventListener('click', onButtonStart);
      app.elems.auto.buttonPause.addEventListener('click', onButtonPause);
      app.elems.auto.buttonSpeedDown.addEventListener('click', onButtonSpeedDown);
      app.elems.auto.buttonSpeedUp.addEventListener('click', onButtonSpeedUp);
    }
    if (queryParams.levelObj.s === '') {
      levelId = queryParams.id === null ? 1 : queryParams.id;
      loadLevelById(levelId);
    } else {
      levelId = null;
      loadLevelObj(queryParams.levelObj);
    }
    updateEditLevel();

    // editモード用
    {
      for (const char in app.states.charToState) {
        const state = app.states.charToState[char];
        const elem = document.getElementById(`edit_${char}`);
        if (elem === null) continue;
        const func = () => {
          app.elems.edit.editShape.setAttribute('fill', app.colors[state].fill);
          app.elems.edit.editShape.setAttribute('stroke', app.colors[state].stroke);
          app.elems.edit.editState.textContent = char;
          app.elems.edit.editState.setAttribute('fill', app.colors[state].text);
          drawingState = state;
        };
        editboxFunctions[char] = func;
        elem.addEventListener('click', func, false);

        {
          const rect = app.svg.createRect(30, {x: 0, y: 0, width: 1, height: 1});
          rect.setAttribute('fill', app.colors[state].fill);
          rect.setAttribute('stroke', app.colors[state].stroke);
          rect.setAttribute('stroke-width', 4);
          elem.appendChild(rect);
        }
        {
          const text = app.svg.createText(30, {x: 0.5, y: 0, text: char});
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('font-size', '18px');
          text.setAttribute('fill', app.colors[state].text);
          elem.appendChild(text);
        }
      }
      editboxFunctions[app.states.stateToChar[app.states.none]]();

      app.elems.edit.wDec.addEventListener('click', () => resize(-1, 0), false);
      app.elems.edit.wInc.addEventListener('click', () => resize(1, 0), false);
      app.elems.edit.hDec.addEventListener('click', () => resize(0, -1), false);
      app.elems.edit.hInc.addEventListener('click', () => resize(0, 1), false);
    }

    {
      const touchDevice = document.ontouchstart !== undefined;
      const pointerdownEventName = touchDevice ? 'touchstart' : 'mousedown';
      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      const pointerupEventName = touchDevice ? 'touchend' : 'mouseup';

      document.addEventListener('keydown', keydown, false);
      document.addEventListener('keyup', keyup, false);

      app.elems.help.dialogDiv.addEventListener('click', (e) => e.stopPropagation(), false);
      app.elems.help.button.addEventListener('click', showHelpDialog, false);
      app.elems.help.dialog.addEventListener('click', closeHelpDialog, false);
      app.elems.help.langEn.addEventListener('click', (e) => selectLang(e, 'en'), false);
      app.elems.help.langJa.addEventListener('click', (e) => selectLang(e, 'ja'), false);

      app.elems.level.reset.addEventListener('click', resetLevel, false);
      app.elems.level.prev.addEventListener('click', gotoPrevLevel, false);
      app.elems.level.next.addEventListener('click', gotoNextLevel, false);
      app.elems.level.edit.addEventListener('click', toggleEditLevel, false);
      app.elems.levels.button.addEventListener('click', showLevelsDialog, false);
      app.elems.levels.dialog.addEventListener('click', closeLevelsDialog, false);
      app.elems.levels.dialogDiv.addEventListener('click', (e) => e.stopPropagation(), false);

      app.elems.svg.addEventListener(pointerdownEventName, editSvg, false);
      app.elems.svg.oncontextmenu = function() {return !editMode;};

      app.elems.stickBase.addEventListener(pointerdownEventName, pointerdown, false);
      app.elems.stickBase.addEventListener(pointermoveEventName, pointermove, false);
      app.elems.stickBase.addEventListener(pointerupEventName, pointerup, false);
      document.addEventListener(pointerupEventName, pointerup, false);

      app.elems.undo.addEventListener(pointerdownEventName, undodown, false);
    }

    setInterval(() => {
      if (undoFlag) {
        if (undoCount === UNDO_INTERVAL_COUNT) {
          undoCount = 0;
          execUndo();
        }
        undoCount++;
        return;
      }
      const r = level.getLevelObj()?.r;
      if (!editMode && settings.autoMode && r !== undefined) {
        if (settingsAuto.paused) {
          inputFlag = false;
        } else {
          inputDir = Number(r[undoInfo.getIndex()]);
          inputFlag = true;
        }
      }
      if (inputCount >= (settings.autoMode ? settingsAuto.interval : INPUT_INTERVAL_COUNT)) {
        if (clearFlag) {
          if (redrawFlag) {
            redrawFlag = false;
            draw(true);
          }
        } else if (inputFlag) {
          if (inputDir !== dirs.neutral) {
            if (settings.autoMode) {
              updateController(inputDir);
            }
            inputCount = 0;
            const moveFlag = move(inputDir);
            if (moveFlag) {
              draw();
              clearCheck();
              updateUrl();
            }
          }
        }
      } else {
        inputCount++;
      }
    }, INPUT_INTERVAL_MSEC);
  }

  // 描画
  function draw(rotateFlag = false) {
    rotateFlag &&= clearFlag;
    app.elems.svg.textContent = '';

    {
      const showCharsFlag = editMode || settings.debugFlag || temporaryShowCharsFlag;
      const levelSvg = level.createSvg(blockSize, rotateFlag, showCharsFlag);
      app.elems.svg.appendChild(levelSvg);
    }
    level.resetMoveFlags();

    // 点線
    {
      const dasharray = '1, 4';
      const g = app.svg.createG();
      // 横線
      for (let y = 2; y < level.getHeight() - 1; ++y) {
        const line = app.svg.createLine(blockSize, {x1: 1, y1: y, x2: level.getWidth() - 1, y2: y});
        line.setAttribute('stroke', app.colors.line);
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      // 縦線
      for (let x = 2; x < level.getWidth() - 1; ++x) {
        const line = app.svg.createLine(blockSize, {x1: x, y1: 1, x2: x, y2: level.getHeight() - 1});
        line.setAttribute('stroke', app.colors.line);
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      app.elems.svg.appendChild(g);
    }
    drawFrame();
  }

  function drawFrame() {
    const paddingColor = clearFlag ? '#8f8' : '#753';

    const g = app.svg.createG();

    {
      const rect = app.svg.createRect(blockSize, {x: 0, y: 0, width: level.getWidth(), height: 1});
      rect.setAttribute('fill', paddingColor);
      g.appendChild(rect);
    }
    {
      const rect = app.svg.createRect(blockSize, {x: 0, y: 0, width: 1, height: level.getHeight()});
      rect.setAttribute('fill', paddingColor);
      g.appendChild(rect);
    }
    {
      const rect = app.svg.createRect(blockSize, {x: 0, y: level.getHeight() - 1, width: level.getWidth(), height: 1});
      rect.setAttribute('fill', paddingColor);
      g.appendChild(rect);
    }
    {
      const rect = app.svg.createRect(blockSize, {x: level.getWidth() - 1, y: 0, width: 1, height: level.getHeight()});
      rect.setAttribute('fill', paddingColor);
      g.appendChild(rect);
    }

    const bestStep = level.getBestStep();
    // クリアメッセージ
    if (clearFlag) {
      const text = app.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: level.getHeight() - 1, text: 'CLEAR'});
      text.setAttribute('font-size', `${blockSize * 0.8}px`);
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', 'blue');
      g.appendChild(text);
      const clearStep = undoInfo.getIndex();
      {
        const levelObj = level.getLevelObj();
        const w = levelObj.w;
        const h = levelObj.h;
        const s = levelObj.s;
        const r = levelObj.r;
        const replayStr = undoInfo.getReplayStr();
        if (bestStep !== undefined) {
          savedata.saveSteps(levelObj, replayStr);
        }
        const levelObjStr = `{w: ${w}, h: ${h}, s: '${s}', r: '${replayStr}', ja: '${levelObj.ja}'},`;
        console.log(levelObjStr);
        if (r === undefined) {
          console.warn('過去最高記録の情報がありません！');
        } else if (clearStep < bestStep) {
          console.log(`新記録!\n${bestStep} → ${clearStep} (${clearStep - bestStep} 手)`);
        } else {
          console.log(`過去最高記録は ${bestStep} 手です。\n(差: ${clearStep - bestStep} 手)`);
          if (replayStr === r) {
            console.log('(完全に同じ手順です。)');
          }
        }
      }

      {
        const text = app.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: 0, text: `${clearStep} steps`});
        text.setAttribute('font-size', `${blockSize * 0.7}px`);
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', getStepColor(clearStep, bestStep));
        g.appendChild(text);
      }
      if (settings.autoMode) {
        nextLevelTimerId = setTimeout(gotoNextLevel, AUTO_NEXT_LEVEL_DELAY);
      }
    } else {
      const text = app.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: level.getHeight() - 1, text: `${undoInfo.getIndex()} steps`});
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', 'white');
      g.appendChild(text);
    }

    // 自己最高記録
    if (levelId !== null && !clearFlag) {
      const levelObj = level.getLevelObj();
      const highestScore = savedata.getHighestScore(levelObj);
      if (highestScore !== null) {
        const text = app.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: 0, text: `${highestScore}`});
        text.setAttribute('font-size', `${blockSize * 0.7}px`);
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', getStepColor(highestScore, bestStep));
        g.appendChild(text);
      }
    }

    app.elems.svg.appendChild(g);
  }

  function getStepColor(step, bestStep) {
    if (bestStep === undefined) {
      return app.colors.stepUnknown;
    } else if (step > bestStep) {
      return app.colors.stepLose;
    } else if (step === bestStep) {
      return app.colors.stepDraw;
    } else {
      return app.colors.stepWin;
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
      addUndo(null);
      level.setState(x, y, drawingState);
      level.removeR();
      clearCheck();
      updateUrl();
      draw();
    } else if (level.getState(x, y) !== app.states.none) {
      if (e.button !== 0) {
        addUndo(null);
        level.setState(x, y, app.states.none);
        level.removeR();
        clearCheck();
        updateUrl();
        draw();
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
      const cursorPos = getCursorPos(app.elems.svg, e);
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

  function resize(dx, dy) {
    const w = level.getW() + dx;
    const h = level.getH() + dy;
    const s = level.getStateStr();
    if (w < 1) return;
    if (h < 1) return;
    const obj = {w, h, s};
    addUndo(null);
    applyObj(obj);
    level.removeR();
  }

  function addUndo(dir) {
    showElem(app.elems.undo);
    undoInfo.pushData({
      dir: dir,
      w: level.getW(),
      h: level.getH(),
      s: level.getStateStr(),
    });
  }

  function replaceUrl() {
    const base = location.href.split('?')[0];
    let url = `${base}?id=${levelId}`;
    if (settings.autoMode) url += '&auto';
    if (settings.mirrorFlag) url += '&mirror';
    if (settings.rotateNum !== 0) url += `&rotate=${settings.rotateNum}`;
    history.replaceState(null, '', url);
  }

  function updateButtonSpeedDisplay() {
    (settingsAuto.interval === settingsAuto.INTERVAL_MAX ? hideElem : showElem)(app.elems.auto.buttonSpeedDown);
    (settingsAuto.interval === 1 ? hideElem : showElem)(app.elems.auto.buttonSpeedUp);
  }

  function onButtonStop() {
    settings.autoMode = false;
    hideElem(app.elems.auto.buttons);
    replaceUrl();
  }

  function onButtonStart() {
    settingsAuto.paused = false;
    hideElem(app.elems.auto.buttonStart);
    showElem(app.elems.auto.buttonPause);
    updateButtonSpeedDisplay();
  }

  function onButtonPause() {
    settingsAuto.paused = true;
    showElem(app.elems.auto.buttonStart);
    hideElem(app.elems.auto.buttonPause);
    hideElem(app.elems.auto.buttonSpeedDown);
    hideElem(app.elems.auto.buttonSpeedUp);
  }

  function onButtonSpeedDown() {
    showElem(app.elems.auto.buttonSpeedUp);
    settingsAuto.interval += 2;
    if (settingsAuto.interval >= settingsAuto.INTERVAL_MAX) {
      settingsAuto.interval = settingsAuto.INTERVAL_MAX;
    }
    updateButtonSpeedDisplay();
  }

  function onButtonSpeedUp() {
    showElem(app.elems.auto.buttonSpeedDown);
    settingsAuto.interval -= 2;
    if (settingsAuto.interval <= settingsAuto.INTERVAL_MIN) {
      settingsAuto.interval = settingsAuto.INTERVAL_MIN;
    }
    updateButtonSpeedDisplay();
  }
})();
