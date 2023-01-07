(function () {
  'use strict';
  const VERSION_TEXT = 'v2023.01.06';

  const app = window.app;
  Object.freeze(app);

  const savedata = new app.Savedata();

  const dirs = {
    neutral: 'N',
    ArrowUp: '0',
    ArrowRight: '1',
    ArrowDown: '2',
    ArrowLeft: '3',
  };

  let inputFlag = false;
  const INPUT_INTERVAL_MSEC = 28; // この値を変更するときは、iOSの省電力モード時のsetIntervalの動作を確認した上で変更してください。詳細: https://github.com/tatt61880/showkoban/issues/38
  const INPUT_INTERVAL_COUNT = 6;
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

  let completeFlag = false;
  let symmetryFlag = false;
  let redrawFlag = false;

  let drawingState = app.states.none;
  const editboxFunctions = {};

  let blockSize = 0;

  let levelsList = null;
  let levelsExList = null;
  let levelId = null;
  let mode;
  const MODE = {
    POINT: 0,
    REFLECTION: 1,
  };
  const level = new app.Level();

  const MOVE_MSEC = INPUT_INTERVAL_COUNT * INPUT_INTERVAL_MSEC;
  const SHADOW_MSEC = MOVE_MSEC * 2;
  const ROTATION_MSEC = MOVE_MSEC * 3;
  document.documentElement.style.setProperty('--animation-duration', `${MOVE_MSEC}ms`);
  document.documentElement.style.setProperty('--animation-duration-shadow', `${SHADOW_MSEC}ms`);
  document.documentElement.style.setProperty('--animation-duration-symmetry', `${ROTATION_MSEC}ms`);

  const elems = new app.Elems({
    viewport: 'viewport',
    top: 'top',
    icon: 'icon',
    version: 'version',

    help: {
      button: 'button-help',
      dialog: 'dialog-help',
      dialogDiv: 'dialog-help-div',
      langEn: 'setting-lang-en',
      langJa: 'setting-lang-ja',
    },

    category: {
      title: 'title',
      game: 'game',
    },

    title: {
      buttonPlay: 'button-play',
      buttonPlay2: 'button-play2',
      // buttonEdit: 'button-edit',
    },

    level: {
      widget: 'level-widget',
      reset: 'button-level-reset',
      prev: 'button-level-prev',
      id: 'level-id',
      next: 'button-level-next',
      edit: 'button-level-edit',
    },

    levels: {
      button: 'button-levels',
      dialog: 'dialog-levels',
      hideCompletedLevels: 'hide-completed-levels',
      dialogDiv: 'dialog-levels-div',
      dialogSvg: 'dialog-levels-svg',
    },

    main: {
      div: 'main',
      svg: 'svg-main',
    },

    auto: {
      buttons: 'buttons-auto',
      buttonStop: 'button-stop',
      buttonStart: 'button-start',
      buttonPause: 'button-pause',
      buttonSpeedDown: 'button-speed-down',
      buttonSpeedUp: 'button-speed-up',
    },

    edit: {
      editbox: 'editbox',
      editShape: 'edit-drawing-shape',
      editState: 'edit-drawing-state',
      wDec: 'w-dec',
      wInc: 'w-inc',
      hDec: 'h-dec',
      hInc: 'h-inc',
      normalize: 'edit-normalize',
    },

    url: 'url',

    controller: {
      widget: 'controller-widget',
      undo: 'button-undo',
      stick: 'stick',
      stickBase: 'stick-base',
    },

    consoleLog: 'console-log',
  });

  const digitStates = {
    0: '000111001111111101111111111111111',
    1: '000101001001001101100100001101101',
    2: '111101001111111111111111001111111',
    3: '000101001100001001001101001101001',
    4: '000111001111111001111111001111111',
  };

  document.addEventListener('DOMContentLoaded', onloadApp, false);
  return;
  // ==========================================================================

  function updateStick(dir) {
    const transforms = {
      'N': '',
      '0': 'rotateX(45deg)',
      '1': 'rotateY(45deg)',
      '2': 'rotateX(-45deg)',
      '3': 'rotateY(-45deg)',
    };
    elems.controller.stick.style.setProperty('transform', transforms[dir]);
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

  function completeCheck() {
    if (mode === MODE.REFLECTION) {
      completeFlag = level.isCompleted2();
      const symmetryFlagPrev = symmetryFlag;
      symmetryFlag = level.isReflectionSymmetry(app.states.isTarget);
      redrawFlag = completeFlag || (symmetryFlag !== symmetryFlagPrev);
    } else {
      completeFlag = level.isCompleted();
      const symmetryFlagPrev = symmetryFlag;
      symmetryFlag = level.isPointSymmetry(app.states.isTarget);
      redrawFlag = completeFlag || (symmetryFlag !== symmetryFlagPrev);
    }

    const center = level.getCenter(app.states.isTarget);
    if (completeFlag) {
      document.documentElement.style.setProperty('--animation-origin', `${blockSize * center.x}px ${blockSize * center.y}px`);
    }
  }

  function undoStart() {
    if (undoFlag) return;
    undoFlag = true;
    clearTimeout(nextLevelTimerId);
    elems.controller.undo.classList.add('low-contrast');
    undoCount = UNDO_INTERVAL_COUNT;
  }

  function undoEnd() {
    if (!undoFlag) return;
    undoFlag = false;
    elems.controller.undo.classList.remove('low-contrast');
  }

  function undodown(e) {
    e.preventDefault();
    undoStart();
  }

  function getCursorPos(elem, e) {
    const bcRect = elem.getBoundingClientRect();
    if (e.touches !== undefined) {
      const x = e.touches[0].clientX - bcRect.left;
      const y = e.touches[0].clientY - bcRect.top;
      return { x, y };
    } else {
      const x = e.clientX - bcRect.left;
      const y = e.clientY - bcRect.top;
      return { x, y };
    }
  }

  function pointerdown(e) {
    e.preventDefault();
    inputFlag = true;
    pointermove(e);
  }

  function pointermove(e) {
    e.preventDefault();
    if (!inputFlag || settings.autoMode) return;
    const cursorPos = getCursorPos(elems.controller.stickBase, e);
    const bcRect = elems.controller.stickBase.getBoundingClientRect();
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
    updateStick(inputDir);
  }

  function pointerup() {
    undoEnd();
    inputFlag = false;
    inputDir = dirs.neutral;
    updateStick(inputDir);
  }

  function keydown(e) {
    if (!elems.category.title.classList.contains('hide')) return;
    if (e.altKey) return;

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
          updateStick(inputDir);
          inputKeys[e.key] = true;
        }
      }
    } else if (editMode && editboxFunctions[e.key]) {
      editboxFunctions[e.key]();
    }
    return false;
  }

  function keyup(e) {
    if (!elems.category.title.classList.contains('hide')) return;
    delete inputKeys[e.key];
    if (temporaryShowCharsFlag && e.key === ' ') {
      temporaryShowCharsFlag = false;
      draw();
    } else if (e.key === 'z') {
      undoEnd();
    } else if (Object.keys(inputKeys).length === 0) {
      if (!settings.autoMode) {
        updateStick(dirs.neutral);
        inputFlag = false;
      }
    }
    return false;
  }

  function resetLevel() {
    clearTimeout(nextLevelTimerId);

    elems.level.reset.classList.add('low-contrast');
    elems.main.svg.textContent = '';

    const RESET_DELAY = 50;
    setTimeout(() => {
      elems.level.reset.classList.remove('low-contrast');
      loadLevelObj(level.getLevelObj(), { reset: true });
    }, RESET_DELAY);
  }

  function resetUndo() {
    undoInfo = new app.UndoInfo(elems.controller.undo);
  }

  function applyObj(obj, param = { init: false, resize: false }) {
    level.applyObj(obj, param);
    const svgMaxWidth = 490;
    const svgMaxHeight = 280;
    blockSize = Math.min(svgMaxWidth / level.getWidth(), svgMaxHeight / level.getHeight());
    completeCheck();
    updateUrl();

    elems.main.svg.setAttribute('width', blockSize * level.getWidth());
    elems.main.svg.setAttribute('height', blockSize * level.getHeight());
    draw();
  }

  function execUndo() {
    if (undoInfo.isUndoable()) {
      const data = undoInfo.undo();
      const resizeFlag = level.getW() !== data.w || level.getH() !== data.h;
      applyObj(data, { resize: resizeFlag });
    }
  }

  function createObjById(id_) {
    const digits = [];
    let id = Math.floor(id_);
    if (id !== id_) {
      loadLevelById(id);
      return;
    }
    levelId = id;
    let isMinus = false;
    if (id < 0) {
      id = -id;
      isMinus = true;
    }
    while (id) {
      digits.unshift(id % 10);
      id = Math.floor(id / 10);
    }
    if (isMinus) {
      digits.unshift(-1);
    }
    let s = 's-';
    let x = 1;
    for (let row = 0; row < 5; ++row) {
      s += '0';
      for (let i = 0; i < digits.length; ++i) {
        const digit = digits[i] + 1;
        for (let j = digit * 3; j < (digit + 1) * 3; ++j) {
          const val = digitStates[row].charAt(j) * x;
          if (val) x++;
          s += val < 10 ? val : `(${val})`;
        }
        s += '0';
      }
      s += '-';
    }
    const w = digits.length * 4 + 1;
    const h = 7;
    return { w, h, s };
  }

  function loadLevelById(id_) {
    clearTimeout(nextLevelTimerId);
    const id = Number(id_);
    levelId = id;
    let levelObj;
    if (levelsList[levelId] !== undefined) {
      levelObj = levelsList[levelId];
    } else if (levelsExList[levelId] !== undefined) {
      levelObj = levelsExList[levelId];
    }
    consoleLog(`[LEVEL ${id}]${levelObj?.subject !== undefined ? ` ${levelObj.subject}` : ''}`);

    loadLevelObj(levelObj !== undefined ? levelObj : createObjById(levelId));
    updateLevelVisibility();
    elems.level.id.textContent = levelId;
    replaceUrl();
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
  }

  function showLevelPrev() {
    if (levelId === null) return false;
    if (levelId === 0) return false;
    if (levelId === 1) return false;
    if (levelsList[levelId] !== undefined) return levelsList[levelId - 1] !== undefined;
    if (isNaN(levelId)) return false;
    if (levelsExList[levelId] !== undefined) return levelsExList[levelId - 1] !== undefined;
    return levelsList[levelId - 1] === undefined && levelsExList[levelId - 1] === undefined;
  }

  function showLevelNext() {
    if (levelId === null) return false;
    if (levelId === -1) return false;
    if (levelId === 0) return false;
    if (levelsList[levelId] !== undefined) return levelsList[levelId + 1] !== undefined;
    if (isNaN(levelId)) return false;
    if (levelsExList[levelId] !== undefined) return levelsExList[levelId + 1] !== undefined;
    return levelsList[levelId + 1] === undefined && levelsExList[levelId + 1] === undefined;
  }

  function updateLevelVisibility() {
    (showLevelPrev() ? showElem : hideElem)(elems.level.prev);
    (showLevelNext() ? showElem : hideElem)(elems.level.next);
    (levelId !== null ? showElem : hideElem)(elems.level.id);
    (levelId !== null ? showElem : hideElem)(elems.levels.button);
    (levelId === null ? showElem : hideElem)(elems.level.edit);
  }

  function gotoPrevLevel() {
    if (levelId === null) return;
    if (showLevelPrev()) {
      loadLevelById(levelId - 1);
    }
  }

  function gotoNextLevel() {
    if (levelId === null) return;
    if (showLevelNext()) {
      loadLevelById(levelId + 1);
    }
  }

  function updateUrl() {
    if (!editMode) return;
    const url = level.getUrlStr() + (mode === MODE.REFLECTION ? '&r' : '');
    elems.url.innerHTML = `<a href="${url}">現在の盤面のURL</a>`;
  }

  function updateEditLevel() {
    if (editMode) {
      showElem(elems.url);
      showElem(elems.edit.editbox);
    } else {
      hideElem(elems.url);
      hideElem(elems.edit.editbox);
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
    elems.help.dialog.showModal();
  }

  function closeHelpDialog() {
    elems.help.dialog.close();
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

  function rotateIcon() {
    const ICON_SIZE = 32;
    document.documentElement.style.setProperty('--animation-origin', `${ICON_SIZE / 2}px ${ICON_SIZE / 2}px`);
    elems.icon.classList.remove('animation-rotation');
    setTimeout(() => {
      elems.icon.classList.add('animation-rotation');
    }, 1);
  }

  function selectLang(lang) {
    rotateIcon();
    applyLang(lang);
    savedata.saveLang(lang);
  }

  function showLevelsDialog() {
    updateLevelsDialog();
    elems.levels.dialog.showModal();
  }

  function toggleHideCompletedLevels() {
    updateLevelsDialog();
  }

  function updateLevelsDialog() {
    const hideCompletedLevelsFlag = elems.levels.hideCompletedLevels.checked;

    elems.levels.dialogSvg.innerHTML = '';
    const HEIGHT = 90;
    const WIDTH = 90;
    const COLS = 5;

    let count = 0;
    for (let id = 1; id < levelsList.length; ++id) {
      const levelObj = levelsList[id];
      appendLevel(levelObj, id);
    }
    for (const id of Object.keys(levelsExList).sort()) {
      if (String(id) === 'NaN') continue;
      const levelObj = levelsExList[id];
      appendLevel(levelObj, id);
    }

    elems.levels.dialogSvg.style.setProperty('height', `${HEIGHT * Math.ceil(count / COLS)}px`);

    function appendLevel(levelObj, id) {
      const highestScore = savedata.getHighestScore(levelObj, mode === MODE.REFLECTION);
      if (highestScore !== null && hideCompletedLevelsFlag) return;
      count++;

      const g = app.svg.createG();
      g.classList.add('level-select');
      elems.levels.dialogSvg.appendChild(g);

      const level = new app.Level();
      level.applyObj(levelObj, { init: true });
      const blockSize = Math.min((WIDTH - 30) / (level.getW() + 2), (HEIGHT - 30) / (level.getH() + 2));
      const levelSvg = level.createSvg(blockSize);
      levelSvg.setAttribute('transform', `translate(${-blockSize + 20},${-blockSize + 20})`);
      g.appendChild(levelSvg);
      {
        const text = app.svg.createText(5, { x: 10, y: 2, text: id, fill: 'black' });
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-size', '16px');
        g.appendChild(text);
      }
      {
        const bestStep = level.getBestStep();
        if (highestScore !== null) {
          const color = getStepColor(highestScore, bestStep);
          const crown = app.svg.createCrown(20, { x: 0, y: 1, fill: color });
          g.appendChild(crown);
        }
      }
      const x = ((count - 1) % COLS) * WIDTH;
      const y = Math.floor((count - 1) / COLS) * HEIGHT;
      g.setAttribute('transform', `translate(${x},${y})`);
      g.setAttribute('data-id', id);
      g.addEventListener('click', function () {
        const id = Number(g.getAttribute('data-id'));
        loadLevelById(id);
        closeLevelsDialog();
      }, false);
    }
  }

  function closeLevelsDialog() {
    elems.levels.dialog.close();
  }

  function onloadApp() {
    elems.init();
    elems.version.textContent = VERSION_TEXT;
    window.onresize = resizeWindow;
    resizeWindow();
    applyLang(savedata.loadLang());
    initElems();
    updateEditLevel();

    const queryParams = app.analyzeUrl();
    settings = queryParams.settings;
    mode = settings.r ? MODE.REFLECTION : MODE.POINT;

    setInterval(intervalFunc, INPUT_INTERVAL_MSEC);

    if (queryParams.levelObj.s === '') {
      const id = queryParams.id;
      if (id === null) {
        onloadTitle();
      } else {
        onloadId(id);
      }
    } else {
      onloadObj(queryParams.levelObj);
    }
  }

  function onloadTitle() {
    showElem(elems.category.title);
    hideElem(elems.category.game);

    replaceUrlTitle();
  }

  function onloadId(id_) {
    if (editMode) {
      toggleEditLevel();
    }
    if (mode === MODE.POINT) {
      levelsList = app.levels;
      levelsExList = app.levelsEx;
    } else {
      levelsList = app.levelsReflection;
      levelsExList = app.levelsExReflection;
    }
    hideElem(elems.category.title);
    showElem(elems.category.game);
    showElem(elems.main.div);
    showElem(elems.level.widget);
    showElem(elems.svgDiv);
    if (settings.autoMode) {
      updateAutoMode(true);
    }
    showElem(elems.controller.widget);

    let id = id_;
    if (id === null) id = 1;
    loadLevelById(id);
  }

  function onloadObj(obj) {
    hideElem(elems.category.title);
    showElem(elems.category.game);
    showElem(elems.main.svg);
    showElem(elems.level.widget);
    showElem(elems.svgDiv);
    hideElem(elems.auto.buttons);
    showElem(elems.controller.widget);

    levelId = null;
    updateLevelVisibility();
    loadLevelObj(obj);
  }

  function initElems() {
    elems.top.addEventListener('click', onloadTitle, false);

    // Autoモード用
    {
      elems.auto.buttonStop.addEventListener('click', onButtonStop);
      elems.auto.buttonStart.addEventListener('click', onButtonStart);
      elems.auto.buttonPause.addEventListener('click', onButtonPause);
      elems.auto.buttonSpeedDown.addEventListener('click', onButtonSpeedDown);
      elems.auto.buttonSpeedUp.addEventListener('click', onButtonSpeedUp);
    }

    // Editモード用
    {
      for (const char in app.states.charToState) {
        const state = app.states.charToState[char];
        const elem = document.getElementById(`edit_${char}`);
        if (elem === null) continue;
        const func = () => {
          elems.edit.editShape.setAttribute('fill', app.colors[state].fill);
          elems.edit.editShape.setAttribute('stroke', app.colors[state].stroke);
          elems.edit.editState.textContent = char;
          elems.edit.editState.setAttribute('fill', app.colors[state].text);
          drawingState = state;
        };
        editboxFunctions[char] = func;
        elem.addEventListener('click', func, false);

        {
          const rect = app.svg.createRect(30, { x: 0, y: 0, width: 1, height: 1, fill: app.colors[state].fill });
          rect.setAttribute('stroke', app.colors[state].stroke);
          rect.setAttribute('stroke-width', 4);
          elem.appendChild(rect);
        }
        {
          const text = app.svg.createText(30, { x: 0.5, y: 0, text: char, fill: app.colors[state].text });
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('font-size', '18px');
          elem.appendChild(text);
        }
      }
      editboxFunctions[app.states.stateToChar[app.states.none]]();

      elems.edit.wDec.addEventListener('click', () => resize(-1, 0), false);
      elems.edit.wInc.addEventListener('click', () => resize(1, 0), false);
      elems.edit.hDec.addEventListener('click', () => resize(0, -1), false);
      elems.edit.hInc.addEventListener('click', () => resize(0, 1), false);
      elems.edit.normalize.addEventListener('click', () => {
        level.normalize();
        updateUrl();
        draw();
      }, false);
    }

    // ヘルプ画面用
    {
      elems.help.button.addEventListener('click', showHelpDialog, false);
      elems.help.dialog.addEventListener('click', closeHelpDialog, false);
      elems.help.dialogDiv.addEventListener('click', (e) => e.stopPropagation(), false);
      elems.help.langEn.addEventListener('click', () => selectLang('en'), false);
      elems.help.langJa.addEventListener('click', () => selectLang('ja'), false);
    }

    // タイトル画面用
    {
      elems.title.buttonPlay.addEventListener('click', () => { mode = MODE.POINT; onloadId(1); }, false);
      elems.title.buttonPlay2.addEventListener('click', () => { mode = MODE.REFLECTION; onloadId(1); }, false);
      // elems.title.buttonEdit.addEventListener('click', () => onloadObj({ w: 6, h: 5, s: '' }), false);
    }

    // レベル操作用
    {
      elems.level.reset.addEventListener('click', resetLevel, false);
      elems.level.prev.addEventListener('click', gotoPrevLevel, false);
      elems.level.next.addEventListener('click', gotoNextLevel, false);
      elems.level.edit.addEventListener('click', toggleEditLevel, false);
      elems.levels.button.addEventListener('click', showLevelsDialog, false);
      elems.levels.dialog.addEventListener('click', closeLevelsDialog, false);
      elems.levels.dialogDiv.addEventListener('click', (e) => e.stopPropagation(), false);
      elems.levels.hideCompletedLevels.addEventListener('click', toggleHideCompletedLevels, false);
    }

    // キー入力用
    {
      document.addEventListener('keydown', keydown, false);
      document.addEventListener('keyup', keyup, false);
    }

    // タッチ入力用
    {
      const touchDevice = document.ontouchstart !== undefined;
      const pointerdownEventName = touchDevice ? 'touchstart' : 'mousedown';
      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      const pointerupEventName = touchDevice ? 'touchend' : 'mouseup';

      elems.main.svg.addEventListener(pointerdownEventName, editSvg, false);
      elems.main.svg.oncontextmenu = function () {return !editMode;};

      elems.controller.stickBase.addEventListener(pointerdownEventName, pointerdown, false);
      elems.controller.stickBase.addEventListener(pointermoveEventName, pointermove, false);
      elems.controller.stickBase.addEventListener(pointerupEventName, pointerup, false);
      document.addEventListener(pointerupEventName, pointerup, false);

      elems.controller.undo.addEventListener(pointerdownEventName, undodown, false);
    }
  }

  function intervalFunc() {
    // アンドゥの入力を受け付けます。
    if (undoFlag) {
      if (undoCount === UNDO_INTERVAL_COUNT) {
        undoCount = 0;
        execUndo();
      }
      undoCount++;
      return;
    }

    // クリア後の入力はアンドゥ以外は受け付けません。
    if (completeFlag && !redrawFlag) {
      return;
    }

    let intervalCount = INPUT_INTERVAL_COUNT;
    const r = level.getLevelObj()?.r;
    if (!editMode && settings.autoMode && r !== undefined) {
      intervalCount = settingsAuto.interval;
      const steps = undoInfo.getIndex() + 1;
      if (settingsAuto.paused || steps > r.length) {
        inputFlag = false;
      } else {
        inputDir = Number(r[steps - 1]);
        inputFlag = true;
      }
    }

    if (inputCount >= intervalCount) {
      if (redrawFlag) {
        redrawFlag = false;
        draw(true);
      } else if (inputFlag) {
        if (inputDir !== dirs.neutral) {
          if (settings.autoMode) {
            updateStick(inputDir);
          }
          inputCount = 0;
          const moveFlag = move(inputDir);
          if (moveFlag) {
            draw();
            completeCheck();
            updateUrl();
          }
        }
      }
    } else {
      inputCount++;
    }
  }

  function updateController() {
    if (settings.autoMode && settingsAuto.paused) {
      hideElem(elems.controller.stickBase);
    } else {
      if (completeFlag) {
        hideElem(elems.controller.stickBase);
      } else {
        showElem(elems.controller.stickBase);
      }
    }
  }

  // 描画
  function draw(completeCheckFlag = false) {
    elems.main.svg.textContent = '';
    updateController();

    {
      const symmetryType = (() => {
        if (completeCheckFlag && completeFlag) {
          if (mode === MODE.REFLECTION) {
            return level.getReflectionType(app.states.isTarget);
          } else {
            return app.Level.SYMMETRY_TYPE.POINT;
          }
        }
        return null;
      })();

      const showCharsFlag = editMode || settings.debugFlag || temporaryShowCharsFlag;
      const levelSvg = level.createSvg(blockSize, symmetryType, showCharsFlag);
      elems.main.svg.appendChild(levelSvg);
    }
    level.resetMoveFlags();

    // 点線
    if (levelId !== 0) {
      const dasharray = '1, 4';
      const g = app.svg.createG();
      elems.main.svg.appendChild(g);
      // 横線
      for (let y = 2; y < level.getHeight() - 1; ++y) {
        const line = app.svg.createLine(blockSize, { x1: 1, y1: y, x2: level.getWidth() - 1, y2: y, stroke: app.colors.line });
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      // 縦線
      for (let x = 2; x < level.getWidth() - 1; ++x) {
        const line = app.svg.createLine(blockSize, { x1: x, y1: 1, x2: x, y2: level.getHeight() - 1, stroke: app.colors.line });
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
    }
    drawFrame();
  }

  function drawFrame() {
    const g = app.svg.createG();
    elems.main.svg.appendChild(g);

    const borderWidth = 0.05;
    {
      const frameColor = app.colors.frame;
      const rectU = app.svg.createRect(blockSize, { x: 0, y: 0, width: level.getWidth(), height: 1, fill: frameColor });
      const rectR = app.svg.createRect(blockSize, { x: level.getWidth() - 1, y: 0, width: 1, height: level.getHeight(), fill: frameColor });
      const rectD = app.svg.createRect(blockSize, { x: 0, y: level.getHeight() - 1, width: level.getWidth(), height: 1, fill: frameColor });
      const rectL = app.svg.createRect(blockSize, { x: 0, y: 0, width: 1, height: level.getHeight(), fill: frameColor });
      g.appendChild(rectU);
      g.appendChild(rectR);
      g.appendChild(rectD);
      g.appendChild(rectL);

      const borderColor = app.colors.frameBorder;
      const rectUb = app.svg.createRect(blockSize, { x: 0, y: 0, width: level.getWidth(), height: borderWidth, fill: borderColor });
      const rectRb = app.svg.createRect(blockSize, { x: level.getWidth() - borderWidth, y: 0, width: borderWidth, height: level.getHeight(), fill: borderColor });
      const rectDb = app.svg.createRect(blockSize, { x: 0, y: level.getHeight() - borderWidth, width: level.getWidth(), height: borderWidth, fill: borderColor });
      const rectLb = app.svg.createRect(blockSize, { x: 0, y: 0, width: borderWidth, height: level.getHeight(), fill: borderColor });
      g.appendChild(rectUb);
      g.appendChild(rectRb);
      g.appendChild(rectDb);
      g.appendChild(rectLb);
    }

    if (!editMode) {
      const fontSize = `${blockSize * 0.6}px`;
      const bestStep = level.getBestStep();

      let highestScorePrev = null;

      // クリア時のメッセージ
      if (completeFlag) {
        const text = app.svg.createText(blockSize, { x: level.getWidth() * 0.5, y: level.getHeight() - 1.95, text: 'Congratulations!', fill: 'white' });
        text.setAttribute('font-size', fontSize);
        text.setAttribute('font-weight', 'bold');
        g.appendChild(text);
        {
          const levelObj = level.getLevelObj();
          const w = levelObj.w;
          const h = levelObj.h;
          const s = levelObj.s;
          const r = levelObj.r;
          const replayStr = undoInfo.getReplayStr();

          // 記録保存
          if (bestStep !== undefined) {
            highestScorePrev = savedata.getHighestScore(levelObj, mode === MODE.REFLECTION);
            savedata.saveSteps(levelObj, mode === MODE.REFLECTION, replayStr);
          }

          // ログ出力
          {
            const levelParams = `w: ${w}, h: ${h}, s: '${s}', r: '${replayStr}', step: ${replayStr.length}` + (levelObj.subject !== undefined ? `, subject: '${levelObj.subject}'` : '');
            const levelObjStr = `{ ${levelParams} },`;
            const completedStep = undoInfo.getIndex();
            consoleLog(levelObjStr);
            if (r === undefined) {
              consoleWarn('参照用公式記録の情報がありません！');
            } else if (completedStep < bestStep) {
              consoleLog(`参照用公式記録を破りました！\n参照用公式記録[${bestStep}] → あなたの記録[${completedStep}] (${completedStep - bestStep} 手)`);
            } else {
              if (replayStr === r) {
                consoleLog('参照用公式記録と完全に同じ手順です。');
              } else {
                consoleLog(`参照用公式記録は ${bestStep} 手です。\n(差: ${completedStep - bestStep} 手)`);
              }
            }
          }
        }

        if (settings.autoMode) {
          nextLevelTimerId = setTimeout(gotoNextLevel, AUTO_NEXT_LEVEL_DELAY);
        }
      } else {
        if (symmetryFlag) {
          const text = app.svg.createText(blockSize, { x: level.getWidth() * 0.5, y: level.getHeight() - 2, text: 'Not connected.', fill: 'white' });
          text.setAttribute('font-size', fontSize);
          text.setAttribute('font-weight', 'bold');
          g.appendChild(text);
        }
      }

      // 今回の手数
      {
        const currentStep = undoInfo.getIndex();
        const color = completeFlag ? getStepColor(currentStep, bestStep) : 'black';
        const text = app.svg.createText(blockSize, { x: level.getWidth() * 0.5, y: level.getHeight() - 1 - borderWidth / 2, text: `${currentStep} steps`, fill: color });
        text.setAttribute('font-size', fontSize);
        text.setAttribute('font-weight', 'bold');
        g.appendChild(text);
      }

      // 自己最高記録
      if (levelId !== null) {
        const levelObj = level.getLevelObj();
        const highestScore = savedata.getHighestScore(levelObj, mode === MODE.REFLECTION);
        if (highestScore !== null) {
          const color = getStepColor(highestScore, bestStep);

          const text = app.svg.createText(blockSize, { x: level.getWidth() * 0.5, y: borderWidth / 2, text: `Your best: ${highestScore} steps`, fill: color });
          text.setAttribute('font-size', fontSize);
          text.setAttribute('font-weight', 'bold');
          g.appendChild(text);

          const crown = app.svg.createCrown(blockSize, { x: borderWidth, y: borderWidth / 2, fill: color });
          g.appendChild(crown);
        }

        // 記録更新？
        if (highestScore !== null && highestScorePrev !== null && highestScore < highestScorePrev) {
          const text = app.svg.createText(blockSize, { x: level.getWidth() * 0.5, y: 0.95, text: 'New record!', fill: 'white' });
          text.setAttribute('font-size', fontSize);
          text.setAttribute('font-weight', 'bold');
          g.appendChild(text);
        }
      }
    }
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
      } else if (secretSequence === '1414') {
        updateAutoMode(true);
      } else if (secretSequence === '4343') {
        showElem(elems.consoleLog);
      } else if (secretSequence === '3434') {
        hideElem(elems.consoleLog);
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
      completeCheck();
      updateUrl();
      draw();
    } else if (level.getState(x, y) !== app.states.none) {
      if (e.button !== 0) {
        addUndo(null);
        level.setState(x, y, app.states.none);
        level.removeR();
        completeCheck();
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
      const cursorPos = getCursorPos(elems.main.svg, e);
      const x = Math.floor(cursorPos.x / blockSize);
      const y = Math.floor(cursorPos.y / blockSize);
      return { x, y };
    }
  }

  function showElem(elem) {
    if (!elem) return;
    elem.classList.remove('hide');
  }

  function hideElem(elem) {
    if (!elem) return;
    elem.classList.add('hide');
  }

  function resize(dx, dy) {
    const w = level.getW() + dx;
    const h = level.getH() + dy;
    const s = level.getStateStr();
    if (w < 1) return;
    if (h < 1) return;
    const obj = { w, h, s };
    addUndo(null);
    applyObj(obj, { resize: true });
    level.removeR();
  }

  function addUndo(dir) {
    undoInfo.pushData({
      dir,
      w: level.getW(),
      h: level.getH(),
      s: level.getStateStr(),
    });
  }

  function replaceUrlTitle() {
    const base = location.href.split('?')[0];
    const url = base;
    history.replaceState(null, '', url);
  }

  function replaceUrl() {
    const base = location.href.split('?')[0];
    let url = `${base}?id=${levelId}`;
    if (mode === MODE.REFLECTION) url += '&r';
    if (settings.autoMode) url += '&auto';
    if (settings.debugFlag) url += '&debug';
    if (settings.mirrorFlag) url += '&mirror';
    if (settings.rotateNum !== 0) url += `&rotate=${settings.rotateNum}`;
    history.replaceState(null, '', url);
  }

  function updateButtonSpeedDisplay() {
    (settingsAuto.interval === settingsAuto.INTERVAL_MAX ? hideElem : showElem)(elems.auto.buttonSpeedDown);
    (settingsAuto.interval === 1 ? hideElem : showElem)(elems.auto.buttonSpeedUp);
  }

  function updateAutoMode(isOn) {
    settingsAuto.paused = true;
    if (isOn) {
      settings.autoMode = true;
      showElem(elems.auto.buttons);
    } else {
      settings.autoMode = false;
      hideElem(elems.auto.buttons);
    }
    updateAutoStartPauseButtons();
    updateController();
    replaceUrl();
  }

  function updateAutoStartPauseButtons() {
    if (settingsAuto.paused) {
      showElem(elems.auto.buttonStart);
      hideElem(elems.auto.buttonPause);
    } else {
      hideElem(elems.auto.buttonStart);
      showElem(elems.auto.buttonPause);
    }
  }

  function onButtonStop() {
    updateAutoMode(false);
    clearTimeout(nextLevelTimerId);
  }

  function onButtonStart() {
    console.log('levelId', levelId);
    if (levelId === null) {
      const w = level.getW();
      const h = level.getH();
      const s = level.getStateStr();
      const step = 1000; // 探索ステップ数上限値は大きな値にしておきます。時間制限もあるので、この制限にかかることはほぼないはずです。
      const levelObj = { w, h, s, step };
      // TODO low-contrastを盤面に反映させてから計算する。Promiseを使うといけそう。
      // elems.auto.buttonStart.classList.add('low-contrast');
      const result = app.solveLevelObj(null, levelObj, mode === MODE.REFLECTION);
      // elems.auto.buttonStart.classList.remove('low-contrast');
      if (result.replayStr === null) {
        window.alert(result.errorMessage);
        return;
      } else {
        console.log(result.replayStr);
        resetUndo();
        const newLevelObj = { ...levelObj, ...{ r: result.replayStr } };
        level.applyObj(newLevelObj, { init: true });
      }
    }
    settingsAuto.paused = false;
    updateAutoStartPauseButtons();
    if (completeFlag) {
      gotoNextLevel();
    }
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
    const elem = elems.consoleLog;
    const li = document.createElement('li');
    li.classList.add(className);
    li.textContent = str;
    elem.appendChild(li);
    li.addEventListener('click', function () {
      navigator.clipboard.writeText(str).then(
        () => {
          alert('【クリップボードにコピーしました】\n' + str);
        },
        () => {
          alert('クリップボードへのコピーに失敗しました。');
        });
    });

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

  function resizeWindow() {
    const WIDTH = 500;
    const HEIGHT = 688;
    if (window.innerHeight * WIDTH >= window.innerWidth * HEIGHT) {
      elems.viewport.setAttribute('content', 'width=500');
    } else {
      const width = HEIGHT * window.innerWidth / window.innerHeight;
      elems.viewport.setAttribute('content', `width=${width}`);
    }
  }
})();
