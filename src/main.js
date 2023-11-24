(function () {
  'use strict';
  const VERSION_TEXT = 'v' + '2023.11.24b';

  const app = window.app;
  Object.freeze(app);

  const elems = app.elems;
  app.common.loadLevelById = loadLevelById;

  const INPUT_INTERVAL_MSEC = 28; // この値を変更するときは、iOSの省電力モード時のsetIntervalの動作を確認した上で変更してください。詳細: https://github.com/tatt61880/symmetry-puzzle/issues/38

  const MOVE_INTERVAL_COUNT = 6;
  const MOVE_INTERVAL_MSEC = MOVE_INTERVAL_COUNT * INPUT_INTERVAL_MSEC;

  const UNDO_INTERVAL_COUNT = 5;
  const UNDO_INTERVAL_MSEC = UNDO_INTERVAL_COUNT * INPUT_INTERVAL_MSEC;

  let moveIntervalCount = MOVE_INTERVAL_COUNT;
  let input;
  const inputKeys = {};

  let settings = {
    autoMode: false,
    debugFlag: false,
    mirrorFlag: false,
    rotateNum: 0,
  };

  const settingsAuto = {
    paused: true,
    interval: MOVE_INTERVAL_COUNT,
    INTERVAL_MIN: 1,
    INTERVAL_MAX: MOVE_INTERVAL_COUNT * 3,
  };
  let nextLevelTimerId = null;
  const AUTO_NEXT_LEVEL_DELAY = 1000;

  let editMode = false;
  let temporaryShowCharsFlag = false;
  let secretSequence = '';
  let isDrawing = false;
  let isRemoving = false;
  let touchStart = false;

  let undoInfo;
  let undoFlag = false;
  let redoFlag = false;
  let undoIntervalId = null;
  let redoIntervalId = null;
  let autoIntervalId = null;

  let completeFlag = false;
  let symmetryFlag = false;

  let drawingState = app.states.none;
  const editboxFunctions = {};

  let blockSize = 0;
  const frameSize = 32;
  const frameBorderWidth = 3;

  let level = null;

  const SHADOW_MSEC = MOVE_INTERVAL_MSEC * 2;
  const ROTATION_MSEC = MOVE_INTERVAL_MSEC * 3;
  document.documentElement.style.setProperty(
    '--animation-duration',
    `${MOVE_INTERVAL_MSEC}ms`
  );
  document.documentElement.style.setProperty(
    '--animation-duration-shadow',
    `${SHADOW_MSEC}ms`
  );
  document.documentElement.style.setProperty(
    '--animation-duration-symmetry',
    `${ROTATION_MSEC}ms`
  );

  document.addEventListener('DOMContentLoaded', onloadApp);
  return;
  // ==========================================================================

  function tryMoving(dir) {
    const dys = [-1, 0, 1, 0];
    const dxs = [0, 1, 0, -1];
    const dx = dxs[dir];
    const dy = dys[dir];

    const moveFlag = level.updateMoveFlags(dx, dy);
    if (moveFlag) {
      document.documentElement.style.setProperty(
        '--animation-transform',
        `translate(${-dx * blockSize}px, ${-dy * blockSize}px)`
      );
      level.execMoveFlags();
      addUndo(dir);
    }
    return moveFlag;
  }

  function completeCheck() {
    const symmetryFlagPrev = symmetryFlag;
    completeFlag = level.isCompleted(); // 連結した対称図形であるとき
    symmetryFlag = level.isSymmetry(app.states.isTarget); // 連結しているか否かに関わらず対称図形であるとき
    const redrawFlag = completeFlag || symmetryFlag !== symmetryFlagPrev;
    if (redrawFlag) {
      const delay = settings.autoMode
        ? settingsAuto.interval * INPUT_INTERVAL_MSEC
        : MOVE_INTERVAL_MSEC;
      setTimeout(drawMainSvg, delay, true);
    }

    if (completeFlag) {
      const center = level.getCenter(app.states.isTarget);
      document.documentElement.style.setProperty(
        '--animation-origin',
        `${blockSize * center.x}px ${blockSize * center.y}px`
      );
    }
  }

  function moveButtonStart(dir, e) {
    if (!input.isEnable()) return;
    e.preventDefault();
    input.update(dir);
  }

  function undoStart() {
    if (undoFlag) return;
    undoFlag = true;
    clearTimeout(nextLevelTimerId);
    app.common.activeElem(elems.controller.undo);
    app.common.activeElem(elems.edit.undo);

    input.update(app.Input.DIRS.NEUTRAL);
    execUndo();
    undoIntervalId = setInterval(execUndo, UNDO_INTERVAL_MSEC);
  }

  function undoEnd() {
    clearInterval(undoIntervalId);
    if (!undoFlag) return;
    undoFlag = false;
    app.common.inactiveElem(elems.controller.undo);
    app.common.inactiveElem(elems.edit.undo);
  }

  function undodown(e) {
    e.preventDefault();
    undoStart();
  }

  function redoStart() {
    if (redoFlag) return;
    redoFlag = true;
    app.common.activeElem(elems.controller.redo);
    app.common.activeElem(elems.edit.redo);
    execRedo();
    redoIntervalId = setInterval(execRedo, UNDO_INTERVAL_MSEC);
  }

  function redoEnd() {
    clearInterval(redoIntervalId);
    if (!redoFlag) return;
    redoFlag = false;
    app.common.inactiveElem(elems.controller.redo);
    app.common.inactiveElem(elems.edit.redo);
  }

  function redodown(e) {
    e.preventDefault();
    redoStart();
  }

  function pointerup() {
    undoEnd();
    redoEnd();
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

  async function keydown(e) {
    if (e.altKey) return;

    // 記録ダイアログで有効
    if (elems.records.dialog.open) {
      return;
    }

    // ヘルプダイアログで有効
    if (elems.help.dialog.open) {
      if (e.ctrlKey) return;
      switch (e.key) {
        case '?':
          app.dialog.help.close();
          break;
        case '+':
          elems.help.tabSymmetry.checked = true;
          break;
        case 't':
          elems.help.tabLine.checked = true;
          break;
        case 'z':
          elems.help.tabPoint.checked = true;
          break;
      }
      return;
    }

    // レベル一覧ダイアログで有効
    if (elems.levels.dialog.open) {
      if (e.ctrlKey) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'k':
          app.dialog.levels.selectUp();
          break;
        case 'ArrowRight':
        case 'd':
        case 'l':
          if (e.shiftKey) {
            app.dialog.levels.nextPage();
          } else {
            app.dialog.levels.selectRight();
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'j':
          app.dialog.levels.selectDown();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'h':
          if (e.shiftKey) {
            app.dialog.levels.prevPage();
          } else {
            app.dialog.levels.selectLeft();
          }
          break;
        case 'Enter':
          app.dialog.levels.selectEnter();
          break;
        case '#':
          app.dialog.levels.close();
          break;
      }
      return;
    }

    // どの画面でも有効
    switch (e.key) {
      case '?':
        if (!e.ctrlKey) {
          app.dialog.help.show();
          return;
        }
        break;
      case '+':
      case 'Home':
        if (!e.ctrlKey) {
          gotoTitlePage();
          return;
        }
        break;
    }

    // タイトル画面で有効
    if (app.common.isShownElem(elems.category.title)) {
      if (e.shiftKey) return;
      if (e.ctrlKey) return;
      switch (e.key) {
        case 't':
          updateCheckMode(app.Level.CHECK_MODE.LINE);
          onloadId(1);
          break;
        case 'z':
          updateCheckMode(app.Level.CHECK_MODE.POINT);
          onloadId(1);
          break;
      }
      return;
    }

    if (e.key === '#') {
      if (e.ctrlKey) return;
      app.dialog.levels.show();
      return;
    }

    if (e.ctrlKey) {
      switch (e.key) {
        // Ctrl + V: クリップボード内のオブジェクトデータを実行
        case 'v': {
          let clip = await navigator.clipboard.readText();
          clip = clip.replace(/(\w+):/g, '"$1":');
          clip = clip.replace(/[\d\D]*?({.*})[\d\D]*/, '$1');
          clip = clip.replaceAll("'", '"');
          const levelObj = JSON.parse(clip);
          onloadObj(levelObj);
          updateAutoMode(true);
          onButtonStart();
          break;
        }
      }
    } else if (e.shiftKey) {
      switch (e.key) {
        case 'ArrowLeft': {
          // Shift + ←
          gotoPrevLevel();
          break;
        }
        case 'ArrowRight':
          // Shift + →
          gotoNextLevel();
          break;
        case 'Z':
          // Shift + Z
          redoStart();
          break;
      }
    } else if (e.key === 'Enter') {
      if (app.common.isHiddenElem(elems.controller.nextLevel)) return;
      gotoNextLevel();
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
        drawMainSvg();
      }
    } else if (e.key === '@') {
      toggleEditLevel();
    } else if (e.key === 'r') {
      retryLevel();
    } else if (e.key === 'z') {
      undoStart();
    } else if (e.key === 'y') {
      redoStart();
    } else {
      if (!settings.autoMode) {
        const dir = (() => {
          if (editMode && e.key.length === 1) {
            return null;
          }
          switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'k':
              return app.Input.DIRS.UP;
            case 'ArrowRight':
            case 'd':
            case 'l':
              return app.Input.DIRS.RIGHT;
            case 'ArrowDown':
            case 's':
            case 'j':
              return app.Input.DIRS.DOWN;
            case 'ArrowLeft':
            case 'a':
            case 'h':
              return app.Input.DIRS.LEFT;
          }
          return null;
        })();

        if (dir !== null) {
          e.preventDefault();
          input.update(dir);
          inputKeys[e.key] = true;
        }
      }
    }

    if (editMode) {
      if (editboxFunctions[e.key]) {
        editboxFunctions[e.key]();
      }
    } else {
      switch (e.key) {
        case '1':
          secretSequenceAdd('1');
          break;
        case '2':
          secretSequenceAdd('2');
          break;
        case '3':
          secretSequenceAdd('3');
          break;
        case '4':
          secretSequenceAdd('4');
          break;
        default:
          secretSequenceReset();
      }
    }
    return;
  }

  function keyup(e) {
    if (app.common.isShownElem(elems.category.title)) return;
    delete inputKeys[e.key];
    if (temporaryShowCharsFlag && e.key === ' ') {
      temporaryShowCharsFlag = false;
      drawMainSvg();
    }

    if (Object.keys(inputKeys).length === 0) {
      undoEnd();
      redoEnd();

      if (!settings.autoMode) {
        input.update(app.Input.DIRS.NEUTRAL);
      }
    }
    return false;
  }

  function retryLevel() {
    window.getSelection().removeAllRanges();

    clearTimeout(nextLevelTimerId);

    app.common.activeElem(elems.level.retry);
    elems.main.svg.textContent = '';

    const RESET_DELAY = 50;
    setTimeout(() => {
      app.common.inactiveElem(elems.level.retry);
      loadLevelObj(level.getLevelObj(), { reset: true });
    }, RESET_DELAY);
  }

  function resetUndo() {
    undoInfo = new app.UndoInfo();
    app.common.hideElem(elems.controller.undo);
    app.common.hideElem(elems.edit.undo);
    app.common.hideElem(elems.controller.redo);
    app.common.hideElem(elems.edit.redo);
  }

  function initLevel({ levelObj, initParam }) {
    level = new app.Level({
      levelObj,
      checkMode: app.common.checkMode,
      ...initParam,
    });
    addUndo(null);
    updateSvg();
  }

  function onWindowResize() {
    updateSvg();
  }

  function updateSvg() {
    if (app.common.isHiddenElem(elems.category.game)) return;

    const divMainHeight =
      window.innerHeight -
      10 -
      [
        elems.header,
        elems.level.widget,
        elems.auto.buttons,
        elems.controller.widget,
        elems.edit.widget,
        elems.url.div,
        elems.footer,
      ].reduce((sum, elem) => sum + elem.getBoundingClientRect().height, 0);
    elems.main.div.style.setProperty('height', `${divMainHeight}px`);

    const svgMaxWidth = 490;
    const svgMaxHeight = divMainHeight;
    blockSize = Math.min(
      (svgMaxWidth - 2 * frameSize) / level.getWidth(),
      (svgMaxHeight - 2 * frameSize) / level.getHeight()
    );
    blockSize = Math.max(blockSize, 0);
    completeCheck();
    updateLinkUrl();

    elems.main.svg.setAttribute(
      'width',
      blockSize * level.getWidth() + 2 * frameSize
    );
    elems.main.svg.setAttribute(
      'height',
      blockSize * level.getHeight() + 2 * frameSize
    );
    drawMainSvg();
  }

  function execUndo() {
    window.getSelection().removeAllRanges();

    if (undoInfo.isUndoable()) {
      const data = undoInfo.undo();
      updateController();

      app.common.showElem(elems.controller.redo);
      app.common.showElem(elems.edit.redo);
      if (!undoInfo.isUndoable()) {
        app.common.hideElem(elems.controller.undo);
        app.common.hideElem(elems.edit.undo);
      }
      const resizeFlag = level.getW() !== data.w || level.getH() !== data.h;
      level.applyObj(data, resizeFlag);
      updateSvg();
    }
  }

  function execRedo() {
    window.getSelection().removeAllRanges();

    if (undoInfo.isRedoable()) {
      const data = undoInfo.redo();
      const resizeFlag = level.getW() !== data.w || level.getH() !== data.h;
      level.applyObj(data, resizeFlag);
      updateSvg();
      app.common.showElem(elems.controller.undo);
      app.common.showElem(elems.edit.undo);
      if (!undoInfo.isRedoable()) {
        app.common.hideElem(elems.controller.redo);
        app.common.hideElem(elems.edit.redo);
      }
    }
  }

  function createObjById(id_) {
    const digits = [];
    let id = Math.floor(id_);
    if (id !== id_) {
      loadLevelById(id);
      return;
    }

    const digitStates = {
      0: '000111001111111101111111111111111',
      1: '000101001001001101100100001101101',
      2: '111101001111111111111111001111111',
      3: '000101001100001001001101001101001',
      4: '000111001111111001111111001111111',
    };

    app.common.levelId = id;
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
    window.getSelection().removeAllRanges();

    clearTimeout(nextLevelTimerId);
    const id = Number(id_);
    app.common.levelId = id;
    let levelObj;
    if (app.common.levelsList[app.common.levelId] !== undefined) {
      levelObj = app.common.levelsList[app.common.levelId];
    } else if (app.common.levelsListEx[app.common.levelId] !== undefined) {
      levelObj = app.common.levelsListEx[app.common.levelId];
    }
    consoleLog(
      `[LEVEL ${id}]${
        levelObj?.subject !== undefined ? ` ${levelObj.subject}` : ''
      }`
    );

    loadLevelObj(
      levelObj !== undefined ? levelObj : createObjById(app.common.levelId)
    );
    if (isLocalhost()) {
      level.printSolveJsStr();
    }
    updateLevelVisibility();
    elems.level.id.textContent = app.common.levelId;
    replaceUrl();

    if (id_ === 1) {
      // レベル1をロード時、レベル1を未クリアのときはヘルプ画面を表示する。
      const isLineMode = level.isLineMode();
      const playerScore = app.savedata.getHighestScore(levelObj, isLineMode);
      if (playerScore === null) {
        app.dialog.help.show();
      }
    }
  }

  function loadLevelObj(levelObj, param = {}) {
    const initParam = {};
    if (!param.reset) {
      initParam.mirrorFlag = settings.mirrorFlag;
      initParam.rotateNum = settings.rotateNum;
    }

    resetUndo();
    initLevel({ levelObj, initParam });

    input.update(app.Input.DIRS.NEUTRAL);
    moveIntervalCount = MOVE_INTERVAL_COUNT;

    if (settings.autoMode) {
      updateAutoMode(true);
    }
  }

  function showLevelPrev() {
    if (app.common.levelId === null) return false;
    if (app.common.levelId === 0) return false;
    if (app.common.levelId === 1) return false;
    if (app.common.levelsList[app.common.levelId] !== undefined)
      return app.common.levelsList[app.common.levelId - 1] !== undefined;
    if (isNaN(app.common.levelId)) return false;
    if (app.common.levelsListEx[app.common.levelId] !== undefined)
      return app.common.levelsListEx[app.common.levelId - 1] !== undefined;
    return (
      app.common.levelsList[app.common.levelId - 1] === undefined &&
      app.common.levelsListEx[app.common.levelId - 1] === undefined
    );
  }

  function showLevelNext() {
    if (app.common.levelId === null) return false;
    if (app.common.levelId === -1) return false;
    if (app.common.levelId === 0) return false;
    if (app.common.levelsList[app.common.levelId] !== undefined)
      return app.common.levelsList[app.common.levelId + 1] !== undefined;
    if (isNaN(app.common.levelId)) return false;
    if (app.common.levelsListEx[app.common.levelId] !== undefined)
      return app.common.levelsListEx[app.common.levelId + 1] !== undefined;
    return (
      app.common.levelsList[app.common.levelId + 1] === undefined &&
      app.common.levelsListEx[app.common.levelId + 1] === undefined
    );
  }

  function updateLevelVisibility() {
    (showLevelPrev() ? app.common.showElem : app.common.hideElem)(
      elems.level.prev
    );
    (showLevelNext() ? app.common.showElem : app.common.hideElem)(
      elems.level.next
    );
    (app.common.levelId !== null ? app.common.showElem : app.common.hideElem)(
      elems.level.id
    );
    (app.common.levelId !== null ? app.common.showElem : app.common.hideElem)(
      elems.levels.button
    );
    (app.common.levelId === null ? app.common.showElem : app.common.hideElem)(
      elems.level.edit
    );
  }

  function gotoPrevLevel() {
    if (!showLevelPrev()) return;
    loadLevelById(app.common.levelId - 1);
  }

  function gotoNextLevel() {
    if (!showLevelNext()) return;
    loadLevelById(app.common.levelId + 1);
  }

  function gotoNextLevelButton() {
    const style = window.getComputedStyle(elems.controller.nextLevel);
    if (style.opacity > 0.5) {
      gotoNextLevel();
    }
  }

  function updateLinkUrl() {
    if (!editMode) return;
    const url = level.getUrlStr(level.isLineMode());
    elems.url.a.innerHTML = `<a href="${url}">現在の盤面を0手目として完成！</a>`;
  }

  function updateEditMode(isOn) {
    editMode = isOn;
    if (editMode) {
      app.common.showElem(elems.url.div);
      app.common.showElem(elems.edit.widget);
      app.common.hideElem(elems.controller.widget);
      app.common.hideElem(elems.level.retry);
      updateLinkUrl();
    } else {
      app.common.hideElem(elems.url.div);
      app.common.hideElem(elems.edit.widget);
      app.common.showElem(elems.controller.widget);
      app.common.showElem(elems.level.retry);
    }
  }

  function toggleEditLevel() {
    editMode = !editMode;
    app.common.levelId = null;
    updateLevelVisibility();
    updateEditMode(editMode);
    drawMainSvg();
  }

  function updateCheckMode(mode) {
    app.common.checkMode = mode;
    const className = (() => {
      switch (mode) {
        case app.Level.CHECK_MODE.POINT:
          return 'point';
        case app.Level.CHECK_MODE.LINE:
          return 'line';
        default:
          return 'none';
      }
    })();

    for (const elem of document.getElementsByClassName('check-mode')) {
      elem.classList.add('hide-mode');
    }
    for (const elem of document.getElementsByClassName(
      `check-mode ${className}`
    )) {
      elem.classList.remove('hide-mode');
    }
    animateIcons();
  }

  function animateIcons() {
    if (elems.help.dialog.open) return; // ダイアログ表示中にアニメーションするとSafariで画面がちらつく問題があるため。

    addAnimationClass(elems.iconApp, 'animation-icon-app');
    addAnimationClass(elems.iconLine, 'animation-icon-line');
    addAnimationClass(elems.iconPoint, 'animation-icon-point');
  }

  function removeAnimationClass(elem, className) {
    elem.classList.remove(className);
  }

  function addAnimationClass(elem, className) {
    removeAnimationClass(elem, className);
    setTimeout(() => {
      elem.classList.add(className);
    }, 100);
  }

  function applyLang(lang) {
    window.getSelection().removeAllRanges();

    for (const elem of document.getElementsByClassName('setting-lang-button')) {
      elem.classList.remove('active');
    }
    const langButton = document.getElementById(`setting-lang-${lang}`);
    langButton.classList.add('active');
    for (const elem of document.getElementsByClassName('translatable')) {
      elem.classList.add('hide-lang');
    }

    for (const elem of document.getElementsByClassName(
      `translatable ${lang}`
    )) {
      elem.classList.remove('hide-lang');
    }

    for (const elem of document.getElementsByClassName(`translatable-toggle`)) {
      if (elem instanceof SVGTextElement) {
        elem.textContent = elem.dataset[lang];
      } else {
        elem.innerText = elem.dataset[lang];
      }
    }
  }

  function selectLang(lang) {
    applyLang(lang);
    app.savedata.saveLang(lang);
  }

  function onloadApp() {
    elems.version.textContent = VERSION_TEXT;

    initElems();
    updateEditMode(false);

    window.onresize = resizeWindow;
    resizeWindow();

    let lang = app.savedata.loadLang();
    if (lang === undefined) {
      switch (window.navigator.language) {
        case 'ja':
          lang = 'ja';
          break;
        default:
          lang = 'en';
      }
      app.savedata.saveLang(lang);
      app.dialog.help.show();
    }
    applyLang(lang);

    const queryParams = app.analyzeUrl();
    settings = queryParams.settings;

    setInterval(intervalFunc, INPUT_INTERVAL_MSEC);

    const id = queryParams.id;

    if (id === null && queryParams.levelObj.s === '') {
      gotoTitlePage();
      return;
    }

    if (settings.line) {
      updateCheckMode(app.Level.CHECK_MODE.LINE);
    } else {
      updateCheckMode(app.Level.CHECK_MODE.POINT);
    }

    if (id !== null) {
      onloadId(id);
    } else {
      const id = getId(queryParams.levelObj);
      if (id === null) {
        onloadObj(queryParams.levelObj);
      } else {
        onloadId(id);
      }
    }
  }

  function getId(queryObj) {
    switch (app.common.checkMode) {
      case app.Level.CHECK_MODE.POINT:
        app.common.levelsList = app.levelsPoint;
        app.common.levelsListEx = app.levelsPointEx;
        break;
      case app.Level.CHECK_MODE.LINE:
        app.common.levelsList = app.levelsLine;
        app.common.levelsListEx = app.levelsLineEx;
        break;
      default:
        app.common.levelsList = null;
        app.common.levelsListEx = null;
    }

    for (let id = 0; id < app.common.levelsList.length; ++id) {
      const levelObj = app.common.levelsList[id];
      if (
        levelObj.w === queryObj.w &&
        levelObj.h === queryObj.h &&
        levelObj.s === queryObj.s
      ) {
        return id;
      }
    }
    for (const id of Object.keys(app.common.levelsListEx).sort()) {
      if (String(id) === 'NaN') continue;
      const levelObj = app.common.levelsListEx[id];
      if (
        levelObj.w === queryObj.w &&
        levelObj.h === queryObj.h &&
        levelObj.s === queryObj.s
      ) {
        return id;
      }
    }
    return null;
  }

  function gotoTitlePage() {
    completeFlag = false;
    window.getSelection().removeAllRanges();

    updateCheckMode(null);
    app.common.showElem(elems.category.title);
    app.common.hideElem(elems.category.game);
    updateAutoMode(false);
    replaceUrlTitle();
  }

  function onloadId(id_) {
    window.getSelection().removeAllRanges();

    if (editMode) {
      toggleEditLevel();
    }

    switch (app.common.checkMode) {
      case app.Level.CHECK_MODE.POINT:
        app.common.levelsList = app.levelsPoint;
        app.common.levelsListEx = app.levelsPointEx;
        break;
      case app.Level.CHECK_MODE.LINE:
        app.common.levelsList = app.levelsLine;
        app.common.levelsListEx = app.levelsLineEx;
        break;
      default:
        app.common.levelsList = null;
        app.common.levelsListEx = null;
    }

    app.common.hideElem(elems.category.title);
    app.common.showElem(elems.category.game);
    app.common.showElem(elems.main.div);
    app.common.showElem(elems.level.widget);
    app.common.showElem(elems.svgDiv);
    app.common.showElem(elems.controller.widget);

    let id = id_;
    if (id === null) id = 1;
    loadLevelById(id);
  }

  function onloadObj(obj) {
    window.getSelection().removeAllRanges();

    app.common.hideElem(elems.category.title);
    app.common.showElem(elems.category.game);
    app.common.showElem(elems.main.svg);
    app.common.showElem(elems.level.widget);
    app.common.showElem(elems.svgDiv);
    app.common.hideElem(elems.auto.buttons);
    app.common.showElem(elems.controller.widget);

    app.common.levelId = null;
    updateLevelVisibility();
    loadLevelObj(obj);
  }

  function initElems() {
    onWindowResize();

    let setTimeoutIdOnWindowResize = null;
    window.addEventListener('resize', () => {
      if (setTimeoutIdOnWindowResize !== null) {
        clearTimeout(setTimeoutIdOnWindowResize);
      }
      setTimeoutIdOnWindowResize = setTimeout(onWindowResize, 100);
    });

    {
      const touchDevice = document.ontouchstart !== undefined;

      elems.contents.addEventListener('mousedown', (e) => {
        // ダブルタップしたときの画面の拡大縮小をしないようにする。
        e.preventDefault();
      });

      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      elems.contents.addEventListener(pointermoveEventName, (e) => {
        if (app.common.isShownElem(elems.console.widget)) return;
        // スワイプ操作を無効化する。
        e.preventDefault();
      });
    }

    elems.top.addEventListener('click', gotoTitlePage);

    initElemsAuto();
    initElemsEdit();
    initElemsHelp();
    initElemsTitle();
    initElemsRecords();
    initElemsLevelWidget();
    initElemsLevelsDialog();

    // キー入力用
    {
      document.addEventListener('keydown', keydown);
      document.addEventListener('keyup', keyup);
    }

    // タッチ入力用
    {
      const touchDevice = app.common.isTouchDevice();
      const pointerdownEventName = touchDevice ? 'touchstart' : 'mousedown';
      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      const pointerupEventName = touchDevice ? 'touchend' : 'mouseup';

      elems.main.svg.addEventListener(pointerdownEventName, pointerDown);
      elems.main.svg.addEventListener(pointermoveEventName, pointerMove);
      elems.main.svg.addEventListener(pointerupEventName, pointerUp);
      elems.main.svg.oncontextmenu = function () {
        return !editMode;
      };

      elems.controller.undo.addEventListener(pointerdownEventName, undodown);
      elems.edit.undo.addEventListener(pointerdownEventName, undodown);

      elems.controller.redo.addEventListener(pointerdownEventName, redodown);
      elems.edit.redo.addEventListener(pointerdownEventName, redodown);

      elems.controller.buttons.up.addEventListener(
        pointerdownEventName,
        moveButtonStart.bind(null, app.Input.DIRS.UP)
      );
      elems.controller.buttons.right.addEventListener(
        pointerdownEventName,
        moveButtonStart.bind(null, app.Input.DIRS.RIGHT)
      );
      elems.controller.buttons.down.addEventListener(
        pointerdownEventName,
        moveButtonStart.bind(null, app.Input.DIRS.DOWN)
      );
      elems.controller.buttons.left.addEventListener(
        pointerdownEventName,
        moveButtonStart.bind(null, app.Input.DIRS.LEFT)
      );

      elems.controller.nextLevel.addEventListener('click', gotoNextLevelButton);

      elems.controller.buttons.menu.addEventListener(
        pointerdownEventName,
        onButtonMenu
      );
      elems.controller.buttons.title.addEventListener('click', gotoTitlePage);
      elems.controller.buttons.retry.addEventListener('click', retryLevel);

      document.addEventListener(pointerupEventName, pointerup);

      input = new app.Input(elems.controller.buttons);
    }

    function onButtonMenu() {
      if (app.common.isShownElem(elems.controller.buttons.root)) {
        app.common.hideElem(elems.controller.buttons.root);
        app.common.showElem(elems.controller.menu);
      } else {
        app.common.showElem(elems.controller.buttons.root);
        app.common.hideElem(elems.controller.menu);
      }
    }
  }

  // Autoモード用
  function initElemsAuto() {
    elems.auto.buttonStop.addEventListener('click', onButtonStop);
    elems.auto.buttonStart.addEventListener('click', onButtonStart);
    elems.auto.buttonPause.addEventListener('click', onButtonPause);
    elems.auto.buttonEnd.addEventListener('click', onButtonEnd);
    elems.auto.buttonSpeedDown.addEventListener('click', onButtonSpeedDown);
    elems.auto.buttonSpeedUp.addEventListener('click', onButtonSpeedUp);
  }

  // Editモード用
  function initElemsEdit() {
    for (const char in app.states.charToState) {
      const elem = document.getElementById(`edit_${char}`);
      if (elem === null) continue;

      {
        const levelForEditChar = new app.Level({
          levelObj: { w: 3, h: 3, s: `-0${char}` },
          checkMode: app.Level.CHECK_MODE.POINT,
        });
        const g = levelForEditChar.createSvgG({
          blockSize: 40,
          showCharsFlag: true,
          drawBackground: char === '0',
          x0: 2,
          y0: 2,
          width: 1,
          height: 1,
        });
        elem.appendChild(g);

        const func = () => {
          elems.edit.drawing.innerHTML = '';
          elems.edit.drawing.appendChild(g.cloneNode(true));
          const state = app.states.charToState[char];
          drawingState = state;
        };
        editboxFunctions[char] = func;
        if (char === '0') {
          editboxFunctions[' '] = func;
        }
        elem.addEventListener('click', func);
      }
    }
    editboxFunctions[app.states.stateToChar[app.states.none]]();

    elems.edit.switchMode.addEventListener('click', () => {
      if (level.isLineMode()) {
        updateCheckMode(app.Level.CHECK_MODE.POINT);
      } else {
        updateCheckMode(app.Level.CHECK_MODE.LINE);
      }
      const w = level.getW();
      const h = level.getH();
      const s = level.getS();
      const levelObj = { w, h, s };
      level = new app.Level({ levelObj, checkMode: app.common.checkMode });
      completeCheck();
      updateLinkUrl();
      drawMainSvg();
    });
    elems.edit.mirror.addEventListener('click', () => {
      level.mirror();
      addUndo(null);
      updateLinkUrl();
      drawMainSvg();
    });
    elems.edit.rotate.addEventListener('click', () => {
      level.rotate(1);
      addUndo(null);
      updateLinkUrl();
      drawMainSvg();
      updateSvg();
    });
    elems.edit.normalize.addEventListener('click', () => {
      if (!level.isNormalized()) {
        level.normalize();
        addUndo(null);
        updateLinkUrl();
        drawMainSvg();
      }
    });
  }

  // ヘルプ画面用
  function initElemsHelp() {
    elems.help.button.addEventListener('click', app.dialog.help.show);
    elems.help.dialog.addEventListener('click', app.dialog.help.close);
    elems.help.close.addEventListener('click', app.dialog.help.close);
    elems.help.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
    elems.help.langEn.addEventListener('click', () => selectLang('en'));
    elems.help.langJa.addEventListener('click', () => selectLang('ja'));
  }

  // タイトル画面用
  function initElemsTitle() {
    elems.title.buttonPlayLine.addEventListener('click', () => {
      updateCheckMode(app.Level.CHECK_MODE.LINE);
      onloadId(1);
    });

    elems.title.buttonPlayPoint.addEventListener('click', () => {
      updateCheckMode(app.Level.CHECK_MODE.POINT);
      onloadId(1);
    });
  }

  // 記録画面用
  function initElemsRecords() {
    const size = 50;
    const crown = app.common.createCrown(size, 0, 0, 1, 1);
    elems.records.buttonSvg.appendChild(crown);
    elems.records.button.addEventListener('click', app.dialog.records.show);
    elems.records.dialog.addEventListener('click', app.dialog.records.close);
    elems.records.close.addEventListener('click', app.dialog.records.close);
    elems.records.dialogDiv.addEventListener('click', (e) =>
      e.stopPropagation()
    );
  }

  // レベル操作用
  function initElemsLevelWidget() {
    elems.level.retry.addEventListener('click', retryLevel);
    elems.level.prev.addEventListener('click', gotoPrevLevel);
    elems.level.next.addEventListener('click', gotoNextLevel);
    elems.level.edit.addEventListener('click', toggleEditLevel);
    elems.levels.button.addEventListener('click', app.dialog.levels.show);
    elems.levels.dialog.addEventListener('click', app.dialog.levels.close);
    elems.levels.dialogDiv.addEventListener('click', (e) =>
      e.stopPropagation()
    );
    [
      elems.levels.checkbox.shortest,
      elems.levels.checkbox.cleared,
      elems.levels.checkbox.notCleared,
    ].forEach((elem) => {
      elem.addEventListener('click', app.dialog.levels.update);
    });
  }

  // レベル一覧ダイアログ
  function initElemsLevelsDialog() {
    elems.levels.close.addEventListener('click', app.dialog.levels.close);
    elems.levels.prev.addEventListener('click', app.dialog.levels.prevPage);
    elems.levels.next.addEventListener('click', app.dialog.levels.nextPage);
  }

  function intervalFunc() {
    if (level === null) return;
    if (settings.autoMode) return;

    if (moveIntervalCount >= MOVE_INTERVAL_COUNT) {
      inputFunc();
    } else {
      moveIntervalCount++;
    }
  }

  function inputFunc() {
    if (input.inputDir === app.Input.DIRS.NEUTRAL) return;
    if (undoFlag) return;
    if (redoFlag) return;
    if (completeFlag) return;

    if (settings.autoMode) {
      input.update(input.inputDir);
    }
    moveIntervalCount = 0;

    const classAnimationIllegalMove = 'animation-illegal-move';
    removeAnimationClass(elems.main.svg, classAnimationIllegalMove);

    const movedFlag = tryMoving(input.inputDir);
    if (movedFlag) {
      drawMainSvg();
      completeCheck();
      updateLinkUrl();
    } else {
      const dys = [-1, 0, 1, 0];
      const dxs = [0, 1, 0, -1];
      const dy = dys[input.inputDir];
      const dx = dxs[input.inputDir];

      const pixel = 4;
      document.documentElement.style.setProperty(
        '--animation-illegal-move',
        `translate(${dx * pixel}px, ${dy * pixel}px)`
      );

      drawMainSvg(); // 目の向きをリセットするために、描画し直します。
      // 動けないときは盤面を振動させます。
      addAnimationClass(elems.main.svg, classAnimationIllegalMove);
    }
  }

  function updateController() {
    app.common.showElem(elems.controller.buttons.root);
    app.common.hideElem(elems.controller.menu);
    if (completeFlag) {
      app.common.hideElem(elems.controller.buttons.base);
      if (app.common.isShownElem(elems.level.next)) {
        app.common.showElem(elems.controller.nextLevel);
      }
    } else {
      app.common.showElem(elems.controller.buttons.base);
      app.common.hideElem(elems.controller.nextLevel);
    }
  }

  // 描画
  function drawMainSvg(completeCheckFlag = false) {
    updateController();

    const mainSvgG = app.svg.createG();

    const classAnimationIllegalMove = 'animation-illegal-move';
    removeAnimationClass(elems.main.svg, classAnimationIllegalMove);
    elems.main.svg.textContent = '';
    elems.main.svg.appendChild(mainSvgG);

    {
      const symmetryAnimationFlag = completeCheckFlag && completeFlag;
      const showCharsFlag =
        editMode || settings.debugFlag || temporaryShowCharsFlag;
      drawLevel(mainSvgG, symmetryAnimationFlag, showCharsFlag);
    }
    level.resetMoveFlags();

    drawDotLines(mainSvgG);
    drawFrame(mainSvgG);
  }

  function drawLevel(mainSvgG, symmetryAnimationFlag, showCharsFlag) {
    const levelSvgG = level.createSvgG({
      blockSize,
      symmetryAnimationFlag,
      showCharsFlag,
    });
    levelSvgG.setAttribute('transform', `translate(${frameSize},${frameSize})`);
    levelSvgG.style.setProperty('pointer-events', 'none'); // スマホ等での操作時にtouchstartからtouchendまで連続して図形描画するため。

    mainSvgG.appendChild(levelSvgG);
  }

  function drawDotLines(mainSvgG) {
    const dotRatio = 1 / 40;
    const size = blockSize * dotRatio;
    const strokeDasharray = `${size} ${4 * size}`;
    const g = app.svg.createG();
    mainSvgG.appendChild(g);
    // 横線
    for (let y = 1; y < level.getHeight(); ++y) {
      const line = app.svg.createLine(blockSize, {
        x1: -0.5 * dotRatio,
        y1: y,
        x2: level.getWidth(),
        y2: y,
        stroke: app.colors.line,
      });
      line.setAttribute('stroke-dasharray', strokeDasharray);
      g.appendChild(line);
    }
    // 縦線
    for (let x = 1; x < level.getWidth(); ++x) {
      const line = app.svg.createLine(blockSize, {
        x1: x,
        y1: -0.5 * dotRatio,
        x2: x,
        y2: level.getHeight(),
        stroke: app.colors.line,
      });
      line.setAttribute('stroke-dasharray', strokeDasharray);
      g.appendChild(line);
    }
    g.setAttribute('transform', `translate(${frameSize},${frameSize})`);
  }

  function drawFrame(mainSvgG) {
    const g = app.svg.createG();
    mainSvgG.appendChild(g);

    {
      const frameColor = app.colors.frame;
      const rectU = app.svg.createRect(1, {
        x: 0,
        y: 0,
        width: level.getWidth() * blockSize + 2 * frameSize,
        height: frameSize,
        fill: frameColor,
      });
      const rectR = app.svg.createRect(1, {
        x: level.getWidth() * blockSize + frameSize,
        y: 0,
        width: frameSize,
        height: level.getHeight() * blockSize + 2 * frameSize,
        fill: frameColor,
      });
      const rectD = app.svg.createRect(1, {
        x: 0,
        y: level.getHeight() * blockSize + frameSize,
        width: level.getWidth() * blockSize + 2 * frameSize,
        height: frameSize,
        fill: frameColor,
      });
      const rectL = app.svg.createRect(1, {
        x: 0,
        y: 0,
        width: frameSize,
        height: level.getHeight() * blockSize + 2 * frameSize,
        fill: frameColor,
      });
      g.appendChild(rectU);
      g.appendChild(rectR);
      g.appendChild(rectD);
      g.appendChild(rectL);

      const borderColor = app.colors.frameBorder;
      const rectUb = app.svg.createRect(1, {
        x: 0,
        y: 0,
        width: level.getWidth() * blockSize + 2 * frameSize,
        height: frameBorderWidth,
        fill: borderColor,
      });
      const rectRb = app.svg.createRect(1, {
        x: level.getWidth() * blockSize + 2 * frameSize - frameBorderWidth,
        y: 0,
        width: frameBorderWidth,
        height: level.getHeight() * blockSize + 2 * frameSize,
        fill: borderColor,
      });
      const rectDb = app.svg.createRect(1, {
        x: 0,
        y: level.getHeight() * blockSize + 2 * frameSize - frameBorderWidth,
        width: level.getWidth() * blockSize + 2 * frameSize,
        height: frameBorderWidth,
        fill: borderColor,
      });
      const rectLb = app.svg.createRect(1, {
        x: 0,
        y: 0,
        width: frameBorderWidth,
        height: level.getHeight() * blockSize + 2 * frameSize,
        fill: borderColor,
      });
      g.appendChild(rectUb);
      g.appendChild(rectRb);
      g.appendChild(rectDb);
      g.appendChild(rectLb);
    }

    if (editMode) {
      if (!level.isNormalized()) {
        const fontSize = `${frameSize * 0.7}px`;
        const text = app.svg.createText(frameSize, {
          x: 0,
          y: 0.5,
          text: 'Not normalized',
          fill: '#aa33aa',
        });
        const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
        const height = frameBorderWidth;
        text.setAttribute('font-size', fontSize);
        text.setAttribute('transform', `translate(${width},${height})`);
        g.appendChild(text);
      }

      // サイズ変更ボタンの追加
      {
        const cx1 = frameSize / blockSize + 0.5;
        const cx2 = frameSize / blockSize + level.getWidth() * 0.3;
        const cx3 = frameSize / blockSize + level.getWidth() * 0.7;
        const cx4 = frameSize / blockSize + level.getWidth() - 0.5;

        const cy1 = frameSize / blockSize + 0.5;
        const cy2 = frameSize / blockSize + level.getHeight() * 0.3;
        const cy3 = frameSize / blockSize + level.getHeight() * 0.7;
        const cy4 = frameSize / blockSize + level.getHeight() - 0.5;

        const pointsR = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 1],
          [-1, -1],
        ];
        const pointsL = [
          [0, -1],
          [1, -1],
          [1, 1],
          [0, 1],
          [-1, 0],
        ];
        const pointsD = [
          [1, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
          [-1, -1],
        ];
        const pointsU = [
          [0, -1],
          [1, 0],
          [1, 1],
          [-1, 1],
          [-1, 0],
        ];

        const buttons = [
          // 左右
          { cx: cx1, cy: cy2, points: pointsR, dx: -1, dy: 0, flag: true },
          { cx: cx1, cy: cy3, points: pointsL, dx: +1, dy: 0, flag: true },
          { cx: cx4, cy: cy2, points: pointsL, dx: -1, dy: 0, flag: false },
          { cx: cx4, cy: cy3, points: pointsR, dx: +1, dy: 0, flag: false },

          // 上下
          { cx: cx2, cy: cy1, points: pointsD, dx: 0, dy: -1, flag: true },
          { cx: cx3, cy: cy1, points: pointsU, dx: 0, dy: +1, flag: true },
          { cx: cx2, cy: cy4, points: pointsU, dx: 0, dy: -1, flag: false },
          { cx: cx3, cy: cy4, points: pointsD, dx: 0, dy: +1, flag: false },
        ];

        buttons.forEach((button) => {
          if (button.dx === -1 && level.getW() <= 1) return;
          if (button.dy === -1 && level.getH() <= 1) return;
          if (button.dx === 1 && level.getW() >= app.common.maxEditW) return;
          if (button.dy === 1 && level.getH() >= app.common.maxEditH) return;

          const points = [];
          for (const point of button.points) {
            points.push([
              button.cx + 0.45 * point[0],
              button.cy + 0.45 * point[1],
            ]);
          }

          const polygon = app.svg.createPolygon(blockSize, {
            points,
            fill: '#e5a0e5',
            stroke: '#aa33aa',
            strokeWidth: 0.1,
          });
          polygon.classList.add('button');
          polygon.addEventListener('click', () => {
            resizeLevel(button.dx, button.dy, button.flag);
          });
          g.appendChild(polygon);

          const char = button.dx + button.dy > 0 ? '+' : '-';
          const text = app.svg.createText(blockSize, {
            x: button.cx,
            y: button.cy,
            text: char,
            fill: '#aa33aa',
          });
          text.setAttribute('font-size', `${blockSize * 0.7}px`);
          g.appendChild(text);
        });
      }
    } else {
      const fontSize = `${frameSize * 0.7}px`;
      const fontSize2 = `${blockSize * 0.7}px`;
      const bestStep = level.getBestStep();

      let highestScorePrev = null;

      // クリア時のメッセージ
      if (completeFlag) {
        const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
        const height = (level.getHeight() - 0.5 + 0.05) * blockSize + frameSize;
        const text = app.svg.createText(blockSize, {
          x: width / blockSize,
          y: height / blockSize,
          text: 'Congratulations!',
          fill: app.colors.congratulations,
        });
        text.setAttribute('font-size', fontSize2);

        const gg = app.svg.createG();
        gg.setAttribute('transform-origin', `${width}px ${height}px`);
        gg.classList.add('animation-congratulations');

        gg.appendChild(text);
        g.appendChild(gg);
        {
          const levelObj = level.getLevelObj();
          const replayStr = undoInfo.getReplayStr();

          // 記録保存
          if (bestStep !== undefined) {
            highestScorePrev = app.savedata.getHighestScore(
              levelObj,
              level.isLineMode()
            );
            app.savedata.saveSteps(levelObj, level.isLineMode(), replayStr);
          }

          // ログ出力
          {
            const w = levelObj.w;
            const h = levelObj.h;
            const s = levelObj.s;
            const r = levelObj.r;
            const levelParams = `w: ${w}, h: ${h}, s: '${s}', r: '${replayStr}', step: ${
              replayStr.length
            }, subject: '${
              levelObj.subject === undefined ? '' : levelObj.subject
            }'`;

            const levelObjStr = `{ ${levelParams} },`;
            // if (app.common.levelId === null) {
            //   copyTextToClipboard(levelObjStr);
            // }
            consoleLog(levelObjStr);

            const completedStep = undoInfo.getIndex();
            if (r === undefined) {
              consoleWarn('参照用公式記録の情報がありません！');
            } else if (completedStep < bestStep) {
              consoleLog(
                `参照用公式記録を破りました！\n参照用公式記録[${bestStep}] → あなたの記録[${completedStep}] (${
                  completedStep - bestStep
                } 手)`
              );
            } else {
              if (replayStr === r) {
                consoleLog('参照用公式記録と完全に同じ手順です。');
              } else {
                consoleLog(
                  `参照用公式記録は ${bestStep} 手です。\n(差: ${
                    completedStep - bestStep
                  } 手)`
                );
              }
            }
          }
        }

        if (settings.autoMode && !settingsAuto.paused) {
          clearTimeout(nextLevelTimerId);
          nextLevelTimerId = setTimeout(gotoNextLevel, AUTO_NEXT_LEVEL_DELAY);
        }
      } else {
        if (symmetryFlag) {
          const text = app.svg.createText(blockSize, {
            x: 0,
            y: 0.5 + 0.05,
            text: 'Not connected',
            fill: 'white',
          });
          const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
          const height = (level.getHeight() - 1) * blockSize + frameSize;
          text.setAttribute('font-size', fontSize2);
          text.setAttribute('transform', `translate(${width},${height})`);
          g.appendChild(text);
        }
      }

      // 今回の手数
      {
        const currentStep = undoInfo.getIndex();
        const color = completeFlag
          ? app.common.getStepColor(currentStep, bestStep)
          : 'black';
        const text = app.svg.createText(frameSize, {
          x: 0,
          y: 0.5,
          text: `${currentStep} steps`,
          fill: color,
        });
        text.setAttribute('font-size', fontSize);
        const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
        const height =
          level.getHeight() * blockSize + frameSize - frameBorderWidth / 2;
        text.setAttribute('transform', `translate(${width},${height})`);
        g.appendChild(text);
      }

      // 自己最高記録
      if (app.common.levelId !== null) {
        const levelObj = level.getLevelObj();
        const highestScore = app.savedata.getHighestScore(
          levelObj,
          level.isLineMode()
        );

        {
          const crown = app.common.createCrown(
            frameSize,
            frameBorderWidth / frameSize,
            frameBorderWidth / frameSize / 2,
            highestScore,
            bestStep
          );
          g.appendChild(crown);
        }

        if (highestScore !== null) {
          const color = app.common.getStepColor(highestScore, bestStep);

          const text = app.svg.createText(frameSize, {
            x: 0,
            y: 0.5,
            text: `Your best: ${highestScore} steps`,
            fill: color,
          });
          const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
          const height = frameBorderWidth / 2;
          text.setAttribute('font-size', fontSize);
          text.setAttribute('transform', `translate(${width},${height})`);
          g.appendChild(text);
        }

        // 記録更新？
        if (
          highestScore !== null &&
          highestScorePrev !== null &&
          highestScore < highestScorePrev
        ) {
          const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
          const height = frameSize + (0.5 - 0.05) * blockSize;
          const text = app.svg.createText(blockSize, {
            x: width / blockSize,
            y: height / blockSize,
            text: 'New record!',
            fill: app.colors.newRecords,
          });
          text.setAttribute('font-size', fontSize2);

          const gg = app.svg.createG();
          gg.setAttribute('transform-origin', `${width}px ${height}px`);
          gg.classList.add('animation-new-record');

          gg.appendChild(text);
          g.appendChild(gg);
        }
      }
    }
  }

  function secretSequenceAdd(c) {
    secretSequence += c;

    let resetFlag = true;
    if (secretSequence === '1234') {
      toggleEditLevel();
    } else if (secretSequence === '1414') {
      updateAutoMode(true);
    } else if (secretSequence === '4343') {
      app.common.showElem(elems.console.widget);
      {
        const input = elems.main.svg;
        const output = elems.console.image;
        const svgData = new XMLSerializer().serializeToString(input);
        const svgDataBase64 = window.btoa(svgData);
        const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${svgDataBase64}`;

        const image = new Image();
        image.addEventListener('load', () => {
          const width = input.getAttribute('width');
          const height = input.getAttribute('height');
          const canvas = document.createElement('canvas');

          canvas.setAttribute('width', width - 2 * frameSize);
          canvas.setAttribute('height', height - 2 * frameSize);

          const context = canvas.getContext('2d');
          context.drawImage(
            image,
            frameSize,
            frameSize,
            width - 2 * frameSize,
            height - 2 * frameSize,
            0,
            0,
            width - 2 * frameSize,
            height - 2 * frameSize
          );
          const dataUrl = canvas.toDataURL('image/png');
          output.src = dataUrl;
        });

        image.src = svgDataUrl;

        output.addEventListener('click', () => {
          const canvas = document.createElement('canvas');
          canvas.width = output.naturalWidth;
          canvas.height = output.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(output, 0, 0);

          canvas.toBlob(async (blob) => {
            const item = new ClipboardItem({
              'image/png': blob,
            });
            await navigator.clipboard.write([item]);
            window.alert('画像をクリップボードにコピーしました。');
          });
        });
      }
    } else if (secretSequence === '3434') {
      app.common.hideElem(elems.console.widget);
    } else {
      resetFlag = false;
    }
    if (resetFlag) {
      secretSequenceReset();
    }
  }

  function secretSequenceReset() {
    secretSequence = '';
  }

  function pointerDown(e) {
    isDrawing = true;
    if (e.button === undefined) {
      touchStart = true;
    } else {
      if (e.button !== 0) {
        isRemoving = true;
      }
    }
    editSvg(e, true);
  }

  function pointerMove(e) {
    if (isDrawing) {
      editSvg(e, false);
    }
  }

  function pointerUp() {
    isDrawing = false;
    isRemoving = false;
  }

  function editSvg(e, isPointerDown) {
    const curXY = getCurXY(e);
    const x = curXY.x;
    const y = curXY.y;

    if (!editMode) {
      if (isPointerDown) {
        const xMax = level.getWidth() + 1;
        const yMax = level.getHeight() + 1;
        if (x < 1 && y < 1) {
          secretSequenceAdd('1');
        } else if (x > xMax - 3 && y < 1) {
          secretSequenceAdd('2');
        } else if (x > xMax - 3 && y > yMax - 3) {
          secretSequenceAdd('3');
        } else if (x < 1 && y > yMax - 3) {
          secretSequenceAdd('4');
        } else {
          secretSequenceReset();
        }
      }
      return;
    }

    if (!level.isInsideInnerArea(x, y)) {
      return;
    }

    // タッチ環境の場合は、画面左端は必ずスワイプ操作できるように編集操作を無効化します。
    if (isTouchScreenAndNearLeftEdge(e)) {
      return;
    }

    e.preventDefault();

    if (touchStart && level.getState(x, y) === drawingState) {
      isRemoving = true;
    }
    touchStart = false;

    if (!isRemoving && level.getState(x, y) !== drawingState) {
      level.applyState(x, y, drawingState);
      addUndo(null);
      completeCheck();
      updateLinkUrl();
      drawMainSvg();
    } else if (isRemoving && level.getState(x, y) !== app.states.none) {
      level.applyState(x, y, app.states.none);
      addUndo(null);
      completeCheck();
      updateLinkUrl();
      drawMainSvg();
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
      const x = Math.floor((cursorPos.x - frameSize) / blockSize);
      const y = Math.floor((cursorPos.y - frameSize) / blockSize);
      return { x, y };
    }
  }

  function resizeLevel(dx, dy, flag) {
    const w = level.getW() + dx;
    const h = level.getH() + dy;
    if (w < 1) return;
    if (h < 1) return;
    if (w > app.common.maxW) return;
    if (h > app.common.maxH) return;

    level.resize(dx, dy, flag);
    addUndo(null);
    updateSvg();
  }

  function addUndo(dir) {
    undoInfo.pushData({
      dir,
      w: level.getW(),
      h: level.getH(),
      s: level.getS(),
    });

    app.common.hideElem(elems.controller.redo);
    app.common.hideElem(elems.edit.redo);
    if (undoInfo.isUndoable()) {
      app.common.showElem(elems.controller.undo);
      app.common.showElem(elems.edit.undo);
    }
  }

  function replaceUrlTitle() {
    const base = location.href.split('?')[0];
    const url = base;
    history.replaceState(null, '', url);
  }

  function replaceUrl() {
    if (app.common.isShownElem(elems.category.title)) {
      replaceUrlTitle();
      return;
    }
    const base = location.href.split('?')[0];
    const levelObj = level.getLevelObj();
    let url = `${base}?w=${levelObj.w}&h=${levelObj.h}&s=${levelObj.s}`;
    if (level.isLineMode()) url += '&line';
    if (settings.autoMode) url += '&auto';
    if (settings.debugFlag) url += '&debug';
    if (settings.mirrorFlag) url += '&mirror';
    if (settings.rotateNum !== 0) url += `&rotate=${settings.rotateNum}`;
    history.replaceState(null, '', url);
  }

  function updateButtonSpeedDisplay() {
    (settingsAuto.interval === settingsAuto.INTERVAL_MAX
      ? app.common.hideElem
      : app.common.showElem)(elems.auto.buttonSpeedDown);
    (settingsAuto.interval === 1 ? app.common.hideElem : app.common.showElem)(
      elems.auto.buttonSpeedUp
    );
  }

  function updateAutoMode(isOn) {
    if (isOn) {
      settings.autoMode = true;
      input.disable();
      app.common.showElem(elems.auto.buttons);
      updateEditMode(false);
    } else {
      clearTimeout(nextLevelTimerId);
      settings.autoMode = false;
      settingsAuto.paused = true;
      input.enable();
      app.common.hideElem(elems.auto.buttons);

      input.update(app.Input.DIRS.NEUTRAL);
    }
    updateAutoStartPauseButtons();
    updateController();
    updateSvg();
    replaceUrl();
  }

  function updateAutoStartPauseButtons() {
    if (settingsAuto.paused) {
      app.common.showElem(elems.auto.buttonStart);
      app.common.hideElem(elems.auto.buttonPause);
    } else {
      app.common.hideElem(elems.auto.buttonStart);
      app.common.showElem(elems.auto.buttonPause);
    }
  }

  function onButtonStop() {
    updateAutoMode(false);
    clearTimeout(nextLevelTimerId);
  }

  function onButtonStart() {
    if (level.getBestStep() === undefined) {
      const w = level.getW();
      const h = level.getH();
      const s = level.getS();
      const levelObj = { w, h, s };
      // TODO activeElem を盤面に反映させてから計算する。Promiseを使うといけそう。
      // app.common.activeElem(elems.auto.buttonStart);
      const levelTemp = new app.Level({
        levelObj,
        checkMode: app.common.checkMode,
      });
      const maxStep = 1000; // 探索ステップ数上限値は大きな値にしておきます。時間制限もあるので、この制限にかかることはほぼないはずです。
      const timeLimit = 10;
      const result = app.solveLevel(null, levelTemp, { maxStep, timeLimit });
      // app.common.inactiveElem(elems.auto.buttonStart);
      if (result.replayStr === null) {
        window.alert(result.errorMessage);
        return;
      } else {
        resetUndo();
        const newLevelObj = { ...levelObj, ...{ r: result.replayStr } };
        initLevel({ levelObj: newLevelObj });
      }
    }

    settingsAuto.paused = false;
    updateAutoStartPauseButtons();
    if (completeFlag) {
      gotoNextLevel();
    }

    intervalFuncAuto();
  }

  function onButtonPause() {
    settingsAuto.paused = true;
    updateAutoStartPauseButtons();
    clearTimeout(nextLevelTimerId);
    clearTimeout(autoIntervalId);
  }

  function onButtonEnd() {
    const levelObj = level.getLevelObj();
    const stepIndex = undoInfo.getIndex();
    let step = 0;

    for (const dirChar of levelObj.r) {
      if (step++ < stepIndex) continue;
      const dir = Number(dirChar);
      tryMoving(dir);
    }
    completeCheck();
  }

  function intervalFuncAuto() {
    const r = level.getLevelObj()?.r;
    if (!editMode && settings.autoMode && r !== undefined) {
      const stepIndex = undoInfo.getIndex();
      if (!settingsAuto.paused) {
        if (stepIndex < r.length) {
          input.inputDir = Number(r[stepIndex]);
          inputFunc();
        }
      }
    }

    clearTimeout(autoIntervalId);
    autoIntervalId = setTimeout(
      intervalFuncAuto,
      settingsAuto.interval * INPUT_INTERVAL_MSEC
    );
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
    const elem = elems.console.log;
    const li = document.createElement('li');
    li.classList.add(className);
    li.textContent = str;
    elem.appendChild(li);
    li.addEventListener('click', copyTextToClipboard.bind(null, str));

    const MAX_LOG_NUM = 10;
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

  function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => {
        alert('【クリップボードにコピーしました】\n' + text);
      },
      () => {
        alert('クリップボードへのコピーに失敗しました。');
      }
    );
  }

  function isLocalhost() {
    if (location.href.match(/^http:\/\/127\.0\.0\.1[:/]/)) {
      return true;
    }
    return false;
  }

  function resizeWindow() {
    const WINDOW_WIDTH = 500;
    const WINDOW_HEIGHT = 688;
    if (
      window.innerHeight * WINDOW_WIDTH >=
      window.innerWidth * WINDOW_HEIGHT
    ) {
      elems.viewport.setAttribute('content', 'width=500');
    } else {
      const width = (WINDOW_HEIGHT * window.innerWidth) / window.innerHeight;
      elems.viewport.setAttribute('content', `width=${width}`);
    }
  }
})();
