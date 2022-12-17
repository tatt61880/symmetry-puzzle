(function() {
  'use strict';
  const app = window.app;
  Object.freeze(app);

  const VERSION_TEXT = 'v2022.12.15';

  const savedata = app.savedata();

  const dirs = {
    neutral: 'N',
    ArrowUp: '0',
    ArrowRight: '1',
    ArrowDown: '2',
    ArrowLeft: '3',
  };

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
    paused: true,
    interval: INPUT_INTERVAL_COUNT,
    INTERVAL_MIN: 1,
    INTERVAL_MAX: INPUT_INTERVAL_COUNT * 3,
  };
  let nextLevelTimerId = null;
  const AUTO_NEXT_LEVEL_DELAY = 1000;

  let editMode = false;
  let temporaryShowCharsFlag = false;
  let secretSequence = '';

  let undoInfo;
  let undoFlag = false;
  let undoCount = 0;

  let clearFlag = false;
  let symmetryFlag = false;
  let redrawFlag = false;

  let drawingState = app.states.none;
  const editboxFunctions = {};

  let blockSize = 0;

  let levelId = null;
  const level = app.Level();

  const MOVE_MSEC = INPUT_INTERVAL_COUNT * INPUT_INTERVAL_MSEC;
  const SHADOW_MSEC = MOVE_MSEC * 2;
  const ROTATION_MSEC = MOVE_MSEC * 3;
  document.documentElement.style.setProperty('--animation-duration', `${MOVE_MSEC}ms`);
  document.documentElement.style.setProperty('--animation-duration-shadow', `${SHADOW_MSEC}ms`);
  document.documentElement.style.setProperty('--animation-duration-rotation', `${ROTATION_MSEC}ms`);

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
    const dys = [-1, 0, 1, 0];
    const dxs = [0, 1, 0, -1];
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
    const symmetryFlagPrev = symmetryFlag;
    symmetryFlag = center !== null;
    clearFlag = false;
    if (symmetryFlag) {
      const isConnected = level.isConnected(app.states.isTarget);
      if (isConnected) {
        clearFlag = true;
      }
    }
    redrawFlag = clearFlag;
    if (symmetryFlag !== symmetryFlagPrev) {
      redrawFlag = true;
    }
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
    const bcRect = app.elems.stickBase.getBoundingClientRect();
    const x = cursorPos.x - bcRect.width / 2;
    const y = cursorPos.y - bcRect.height / 2;
    const minDist = 60;
    if (x ** 2 + y ** 2 < minDist ** 2) {
      inputDir = dirs.neutral;
    } else if (Math.abs(x) > Math.abs(y)) {
      inputDir = x < 0 ? dirs.ArrowLeft : dirs.ArrowRight;
    } else {
      inputDir = y < 0 ? dirs.ArrowUp : dirs.ArrowDown;
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
      if (settings.autoMode) {
        if (settingsAuto.paused) {
          onButtonStart();
        } else {
          onButtonPause();
        }
      } else if (!temporaryShowCharsFlag) {
        e.preventDefault();
        temporaryShowCharsFlag = true;
        draw();
      }
    } else if (e.key === '@') {
      toggleEditLevel();
    } else if (e.key === 'r') {
      resetLevel();
    } else if (e.key === 'z') {
      undoStart();
    } else if (e.key.length > 2) {
      if (!settings.autoMode) {
        const dir = dirs[e.key];
        if (dir !== undefined) {
          e.preventDefault();
          inputFlag = true;
          inputDir = dir;
          updateController(inputDir);
          inputKeys[e.key] = true;
        }
      }
    } else if (editMode && editboxFunctions[e.key]) {
      editboxFunctions[e.key]();
    }
    return false;
  }

  function keyup(e) {
    delete inputKeys[e.key];
    if (temporaryShowCharsFlag && e.key === ' ') {
      temporaryShowCharsFlag = false;
      draw();
    } else if (e.key === 'z') {
      undoEnd();
    } else if (Object.keys(inputKeys).length === 0) {
      if (!settings.autoMode) {
        updateController(dirs.neutral);
        inputFlag = false;
      }
    }
    return false;
  }

  function resetLevel() {
    clearTimeout(nextLevelTimerId);

    app.elems.level.reset.classList.add('low-contrast');
    app.elems.svg.textContent = '';

    const RESET_DELAY = 50;
    setTimeout(() => {
      app.elems.level.reset.classList.remove('low-contrast');
      loadLevelObj(level.getLevelObj(), {reset: true});
    }, RESET_DELAY);
  }

  function resetUndo() {
    undoInfo = app.UndoInfo(app.elems.undo);
  }

  function applyObj(obj, param = {init: false}) {
    level.applyObj(obj, param);
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
  }

  function loadLevelById(id) {
    clearTimeout(nextLevelTimerId);
    id = Number(id);
    if (id < 0) id = 1;
    if (id >= app.levels.length) id = app.levels.length - 1;
    levelId = id;
    updateLevelVisibility();
    app.elems.level.id.textContent = levelId;
    const levelObj = app.levels[levelId];
    consoleLog(`[LEVEL-${id}]${levelObj.subject !== undefined ? ` ${levelObj.subject}` : ''}`);

    replaceUrl();
    loadLevelObj(levelObj);
  }

  function loadLevelObj(levelObj, param = {}) {
    const objParam = {
      init: true,
    };
    if (!param.reset) {
      objParam.mirrorFlag = settings.mirrorFlag;
      objParam.rotateNum = settings.rotateNum;
    }

    resetUndo();
    applyObj(levelObj, objParam);

    inputDir = dirs.neutral;
    inputCount = INPUT_INTERVAL_COUNT;
    showElem(app.elems.stickBase);
  }

  function updateLevelVisibility() {
    if (levelId === null) {
      hideElem(app.elems.level.prev);
      hideElem(app.elems.level.id);
      hideElem(app.elems.level.next);
      showElem(app.elems.level.edit);
    } else {
      (levelId <= 1 ? hideElem : showElem)(app.elems.level.prev);
      showElem(app.elems.level.id);
      (levelId === app.levels.length - 1 ? hideElem : showElem)(app.elems.level.next);
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
    if (levelId < app.levels.length - 1) {
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
    levelId = null;
    updateLevelVisibility();
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
      hideElem(elem);
    }
    for (const elem of document.getElementsByClassName(`translatable ${lang}`)) {
      showElem(elem);
    }
  }

  function selectLang(e, lang) {
    applyLang(lang);
    const ICON_SIZE = 32;
    document.documentElement.style.setProperty('--animation-origin-rotation', `${ICON_SIZE / 2}px ${ICON_SIZE / 2}px`);
    app.elems.icon.classList.add('animation-rotation');
    setTimeout(() => {
      app.elems.icon.classList.remove('animation-rotation');
    }, ROTATION_MSEC);
    e.stopPropagation();
    savedata.saveLang(lang);
  }

  function showLevelsDialog() {
    app.elems.levels.dialogSvg.innerHTML = '';
    const HEIGHT = 90;
    const WIDTH = 90;
    const COLS = 5;
    app.elems.levels.dialogSvg.style.setProperty('height', `${HEIGHT * Math.ceil((app.levels.length - 1) / COLS)}px`);

    for (let id = 1; id < app.levels.length; id++) {
      const levelObj = app.levels[id];
      const g = app.svg.createG();
      g.classList.add('level-select');
      const level = app.Level();
      level.applyObj(levelObj, {init: true});
      const blockSize = Math.min((WIDTH - 30) / (level.getW() + 2), (HEIGHT - 30) / (level.getH() + 2));
      const levelSvg = level.createSvg(blockSize);
      levelSvg.setAttribute('transform', `translate(${-blockSize + 20},${-blockSize + 20})`);
      g.appendChild(levelSvg);
      {
        const text = app.svg.createText(5, {x: 2.1, y: 2, text: id, fill: 'black'});
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
          const color = getStepColor(highestScore, bestStep);
          const rect = app.svg.createRect(5, {x: 1, y: 4.5, width: 2, height: 2, fill: color});
          g.appendChild(rect);
        }
      }
      const x = ((id - 1) % COLS) * WIDTH;
      const y = Math.floor((id - 1) / COLS) * HEIGHT;
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
      updateAutoMode(true);
    }
    if (queryParams.levelObj.s === '') {
      const id = queryParams.id === null ? 1 : queryParams.id;
      loadLevelById(id);
    } else {
      levelId = null;
      updateLevelVisibility();
      loadLevelObj(queryParams.levelObj);
    }
    updateEditLevel();
    initElems();
    setInterval(intervalFunc, INPUT_INTERVAL_MSEC);
  }

  function initElems() {
    // autoモード
    {
      app.elems.auto.buttonStop.addEventListener('click', onButtonStop);
      app.elems.auto.buttonStart.addEventListener('click', onButtonStart);
      app.elems.auto.buttonPause.addEventListener('click', onButtonPause);
      app.elems.auto.buttonSpeedDown.addEventListener('click', onButtonSpeedDown);
      app.elems.auto.buttonSpeedUp.addEventListener('click', onButtonSpeedUp);
    }

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
          const rect = app.svg.createRect(30, {x: 0, y: 0, width: 1, height: 1, fill: app.colors[state].fill});
          rect.setAttribute('stroke', app.colors[state].stroke);
          rect.setAttribute('stroke-width', 4);
          elem.appendChild(rect);
        }
        {
          const text = app.svg.createText(30, {x: 0.5, y: 0, text: char, fill: app.colors[state].text});
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('font-size', '18px');
          elem.appendChild(text);
        }
      }
      editboxFunctions[app.states.stateToChar[app.states.none]]();

      app.elems.edit.wDec.addEventListener('click', () => resize(-1, 0), false);
      app.elems.edit.wInc.addEventListener('click', () => resize(1, 0), false);
      app.elems.edit.hDec.addEventListener('click', () => resize(0, -1), false);
      app.elems.edit.hInc.addEventListener('click', () => resize(0, 1), false);
      app.elems.edit.normalize.addEventListener('click', () => {
        level.normalize();
        updateUrl();
        draw();
      }, false);
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
  }

  function intervalFunc() {
    // アンドゥの入力を受け付けます。
    if (undoFlag) {
      if (undoCount === UNDO_INTERVAL_COUNT) {
        undoCount = 0;
        execUndo();
        showElem(app.elems.stickBase);
      }
      undoCount++;
      return;
    }

    // クリア後の入力はアンドゥ以外は受け付けません。
    if (clearFlag && !redrawFlag) {
      return;
    }

    let intervalCount = INPUT_INTERVAL_COUNT;
    const r = level.getLevelObj()?.r;
    if (!editMode && settings.autoMode && r !== undefined) {
      intervalCount = settingsAuto.interval;
      if (settingsAuto.paused) {
        inputFlag = false;
      } else {
        inputDir = Number(r[undoInfo.getIndex()]);
        inputFlag = true;
      }
    }

    if (inputCount >= intervalCount) {
      if (redrawFlag) {
        redrawFlag = false;
        draw(true);
        if (clearFlag) {
          hideElem(app.elems.stickBase);
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
    if (levelId !== 0) {
      const dasharray = '1, 4';
      const g = app.svg.createG();
      // 横線
      for (let y = 2; y < level.getHeight() - 1; ++y) {
        const line = app.svg.createLine(blockSize, {x1: 1, y1: y, x2: level.getWidth() - 1, y2: y, stroke: app.colors.line});
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      // 縦線
      for (let x = 2; x < level.getWidth() - 1; ++x) {
        const line = app.svg.createLine(blockSize, {x1: x, y1: 1, x2: x, y2: level.getHeight() - 1, stroke: app.colors.line});
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
      const rect = app.svg.createRect(blockSize, {x: 0, y: 0, width: level.getWidth(), height: 1, fill: paddingColor});
      g.appendChild(rect);
    }
    {
      const rect = app.svg.createRect(blockSize, {x: 0, y: 0, width: 1, height: level.getHeight(), fill: paddingColor});
      g.appendChild(rect);
    }
    {
      const rect = app.svg.createRect(blockSize, {x: 0, y: level.getHeight() - 1, width: level.getWidth(), height: 1, fill: paddingColor});
      g.appendChild(rect);
    }
    {
      const rect = app.svg.createRect(blockSize, {x: level.getWidth() - 1, y: 0, width: 1, height: level.getHeight(), fill: paddingColor});
      g.appendChild(rect);
    }

    if (!editMode) {
      const bestStep = level.getBestStep();
      // クリア時のメッセージ
      if (clearFlag) {
        const text = app.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: level.getHeight() - 1, text: 'CLEAR', fill: 'blue'});
        text.setAttribute('font-size', `${blockSize * 0.8}px`);
        text.setAttribute('font-weight', 'bold');
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
          if (!settings.autoMode) {
            const levelParams = `w: ${w}, h: ${h}, s: '${s}', r: '${replayStr}'` + (levelObj.subject !== undefined ? `, subject: '${levelObj.subject}'` : '');
            const levelObjStr = `{${levelParams}},`;
            consoleLog(levelObjStr);
            if (r === undefined) {
              consoleWarn('参照用公式記録の情報がありません！');
            } else if (clearStep < bestStep) {
              consoleLog(`参照用公式記録を破りました！\n参照用公式記録[${bestStep}] → あなたの記録[${clearStep}] (${clearStep - bestStep} 手)`);
            } else {
              if (replayStr === r) {
                consoleLog('参照用公式記録と完全に同じ手順です。');
              } else {
                consoleLog(`参照用公式記録は ${bestStep} 手です。\n(差: ${clearStep - bestStep} 手)`);
              }
            }
          }
        }

        {
          const color = getStepColor(clearStep, bestStep);
          const text = app.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: 0, text: `${clearStep} steps`, fill: color});
          text.setAttribute('font-size', `${blockSize * 0.7}px`);
          text.setAttribute('font-weight', 'bold');
          g.appendChild(text);
        }
        if (settings.autoMode) {
          nextLevelTimerId = setTimeout(gotoNextLevel, AUTO_NEXT_LEVEL_DELAY);
        }
      } else {
        if (symmetryFlag) {
          const text = app.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: level.getHeight() - 2, text: 'Not connected.', fill: 'white'});
          text.setAttribute('font-size', `${blockSize * 0.7}px`);
          text.setAttribute('font-weight', 'bold');
          g.appendChild(text);
        }
        const text = app.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: level.getHeight() - 1, text: `${undoInfo.getIndex()} steps`, fill: 'white'});
        text.setAttribute('font-size', `${blockSize * 0.7}px`);
        text.setAttribute('font-weight', 'bold');
        g.appendChild(text);
      }

      // 自己最高記録
      if (levelId !== null && !clearFlag) {
        const levelObj = level.getLevelObj();
        const highestScore = savedata.getHighestScore(levelObj);
        if (highestScore !== null) {
          const color = getStepColor(highestScore, bestStep);
          const text = app.svg.createText(blockSize, {x: level.getWidth() * 0.5, y: 0, text: `${highestScore}`, fill: color});
          text.setAttribute('font-size', `${blockSize * 0.7}px`);
          text.setAttribute('font-weight', 'bold');
          g.appendChild(text);
        }
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
    const curXY = getCurXY(e);
    const x = curXY.x;
    const y = curXY.y;
    if (!editMode) {
      const xMax = level.getW() + 3;
      const yMax = level.getH() + 3;
      if (x < 2) {
        if (y < 2) {
          secretSequence += '1';
        } else if (y > yMax - 2) {
          secretSequence += '4';
        } else {
          secretSequence = '';
        }
      } else if (x > xMax - 2) {
        if (y < 2) {
          secretSequence += '2';
        } else if (y > yMax - 2) {
          secretSequence += '3';
        } else {
          secretSequence = '';
        }
      } else {
        secretSequence = '';
      }

      let resetFlag = true;
      if (secretSequence === '1234') {
        toggleEditLevel();
      } else if (secretSequence === '1212') {
        updateAutoMode(true);
      } else if (secretSequence === '4343') {
        showElem(app.elems.consoleLog);
      } else if (secretSequence === '3434') {
        hideElem(app.elems.consoleLog);
      } else {
        resetFlag = false;
      }
      if (resetFlag) {
        secretSequence = '';
      }

      return;
    }

    if (!level.isInside(x, y)) {
      return;
    }

    // タッチ環境の場合は、画面左端は必ずスワイプ操作できるように編集操作を無効化します。
    if (isTouchScreenAndNearLeftEdge(e)) {
      return;
    }

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

    // タッチ環境かつ画面左端付近か否か。
    function isTouchScreenAndNearLeftEdge(e) {
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
    if (settings.debugFlag) url += '&debug';
    if (settings.mirrorFlag) url += '&mirror';
    if (settings.rotateNum !== 0) url += `&rotate=${settings.rotateNum}`;
    history.replaceState(null, '', url);
  }

  function updateButtonSpeedDisplay() {
    (settingsAuto.interval === settingsAuto.INTERVAL_MAX ? hideElem : showElem)(app.elems.auto.buttonSpeedDown);
    (settingsAuto.interval === 1 ? hideElem : showElem)(app.elems.auto.buttonSpeedUp);
  }

  function updateAutoMode(isOn) {
    if (isOn) {
      settings.autoMode = true;
      settingsAuto.paused = true;
      showElem(app.elems.auto.buttons);
      hideElem(app.elems.stickBase);
    } else {
      settings.autoMode = false;
      hideElem(app.elems.auto.buttons);
      showElem(app.elems.stickBase);
    }
    updateAutoStartPauseButtons();
    replaceUrl();
  }

  function updateAutoStartPauseButtons() {
    if (settingsAuto.paused) {
      showElem(app.elems.auto.buttonStart);
      hideElem(app.elems.auto.buttonPause);
    } else {
      hideElem(app.elems.auto.buttonStart);
      showElem(app.elems.auto.buttonPause);
    }
  }

  function onButtonStop() {
    updateAutoMode(false);
    clearTimeout(nextLevelTimerId);
  }

  function onButtonStart() {
    settingsAuto.paused = false;
    updateAutoStartPauseButtons();
  }

  function onButtonPause() {
    settingsAuto.paused = true;
    updateAutoStartPauseButtons();
    clearTimeout(nextLevelTimerId);
  }

  function onButtonSpeedDown() {
    settingsAuto.interval += 2;
    if (settingsAuto.interval >= settingsAuto.INTERVAL_MAX) {
      settingsAuto.interval = settingsAuto.INTERVAL_MAX;
    }
    updateButtonSpeedDisplay();
  }

  function onButtonSpeedUp() {
    settingsAuto.interval -= 2;
    if (settingsAuto.interval <= settingsAuto.INTERVAL_MIN) {
      settingsAuto.interval = settingsAuto.INTERVAL_MIN;
    }
    updateButtonSpeedDisplay();
  }

  function consoleAdd(str, className) {
    const elem = app.elems.consoleLog;
    const li = document.createElement('li');
    li.classList.add(className);
    li.textContent = str;
    elem.appendChild(li);

    const MAX_LOG_NUM = 30;
    while (elem.childElementCount > MAX_LOG_NUM) {
      elem.removeChild(elem.firstChild);
    }
  }

  function consoleLog(str) {
    console.log(str);
    consoleAdd(str, 'log');
  }

  function consoleWarn(str) {
    console.warn(str);
    consoleAdd(str, 'warn');
  }
})();
