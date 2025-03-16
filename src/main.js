(function () {
  'use strict';
  const VERSION_TEXT = 'v' + '2025.03.16';

  const app = window.app;
  Object.freeze(app);

  const elems = app.elems;
  const common = app.common;
  common.loadLevelById = loadLevelById;

  // この値を変更するときは、iOSの省電力モード時の setInterval の動作を確認した上で変更してください。
  // 詳細: https://github.com/tatt61880/symmetry-puzzle/issues/38
  const INPUT_INTERVAL_MSEC = 28;

  const MOVE_INTERVAL_COUNT = 5;
  const MOVE_INTERVAL_MSEC = MOVE_INTERVAL_COUNT * INPUT_INTERVAL_MSEC;
  common.MOVE_INTERVAL_MSEC = MOVE_INTERVAL_MSEC;

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
  const AUTO_NEXT_LEVEL_DELAY = 1000;
  let nextLevelTimerId = null;

  let redrawTimerId = null;

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
  const defaultFrameSize = 32;
  let frameSizeW = defaultFrameSize;
  const frameSizeH = defaultFrameSize;
  const frameBorderWidth = 5;

  common.level = null;
  window.retryAndExecReplayStr = retryAndExecReplayStr;

  const SHADOW_MSEC = MOVE_INTERVAL_MSEC * 2;
  const ROTATION_MSEC = MOVE_INTERVAL_MSEC * 3;
  document.documentElement.style.setProperty('--animation-duration', `${MOVE_INTERVAL_MSEC}ms`);
  document.documentElement.style.setProperty('--animation-duration-shadow', `${SHADOW_MSEC}ms`);
  document.documentElement.style.setProperty('--animation-duration-symmetry', `${ROTATION_MSEC}ms`);

  document.addEventListener('DOMContentLoaded', onloadApp);
  return;
  // ==========================================================================

  function tryMoving(dir) {
    const dxs = [0, 1, 0, -1, 0];
    const dys = [-1, 0, 1, 0, 0];
    const dx = dxs[dir];
    const dy = dys[dir];

    const moveFlag = common.level.move(dx, dy);
    if (moveFlag) {
      document.documentElement.style.setProperty('--animation-move-transform', `translate(${-dx * blockSize}px, ${-dy * blockSize}px)`);
      document.documentElement.style.setProperty('--animation-move-sub-transform', `translate(0, ${-0.125 * blockSize}px)`);
      addUndo(dir);
    }
    return moveFlag;
  }

  function completeCheck() {
    if (isDrawing) return;

    const symmetryFlagPrev = symmetryFlag;
    completeFlag = common.level.isCompleted(); // 連結した対称図形であるとき
    symmetryFlag = common.level.isSymmetry(app.states.isTarget); // 連結しているか否かに関わらず対称図形であるとき
    const redrawFlag = completeFlag || (symmetryFlag && symmetryFlag !== symmetryFlagPrev);
    if (redrawFlag) {
      const delay = settings.autoMode ? settingsAuto.interval * INPUT_INTERVAL_MSEC : MOVE_INTERVAL_MSEC;
      clearTimeout(redrawTimerId);
      redrawTimerId = setTimeout(drawMainSvg, delay, completeFlag);
    }

    if (completeFlag) {
      const center = common.level.getCenter(app.states.isTarget);
      document.documentElement.style.setProperty('--animation-origin', `${blockSize * center.x}px ${blockSize * center.y}px`);
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
    clearTimeout(redrawTimerId);
    common.activeElem(elems.controller.undo);
    common.activeElem(elems.edit.undo);

    input.update(app.Input.DIRS.NEUTRAL);
    execUndo();
    undoIntervalId = setInterval(execUndo, UNDO_INTERVAL_MSEC);
  }

  function undoEnd() {
    clearInterval(undoIntervalId);
    if (!undoFlag) return;
    undoFlag = false;
    common.inactiveElem(elems.controller.undo);
    common.inactiveElem(elems.edit.undo);
  }

  function undodown(e) {
    e.preventDefault();
    undoStart();
  }

  function redoStart() {
    if (redoFlag) return;
    redoFlag = true;
    common.activeElem(elems.controller.redo);
    common.activeElem(elems.edit.redo);
    execRedo();
    redoIntervalId = setInterval(execRedo, UNDO_INTERVAL_MSEC);
  }

  function redoEnd() {
    clearInterval(redoIntervalId);
    if (!redoFlag) return;
    redoFlag = false;
    common.inactiveElem(elems.controller.redo);
    common.inactiveElem(elems.edit.redo);
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
          elems.help.tabApp.checked = true;
          break;
        case 't':
          elems.help.tabLine.checked = true;
          break;
        case 'z':
          elems.help.tabPoint.checked = true;
          break;
        case 'o':
          elems.help.tabSpecial.checked = true;
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

    // 形状一覧ダイアログで有効
    if (elems.shapes.dialog.open) {
      if (e.ctrlKey) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'k':
          app.dialog.shapes.selectUp();
          break;
        case 'ArrowRight':
        case 'd':
        case 'l':
          if (e.shiftKey) {
            app.dialog.shapes.nextPage();
          } else {
            app.dialog.shapes.selectRight();
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'j':
          app.dialog.shapes.selectDown();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'h':
          if (e.shiftKey) {
            app.dialog.shapes.prevPage();
          } else {
            app.dialog.shapes.selectLeft();
          }
          break;
        case 'Enter':
          app.dialog.shapes.selectEnter();
          break;
        case '#':
          app.dialog.shapes.close();
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
      case 'Home':
        if (!e.ctrlKey) {
          gotoTitlePage();
          return;
        }
        break;
    }

    // タイトル画面で有効
    if (common.isShownElem(elems.category.title)) {
      if (e.ctrlKey) return;
      switch (e.key) {
        case 't':
          if (e.shiftKey) return;
          if (common.isNumMode) {
            gotoNumLineMode();
          } else {
            gotoNormalLineMode();
          }
          break;
        case 'z':
          if (e.shiftKey) return;
          if (common.isNumMode) {
            gotoNumPointMode();
          } else {
            gotoNormalPointMode();
          }
          break;
        case 'o':
          if (e.shiftKey) return;
          if (common.isNumMode) {
            gotoNumSpecialMode();
          } else {
            gotoNormalSpecialMode();
          }
          break;
        case '+':
        case '#':
          toggleNormalNumMode();
          break;
        case '!':
          app.dialog.records.show();
      }
      return;
    }

    if (e.key === '#') {
      if (e.ctrlKey) return;
      if (common.isShownElem(elems.levels.button)) {
        app.dialog.levels.show();
      }
      return;
    }

    if (e.ctrlKey) {
      switch (e.key) {
        // Ctrl + V: クリップボード内のオブジェクトデータを実行
        case 'v': {
          let clip = await navigator.clipboard.readText();
          clip = clip.replace(/\s/g, ' ');
          clip = clip.replace(/.*?({.*?}).*/, '$1');
          clip = clip.replace(/,\s*}/g, '}');
          clip = clip.replaceAll("'", '"');
          clip = clip.replace(/(\w+):/g, '"$1":');
          console.log(clip);
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
    } else if (e.key === 'Enter' && common.isShownElem(elems.controller.nextLevel)) {
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
            case 'Enter':
              if (common.level.hasAxis()) {
                return app.Input.DIRS.AXIS;
              }
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
        case '2':
        case '3':
        case '4':
          secretSequenceAdd(e.key);
          break;
        default:
          secretSequenceReset();
      }
    }
    return;
  }

  function keyup(e) {
    if (common.isShownElem(elems.category.title)) return;
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
    clearTimeout(redrawTimerId);

    common.activeElem(elems.level.retry);
    animateIcons();
    common.inactiveElem(elems.level.retry);

    {
      const levelObj = undoInfo.undoAll();
      const resizeFlag = common.level.getW() !== levelObj.w || common.level.getH() !== levelObj.h;
      common.level.applyObj(levelObj, resizeFlag);
    }

    draw();
  }

  function resetUndo() {
    undoInfo = new app.UndoInfo();
  }

  function initLevel(paramObj) {
    paramObj.checkMode = common.checkMode;
    common.level = new app.Level(paramObj);
    addUndo(null);
    draw();
  }

  function onWindowResize() {
    draw();
  }

  function draw() {
    if (common.isHiddenElem(elems.category.game)) return;

    updateSvg();
    updateUndoRedoButton();
    updateEditAxisButton();
    updateLinkUrl();
    completeCheck();
    drawMainSvg();
  }

  function updateSvg() {
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

    // フレームの横幅をデフォルト値に戻してブロックサイズを計算します。
    frameSizeW = defaultFrameSize;

    const svgMaxWidth = 490;
    const svgMaxHeight = divMainHeight;
    blockSize = Math.min(
      (svgMaxWidth - 2 * frameSizeW) / common.level.getWidth(),
      (svgMaxHeight - 2 * frameSizeH) / common.level.getHeight()
    );
    blockSize = Math.max(blockSize, 0);

    // 横幅が狭すぎると、文字を表示するスペースが足りません。
    // 文字を表示できる程度にフレームの横幅を広くします。
    const svgMinWidth = svgMaxWidth * 0.65;
    if (blockSize * common.level.getWidth() + 2 * frameSizeW < svgMinWidth) {
      frameSizeW = (svgMinWidth - blockSize * common.level.getWidth()) / 2;
    }

    elems.main.svg.setAttribute('width', blockSize * common.level.getWidth() + 2 * frameSizeW);
    elems.main.svg.setAttribute('height', blockSize * common.level.getHeight() + 2 * frameSizeH);
  }

  function updateUndoRedoButton() {
    if (undoInfo === undefined) return;

    if (undoInfo.isUndoable()) {
      common.showElem(elems.controller.undo);
      common.showElem(elems.edit.undo);
    } else {
      common.hideElem(elems.controller.undo);
      common.hideElem(elems.edit.undo);
    }

    if (undoInfo.isRedoable()) {
      common.showElem(elems.controller.redo);
      common.showElem(elems.edit.redo);
    } else {
      common.hideElem(elems.controller.redo);
      common.hideElem(elems.edit.redo);
    }
  }

  function execUndo() {
    window.getSelection().removeAllRanges();

    if (undoInfo.isUndoable()) {
      const levelObj = undoInfo.undo();
      const resizeFlag = common.level.getW() !== levelObj.w || common.level.getH() !== levelObj.h;
      common.level.applyObj(levelObj, resizeFlag);
      common.level.applyAxis(levelObj.axis);
      draw();
    }
  }

  function execRedo() {
    window.getSelection().removeAllRanges();

    if (undoInfo.isRedoable()) {
      const levelObj = undoInfo.redo();
      const resizeFlag = common.level.getW() !== levelObj.w || common.level.getH() !== levelObj.h;
      common.level.applyObj(levelObj, resizeFlag);
      common.level.applyAxis(levelObj.axis);
      draw();
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
      //   -, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      0: '000111001111111101111111111111111',
      1: '000101001001001101100100001101101',
      2: '111101001111111111111111001111111',
      3: '000101001100001001001101001101001',
      4: '000111001111111001111111001111111',
    };

    common.levelId = id;
    common.levelNum = id;
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
    clearTimeout(redrawTimerId);
    const id = Number(id_);
    common.levelId = id;
    common.levelNum = null;

    let levelObj = common.levels.getLevelObj(common.levelId);

    if (levelObj === null) {
      levelObj = createObjById(common.levelId);
    }

    consoleLog(`[LEVEL ${id}]${levelObj?.subject ?? ''}`);

    loadLevelObj(levelObj);
    if (isLocalhost()) {
      common.level.printSolveJsStr();
    }

    updateLevelVisibility();
    elems.level.id.textContent = common.levelId;
    replaceUrl();
  }

  function updateShapeButton() {
    if (common.level !== null) {
      const shapesObj = app.savedata.getShapesObj(common.level.getLevelObj(), common.checkMode);

      if (shapesObj) {
        common.showElem(elems.shapes.buttonG);
        const numerator = Object.keys(shapesObj).length;
        const denumerator = common.level.getShapes() ?? '?';
        elems.shapes.buttonNumerator.textContent = numerator;
        elems.shapes.buttonDenumerator.textContent = denumerator;
        const fontColor = (() => {
          if (common.isNumMode) {
            return app.colors.shapeNumNumMode;
          }
          return numerator === denumerator ? app.colors.shapeNumPerfect : app.colors.shapeNumNormal;
        })();
        elems.shapes.buttonNumerator.setAttribute('fill', fontColor);
        elems.shapes.buttonLine.setAttribute('fill', fontColor);
        elems.shapes.buttonDenumerator.setAttribute('fill', fontColor);
        const fill = common.isNumMode ? app.colors.frameFillNumMode : app.colors.frameFill;
        const stroke = common.isNumMode ? app.colors.frameStrokeNumMode : app.colors.frameStroke;
        elems.shapes.button.setAttribute('fill', fill);
        elems.shapes.button.setAttribute('stroke', stroke);
        return;
      }
    }

    common.hideElem(elems.shapes.buttonG);
  }

  function loadLevelObj(levelObj, param = {}) {
    resetUndo();

    const mirrorFlag = !param.reset ? settings.mirrorFlag : false;
    const rotateNum = !param.reset ? settings.rotateNum : 0;
    initLevel({ levelObj, mirrorFlag, rotateNum });

    input.update(app.Input.DIRS.NEUTRAL);
    moveIntervalCount = MOVE_INTERVAL_COUNT;

    if (settings.autoMode) {
      updateAutoMode(true);
    }
    updateShapeButton();
  }

  function showLevelPrev() {
    return common.levels.prevable(common.levelId);
  }

  function showLevelNext() {
    return common.levels.nextable(common.levelId);
  }

  function updateLevelVisibility() {
    (showLevelPrev() ? common.showElem : common.hideElem)(elems.level.prev);
    (showLevelNext() ? common.showElem : common.hideElem)(elems.level.next);
    if (common.levelId !== null) {
      common.showElem(elems.level.id);
      common.showElem(elems.levels.button);
      common.hideElem(elems.level.edit);
    } else {
      common.hideElem(elems.level.id);
      common.hideElem(elems.levels.button);
      common.showElem(elems.level.edit);
    }

    if (common.isNumMode) {
      common.hideElem(elems.levels.buttons.shortest);
      common.hideElem(elems.levels.buttons.cleared);
      common.showElem(elems.levels.buttons.numMode);
    } else {
      common.showElem(elems.levels.buttons.shortest);
      common.showElem(elems.levels.buttons.cleared);
      common.hideElem(elems.levels.buttons.numMode);
    }
  }

  function gotoPrevLevel() {
    if (!showLevelPrev()) return;
    loadLevelById(common.levelId - 1);
  }

  function gotoNextLevel() {
    if (!showLevelNext()) return;
    loadLevelById(common.levelId + 1);
  }

  function gotoNextLevelButton() {
    const style = window.getComputedStyle(elems.controller.nextLevel);
    if (style.opacity > 0.5) {
      gotoNextLevel();
    }
  }

  function updateLinkUrl() {
    if (!editMode) return;
    const url = common.level.getUrlStr();
    elems.url.a.innerHTML = `<a href="${url}">現在の盤面を0手目として完成！</a>`;
  }

  function updateEditMode(isOn) {
    editMode = isOn;
    if (editMode) {
      common.showElem(elems.url.div);
      common.showElem(elems.edit.widget);
      common.hideElem(elems.controller.widget);
      common.hideElem(elems.level.retry);
      updateLinkUrl();
    } else {
      common.hideElem(elems.url.div);
      common.hideElem(elems.edit.widget);
      common.showElem(elems.controller.widget);
      common.showElem(elems.level.retry);
    }
  }

  function toggleEditLevel() {
    editMode = !editMode;
    common.levelId = null;
    common.levelNum = null;
    updateLevelVisibility();
    updateEditAxisButton();
    updateEditMode(editMode);
    if (!editMode) {
      completeCheck();
    }
    drawMainSvg();
  }

  function updateCheckMode(mode) {
    common.checkMode = mode;
    const className = (() => {
      switch (mode) {
        case app.Level.CHECK_MODE.LINE:
          return 'line';
        case app.Level.CHECK_MODE.POINT:
          return 'point';
        case app.Level.CHECK_MODE.SPECIAL:
          return 'special';
        default:
          return 'title-page';
      }
    })();

    for (const elem of document.getElementsByClassName('check-mode')) {
      elem.classList.add('hide-mode');
    }

    for (const elem of document.getElementsByClassName(`check-mode ${className}`)) {
      elem.classList.remove('hide-mode');
    }

    animateIcons();
  }

  function animateIcons() {
    if (elems.help.dialog.open) return; // ダイアログ表示中にアニメーションするとSafariで画面がちらつく問題があるため。

    addAnimationClass(elems.iconTitle, 'animation-icon-title');
    addAnimationClass(elems.iconTitle123, 'animation-icon-title');
    addAnimationClass(elems.iconLine, 'animation-icon-line');
    addAnimationClass(elems.iconLine123, 'animation-icon-line');
    addAnimationClass(elems.iconPoint, 'animation-icon-point');
    addAnimationClass(elems.iconPoint123, 'animation-icon-point');
    addAnimationClass(elems.iconSpecial, 'animation-icon-special');
    addAnimationClass(elems.iconSpecial123, 'animation-icon-special');
  }

  function addAnimationClass(elem, className) {
    elem.classList.remove(className);
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

    for (const elem of document.getElementsByClassName(`translatable ${lang}`)) {
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

  function initBlock() {
    for (const elem of document.getElementsByClassName('user-block-title')) {
      initTitleCharacter(elem, true);
    }
  }

  function initTitleCharacter(elem, firstFlag = false) {
    const getRand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    const interval = MOVE_INTERVAL_MSEC * (1.5 + 0.4 * getRand(1, 5));
    const checkMode = (() => {
      switch (getRand(1, 3)) {
        case 1:
          return app.Level.CHECK_MODE.LINE;
        case 2:
          return app.Level.CHECK_MODE.POINT;
        case 3:
          return app.Level.CHECK_MODE.SPECIAL;
      }
    })();

    const widthNum = 19;

    const level = new app.Level({
      levelObj: {
        w: widthNum,
        h: 1,
        s: 's' + (firstFlag ? '' : '1'.repeat(getRand(0, 16) ** 2 / 100)),
      },
      checkMode,
    });
    const blockSize = 50;

    const dx = 1;
    const dy = 0;

    const intervalId = setInterval(() => {
      if (!common.isShownElem(elems.category.title)) {
        return;
      }
      if (getRand(1, 15) !== 1) {
        const moveFlag = level.move(dx, 0);
        if (!moveFlag) {
          clearInterval(intervalId);
          initTitleCharacter(elem);
        }
      }
      elem.textContent = '';
      {
        elem.style.setProperty('--animation-move-transform', `translate(${-dx * blockSize}px, ${-dy * blockSize}px)`);
        elem.style.setProperty('--animation-move-sub-transform', `translate(0, ${-0.125 * blockSize}px)`);
      }
      const g = level.createSvgG({
        blockSize,
        drawBackground: false,
        symmetryAnimationFlag: false,
        x0: 1,
        y0: 1,
        width: widthNum,
        height: 1,
      });

      elem.setAttribute('width', blockSize * widthNum);
      elem.setAttribute('height', blockSize * 1.4);
      elem.appendChild(g);
      g.setAttribute('transform', `translate(${-4.5 * blockSize},${blockSize * 0.3})`);
    }, interval);
  }

  function initLang() {
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
  }

  function onloadApp() {
    elems.version.textContent = VERSION_TEXT;
    elems.help.version.textContent = VERSION_TEXT;
    elems.records.version.textContent = VERSION_TEXT;

    initElems();
    initBlock();
    updateEditMode(false);

    window.onresize = resizeWindow;
    resizeWindow();

    const queryParams = app.analyzeUrl();
    settings = queryParams.settings;

    setInterval(intervalFunc, INPUT_INTERVAL_MSEC);

    const id = queryParams.id;
    const num = queryParams.num;
    if (id === null && num === null && queryParams.levelObj.s === null) {
      gotoTitlePage();
      initLang();
      return;
    }

    updateCheckMode(settings.mode);
    initLang();

    if (id !== null) {
      onloadId(id);
    } else if (num !== null) {
      onloadId(num, false);
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
    let levelsList;
    let levelsListEx;
    switch (common.checkMode) {
      case app.Level.CHECK_MODE.LINE:
        levelsList = app.levelsLine;
        levelsListEx = app.levelsLineEx;
        break;
      case app.Level.CHECK_MODE.POINT:
        levelsList = app.levelsPoint;
        levelsListEx = app.levelsPointEx;
        break;
      case app.Level.CHECK_MODE.SPECIAL:
        levelsList = app.levelsSpecial;
        levelsListEx = app.levelsSpecialEx;
        break;
      default:
        return null;
    }
    common.levels = new app.Levels({ levelsList, levelsListEx });
    return common.levels.levelObjToId(queryObj);
  }

  function gotoTitlePage() {
    completeFlag = false;
    window.getSelection().removeAllRanges();

    app.common.levelNum = null;
    updateCheckMode(null);
    common.showElem(elems.category.title);
    common.hideElem(elems.category.game);
    updateAutoMode(false);
    replaceUrlTitle();

    // ある程度クリアするまで連番モードを隠します。
    if (common.isShownElem(elems.title.buttonNormalsTr)) {
      common.showElem(elems.title.buttonToggleToNumDiv);
      common.showElem(elems.records.numMode);
      for (const [levelsList, mode] of [
        [app.levelsLine, app.Level.CHECK_MODE.LINE],
        [app.levelsPoint, app.Level.CHECK_MODE.POINT],
        [app.levelsSpecial, app.Level.CHECK_MODE.SPECIAL],
      ]) {
        const levels = new app.Levels({ levelsList, levelsListEx: undefined });
        const levelObj = levels.getLevelObj(1);
        const highestScore = app.savedata.getHighestScore(levelObj, mode);
        if (highestScore === null) {
          common.hideElem(elems.title.buttonToggleToNumDiv);
          common.hideElem(elems.records.numMode);
        }
      }
    }
  }

  function onloadId(id_, idFlag = true) {
    window.getSelection().removeAllRanges();

    if (editMode) {
      toggleEditLevel();
    }

    {
      let levelsList = {};
      let levelsListEx = {};
      switch (common.checkMode) {
        case app.Level.CHECK_MODE.LINE:
          levelsList = app.levelsLine;
          levelsListEx = app.levelsLineEx;
          break;
        case app.Level.CHECK_MODE.POINT:
          levelsList = app.levelsPoint;
          levelsListEx = app.levelsPointEx;
          break;
        case app.Level.CHECK_MODE.SPECIAL:
          levelsList = app.levelsSpecial;
          levelsListEx = app.levelsSpecialEx;
          break;
        default:
          console.assert(false);
      }
      updateNormalNumMode(!idFlag);
      if (common.isNumMode) {
        levelsList = [levelsList[0]];
      }
      common.levels = new app.Levels({ levelsList, levelsListEx });
    }

    common.hideElem(elems.category.title);
    common.showElem(elems.category.game);
    common.showElem(elems.main.div);
    common.showElem(elems.level.widget);
    common.showElem(elems.svgDiv);
    common.showElem(elems.controller.widget);

    let id = id_;
    if (id === null) id = 1;
    loadLevelById(id);
  }

  function onloadObj(levelObj) {
    const id = getId(levelObj);
    if (id !== null) {
      onloadId(id);
      return;
    }
    window.getSelection().removeAllRanges();

    common.hideElem(elems.category.title);
    common.showElem(elems.category.game);
    common.showElem(elems.main.svg);
    common.showElem(elems.level.widget);
    common.showElem(elems.svgDiv);
    common.hideElem(elems.auto.buttons);
    common.showElem(elems.controller.widget);

    common.levelId = null;
    common.levelNum = null;
    updateLevelVisibility();
    loadLevelObj(levelObj);
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
      const touchDevice = common.isTouchDevice();

      elems.contents.addEventListener('mousedown', (e) => {
        // ダブルタップしたときの画面の拡大縮小をしないようにする。
        e.preventDefault();
      });

      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      elems.contents.addEventListener(pointermoveEventName, (e) => {
        if (common.isShownElem(elems.console.widget)) return;
        // スワイプ操作を無効化する。
        e.preventDefault();
      });
    }

    elems.top.addEventListener('click', gotoTitlePage);

    initElemsForAuto();
    initElemsForEdit();
    initElemsForHelp();
    initElemsForTitle();
    initElemsForRecords();
    initElemsForLevelWidget();
    initElemsForLevelsDialog();
    initElemsForShapesDialog();
    initLogo();

    // キー入力用
    {
      document.addEventListener('keydown', keydown);
      document.addEventListener('keyup', keyup);
    }

    // タッチ入力用
    {
      const touchDevice = common.isTouchDevice();
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

      elems.controller.buttons.up.addEventListener(pointerdownEventName, moveButtonStart.bind(null, app.Input.DIRS.UP));
      elems.controller.buttons.right.addEventListener(pointerdownEventName, moveButtonStart.bind(null, app.Input.DIRS.RIGHT));
      elems.controller.buttons.down.addEventListener(pointerdownEventName, moveButtonStart.bind(null, app.Input.DIRS.DOWN));
      elems.controller.buttons.left.addEventListener(pointerdownEventName, moveButtonStart.bind(null, app.Input.DIRS.LEFT));
      elems.controller.buttons.axis.addEventListener(pointerdownEventName, moveButtonStart.bind(null, app.Input.DIRS.AXIS));

      elems.controller.nextLevel.addEventListener('click', gotoNextLevelButton);

      elems.controller.buttons.menu.addEventListener(pointerdownEventName, onButtonMenu);
      elems.controller.buttons.title.addEventListener('click', gotoTitlePage);
      elems.controller.buttons.retry.addEventListener('click', retryLevel);

      document.addEventListener(pointerupEventName, pointerup);

      input = new app.Input(elems.controller.buttons);
    }

    function onButtonMenu() {
      if (common.isShownElem(elems.controller.menu)) {
        common.hideElem(elems.controller.menu);
      } else {
        common.showElem(elems.controller.menu);
      }
    }
  }

  // Autoモード用
  function initElemsForAuto() {
    elems.auto.buttonStop.addEventListener('click', onButtonStop);
    elems.auto.buttonStart.addEventListener('click', onButtonStart);
    elems.auto.buttonPause.addEventListener('click', onButtonPause);
    elems.auto.buttonEnd.addEventListener('click', onButtonEnd);
    elems.auto.buttonSpeedDown.addEventListener('click', onButtonSpeedDown);
    elems.auto.buttonSpeedUp.addEventListener('click', onButtonSpeedUp);
  }

  function updateEditElems() {
    for (const char in app.states.charToState) {
      const elem = document.getElementById(`edit_${char}`);
      if (elem === null) continue;
      elem.textContent = '';

      {
        const levelForEditChar = new app.Level({
          levelObj: { w: 3, h: 3, s: `-0${char}` },
          checkMode: common.checkMode,
        });
        const g = levelForEditChar.createSvgG({
          blockSize: 40,
          showCharsFlag: true,
          smallJumpFlag: true,
          drawBackground: char === '0',
          x0: 2,
          y0: 2,
          width: 1,
          height: 1,
        });
        elem.appendChild(g);

        const func = () => {
          const transform = elem.getAttribute('transform');
          elems.edit.drawing.setAttribute('transform', `${transform} translate(-4,-4)`);
          const state = app.states.charToState[char];
          drawingState = state;
        };

        if (editboxFunctions[char] === undefined) {
          editboxFunctions[char] = func;
          if (char === '0') {
            editboxFunctions[' '] = func;
          }
          elem.addEventListener('click', func);
        }
      }
    }
  }

  function updateEditAxisButton() {
    common.hideElem(elems.edit.buttons.axisL1);
    common.hideElem(elems.edit.buttons.axisL2);
    common.hideElem(elems.edit.buttons.axisL3);
    common.hideElem(elems.edit.buttons.axisL4);
    common.hideElem(elems.edit.buttons.axisP1);
    common.hideElem(elems.edit.buttons.axisP2);

    if (common.level?.hasAxis()) {
      switch (common.level.getAxisType()) {
        case app.Level.SYMMETRY_TYPE.LINE1: {
          common.showElem(elems.edit.buttons.axisL1);
          break;
        }
        case app.Level.SYMMETRY_TYPE.LINE2: {
          common.showElem(elems.edit.buttons.axisL2);
          break;
        }
        case app.Level.SYMMETRY_TYPE.LINE3: {
          common.showElem(elems.edit.buttons.axisL3);
          break;
        }
        case app.Level.SYMMETRY_TYPE.LINE4: {
          common.showElem(elems.edit.buttons.axisL4);
          break;
        }
        case app.Level.SYMMETRY_TYPE.POINT1: {
          common.showElem(elems.edit.buttons.axisP1);
          break;
        }
        case app.Level.SYMMETRY_TYPE.POINT2: {
          common.showElem(elems.edit.buttons.axisP2);
          break;
        }
      }
    }
  }

  // Editモード用
  function initElemsForEdit() {
    updateEditElems();
    updateEditAxisButton();
    editboxFunctions[app.states.stateToChar[app.states.none]]();

    elems.edit.switchMode.addEventListener('click', () => {
      switch (common.level.getCheckMode()) {
        case app.Level.CHECK_MODE.LINE:
          updateCheckMode(app.Level.CHECK_MODE.POINT);
          break;
        case app.Level.CHECK_MODE.POINT:
          updateCheckMode(app.Level.CHECK_MODE.SPECIAL);
          break;
        case app.Level.CHECK_MODE.SPECIAL:
          updateCheckMode(app.Level.CHECK_MODE.LINE);
          break;
      }
      const levelObj = common.level.getCurrentLevelObj();
      common.level = new app.Level({ levelObj, checkMode: common.checkMode });
      updateEditElems();
      completeCheck();
      draw();
    });

    elems.edit.mirror.addEventListener('click', () => {
      common.level.mirror();
      addUndo(null);
      draw();
    });

    elems.edit.rotate.addEventListener('click', () => {
      common.level.rotate(1);
      addUndo(null);
      draw();
    });

    elems.edit.normalize.addEventListener('click', () => {
      if (!common.level.isNormalized()) {
        common.level.normalize();
        addUndo(null);
        draw();
      }
    });

    elems.edit.buttons.axis.addEventListener('click', changeAxis);

    function changeAxis() {
      common.level.changeAxis();
      updateEditAxisButton();
      addUndo(null);
      draw();
    }
  }

  // ヘルプ画面用
  function initElemsForHelp() {
    elems.help.button.addEventListener('click', app.dialog.help.show);
    elems.help.dialog.addEventListener('click', app.dialog.help.close);
    elems.help.close.addEventListener('click', app.dialog.help.close);
    elems.help.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
    elems.help.langEn.addEventListener('click', () => selectLang('en'));
    elems.help.langJa.addEventListener('click', () => selectLang('ja'));
  }

  // タイトル画面用
  function initElemsForTitle() {
    // 線対称-通常モード
    elems.title.buttonNormalLine.addEventListener('click', gotoNormalLineMode);

    // 点対称-通常モード
    elems.title.buttonNormalPoint.addEventListener('click', gotoNormalPointMode);

    // 線点対称-通常モード
    elems.title.buttonNormalSpecial.addEventListener('click', gotoNormalSpecialMode);

    // 線対称-連番モード
    elems.title.buttonNumLine.addEventListener('click', gotoNumLineMode);

    // 点対称-連番モード
    elems.title.buttonNumPoint.addEventListener('click', gotoNumPointMode);

    // 線点対称-連番モード
    elems.title.buttonNumSpecial.addEventListener('click', gotoNumSpecialMode);

    elems.title.buttonToggleToNormal.addEventListener('click', toggleNormalNumMode);
    elems.title.buttonToggleToNum.addEventListener('click', toggleNormalNumMode);
  }

  function gotoNormalLineMode() {
    updateCheckMode(app.Level.CHECK_MODE.LINE);
    onloadId(1);
  }

  function gotoNormalPointMode() {
    updateCheckMode(app.Level.CHECK_MODE.POINT);
    onloadId(1);
  }

  function gotoNormalSpecialMode() {
    updateCheckMode(app.Level.CHECK_MODE.SPECIAL);
    onloadId(1);
  }

  function gotoNumLineMode() {
    updateCheckMode(app.Level.CHECK_MODE.LINE);
    const minNum = app.savedata.getUnsolvedMinNum(app.Level.CHECK_MODE.LINE);
    onloadId(minNum, false);
  }

  function gotoNumPointMode() {
    updateCheckMode(app.Level.CHECK_MODE.POINT);
    const minNum = app.savedata.getUnsolvedMinNum(app.Level.CHECK_MODE.POINT);
    onloadId(minNum, false);
  }

  function gotoNumSpecialMode() {
    updateCheckMode(app.Level.CHECK_MODE.SPECIAL);
    const minNum = app.savedata.getUnsolvedMinNum(app.Level.CHECK_MODE.SPECIAL);
    onloadId(minNum, false);
  }

  function updateNormalNumMode(isNumMode) {
    if (isNumMode) {
      common.isNumMode = true;
      common.hideElem(elems.title.buttonNormalsTr);
      common.showElem(elems.title.buttonNumsTr);
      common.showElem(elems.title.buttonToggleToNormalDiv);
      common.hideElem(elems.title.buttonToggleToNumDiv);

      for (const elem of document.getElementsByClassName('normal-mode')) {
        elem.classList.add('hide');
      }
      for (const elem of document.getElementsByClassName('num-mode')) {
        elem.classList.remove('hide');
      }
    } else {
      common.isNumMode = false;
      common.showElem(elems.title.buttonNormalsTr);
      common.hideElem(elems.title.buttonNumsTr);
      common.hideElem(elems.title.buttonToggleToNormalDiv);
      common.showElem(elems.title.buttonToggleToNumDiv);

      for (const elem of document.getElementsByClassName('normal-mode')) {
        elem.classList.remove('hide');
      }
      for (const elem of document.getElementsByClassName('num-mode')) {
        elem.classList.add('hide');
      }
    }

    animateIcons();
  }

  function toggleNormalNumMode() {
    if (common.isShownElem(elems.title.buttonToggleToNumDiv)) {
      updateNormalNumMode(true);
    } else if (common.isShownElem(elems.title.buttonToggleToNormalDiv)) {
      updateNormalNumMode(false);
    }
  }

  // 記録画面用
  function initElemsForRecords() {
    const size = Number(elems.records.buttonSvg.dataset.crownSize);
    const crown = common.createCrown(size, 0, 0, 1, 1);
    elems.records.buttonSvg.appendChild(crown);
    elems.records.button.addEventListener('click', app.dialog.records.show);
    elems.records.dialog.addEventListener('click', app.dialog.records.close);
    elems.records.close.addEventListener('click', app.dialog.records.close);
    elems.records.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
    elems.records.backup.addEventListener('click', app.dialog.records.backup);
    elems.records.restore.addEventListener('click', app.dialog.records.restore);
  }

  // レベル操作用
  function initElemsForLevelWidget() {
    elems.level.retry.addEventListener('click', retryLevel);
    elems.level.prev.addEventListener('click', gotoPrevLevel);
    elems.level.next.addEventListener('click', gotoNextLevel);
    elems.level.edit.addEventListener('click', toggleEditLevel);
    elems.levels.button.addEventListener('click', app.dialog.levels.show);
    elems.levels.dialog.addEventListener('click', app.dialog.levels.close);
    elems.levels.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
    [elems.levels.checkbox.shortest, elems.levels.checkbox.cleared, elems.levels.checkbox.numMode].forEach((elem) => {
      elem.addEventListener('click', app.dialog.levels.update);
    });
  }

  // レベル一覧ダイアログ
  function initElemsForLevelsDialog() {
    elems.levels.close.addEventListener('click', app.dialog.levels.close);
    elems.levels.prev.addEventListener('click', app.dialog.levels.prevPage);
    elems.levels.next.addEventListener('click', app.dialog.levels.nextPage);
  }

  // 形状一覧ダイアログ
  function initElemsForShapesDialog() {
    elems.shapes.buttonG.addEventListener('click', app.dialog.shapes.show);
    elems.shapes.dialog.addEventListener('click', app.dialog.shapes.close);
    elems.shapes.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
    elems.shapes.close.addEventListener('click', app.dialog.shapes.close);
    elems.shapes.prev.addEventListener('click', app.dialog.shapes.prevPage);
    elems.shapes.next.addEventListener('click', app.dialog.shapes.nextPage);
  }

  function initLogo() {
    function initLogoSub({ className, levelObj, checkMode }) {
      for (const elem of document.getElementsByClassName(className)) {
        elem.textContent = '';

        const level = new app.Level({
          levelObj,
          checkMode,
        });

        const blockSize = Number(elem.dataset.size);
        const g = level.createSvgG({
          blockSize,
          drawBackground: false,
          x0: 1,
          y0: 1,
          width: levelObj.w,
          height: levelObj.h,
        });
        elem.appendChild(g);
      }
    }

    for (const obj of [
      { className: 'logo-app', levelObj: { w: 3, h: 3, s: '01-222-02' }, checkMode: app.Level.CHECK_MODE.SPECIAL },
      { className: 'logo-line', levelObj: { w: 3, h: 2, s: '112-01' }, checkMode: app.Level.CHECK_MODE.LINE },
      { className: 'logo-point', levelObj: { w: 3, h: 2, s: '11-012' }, checkMode: app.Level.CHECK_MODE.POINT },
      { className: 'logo-special', levelObj: { w: 3, h: 2, s: '11-21' }, checkMode: app.Level.CHECK_MODE.SPECIAL },
      {
        className: 'logo-123',
        levelObj: { w: 5, h: 5, s: '0102-34567-0809-(10)(11)(12)(13)(14)-0(15)0(16)' },
        checkMode: app.Level.CHECK_MODE.SPECIAL,
      },
    ]) {
      initLogoSub(obj);
    }
  }

  function intervalFunc() {
    if (common.level === null) return;
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
    elems.main.svg.classList.remove(classAnimationIllegalMove);

    const movedFlag = tryMoving(input.inputDir);
    if (movedFlag) {
      drawMainSvg();
      completeCheck();
      updateLinkUrl();
    } else {
      const dxs = [0, 1, 0, -1];
      const dys = [-1, 0, 1, 0];
      const { dx, dy } = (() => {
        if (input.inputDir !== app.Input.DIRS.AXIS) {
          return { dx: dxs[input.inputDir], dy: dys[input.inputDir] };
        } else {
          switch (common.level.getAxisType()) {
            case app.Level.SYMMETRY_TYPE.LINE1: {
              return { dx: 1, dy: 0 };
            }
            case app.Level.SYMMETRY_TYPE.LINE2: {
              return { dx: 0, dy: 1 };
            }
            case app.Level.SYMMETRY_TYPE.LINE3: {
              return { dx: 1, dy: -1 };
            }
            case app.Level.SYMMETRY_TYPE.LINE4: {
              return { dx: 1, dy: 1 };
            }
            case app.Level.SYMMETRY_TYPE.POINT1: {
              return { dx: 1, dy: 1 };
            }
            case app.Level.SYMMETRY_TYPE.POINT2: {
              return { dx: 1, dy: 1 };
            }
          }
        }
      })();

      const pixel = 4;
      document.documentElement.style.setProperty('--animation-illegal-move', `translate(${dx * pixel}px, ${dy * pixel}px)`);

      drawMainSvg(); // 目の向きをリセットするために、描画し直します。
      // 動けないときは盤面を振動させます。
      addAnimationClass(elems.main.svg, classAnimationIllegalMove);
    }
  }

  function updateController() {
    if (common.level?.hasAxis()) {
      common.showElem(elems.controller.buttons.axis);
      common.hideElem(elems.controller.buttons.axisL1);
      common.hideElem(elems.controller.buttons.axisL2);
      common.hideElem(elems.controller.buttons.axisL3);
      common.hideElem(elems.controller.buttons.axisL4);
      common.hideElem(elems.controller.buttons.axisP1);
      common.hideElem(elems.controller.buttons.axisP2);
      switch (common.level.getAxisType()) {
        case app.Level.SYMMETRY_TYPE.LINE1: {
          common.showElem(elems.controller.buttons.axisL1);
          break;
        }
        case app.Level.SYMMETRY_TYPE.LINE2: {
          common.showElem(elems.controller.buttons.axisL2);
          break;
        }
        case app.Level.SYMMETRY_TYPE.LINE3: {
          common.showElem(elems.controller.buttons.axisL3);
          break;
        }
        case app.Level.SYMMETRY_TYPE.LINE4: {
          common.showElem(elems.controller.buttons.axisL4);
          break;
        }
        case app.Level.SYMMETRY_TYPE.POINT1: {
          common.showElem(elems.controller.buttons.axisP1);
          break;
        }
        case app.Level.SYMMETRY_TYPE.POINT2: {
          common.showElem(elems.controller.buttons.axisP2);
          break;
        }
      }
    } else {
      common.hideElem(elems.controller.buttons.axis);
    }

    common.showElem(elems.controller.buttons.root);
    common.hideElem(elems.controller.menu);
    if (completeFlag) {
      common.hideElem(elems.controller.buttons.base);
      if (common.isShownElem(elems.level.next)) {
        common.showElem(elems.controller.nextLevel);
      } else {
        common.hideElem(elems.controller.nextLevel);
      }
    } else {
      common.showElem(elems.controller.buttons.base);
      common.hideElem(elems.controller.nextLevel);
    }
  }

  // 描画
  function drawMainSvg(isCompleted = false) {
    updateController();

    const mainSvgG = app.svg.createG();

    const classAnimationIllegalMove = 'animation-illegal-move';
    elems.main.svg.classList.remove(classAnimationIllegalMove);
    elems.main.svg.textContent = '';
    elems.main.svg.appendChild(mainSvgG);

    {
      const symmetryAnimationFlag = isCompleted;
      const showCharsFlag = editMode || settings.debugFlag || temporaryShowCharsFlag;
      drawLevel(mainSvgG, symmetryAnimationFlag, showCharsFlag);
    }

    drawDotLines(mainSvgG);
    drawFrame(mainSvgG, isCompleted);
  }

  function drawLevel(mainSvgG, symmetryAnimationFlag, showCharsFlag) {
    // 盤面の初回表示時に小さくジャンプするようにします。
    const smallJumpFlag = !undoInfo.isUndoable() && input.inputDir === app.Input.DIRS.NEUTRAL;

    const levelSvgG = common.level.createSvgG({
      blockSize,
      symmetryAnimationFlag,
      showCharsFlag,
      smallJumpFlag,
      edgeColor: common.isNumMode ? app.colors.frameFillNumMode : app.colors.frameFill,
    });
    levelSvgG.classList.add('group-level-main');
    levelSvgG.setAttribute('transform', `translate(${frameSizeW},${frameSizeH})`);
    levelSvgG.style.setProperty('pointer-events', 'none'); // スマホ等での操作時にtouchstartからtouchendまで連続して図形描画するため。

    mainSvgG.appendChild(levelSvgG);
  }

  function drawDotLines(mainSvgG) {
    const dotRatio = 1 / 40;
    const size = blockSize * dotRatio;
    const strokeDasharray = `${size} ${4 * size}`;
    const g = app.svg.createG('group-dot-lines');
    mainSvgG.appendChild(g);
    // 横線
    for (let y = 1; y < common.level.getHeight(); ++y) {
      const line = app.svg.createLine(blockSize, {
        x1: -0.5 * dotRatio,
        y1: y,
        x2: common.level.getWidth(),
        y2: y,
        stroke: app.colors.line,
      });
      line.setAttribute('stroke-dasharray', strokeDasharray);
      g.appendChild(line);
    }
    // 縦線
    for (let x = 1; x < common.level.getWidth(); ++x) {
      const line = app.svg.createLine(blockSize, {
        x1: x,
        y1: -0.5 * dotRatio,
        x2: x,
        y2: common.level.getHeight(),
        stroke: app.colors.line,
      });
      line.setAttribute('stroke-dasharray', strokeDasharray);
      g.appendChild(line);
    }
    g.setAttribute('transform', `translate(${frameSizeW},${frameSizeH})`);
  }

  function drawFrame(mainSvgG, isCompleted = false) {
    const g = app.svg.createG('group-frame');
    mainSvgG.appendChild(g);

    const wallStrShift = app.colors[app.states.wall].fill === app.colors[app.states.wall].stroke ? 0 : 0.05;

    {
      const frameColor = common.isNumMode ? app.colors.frameFillNumMode : app.colors.frameFill;
      const rectU = app.svg.createRect(1, {
        x: 0,
        y: 0,
        width: common.level.getWidth() * blockSize + 2 * frameSizeW,
        height: frameSizeH,
        fill: frameColor,
      });
      const rectR = app.svg.createRect(1, {
        x: common.level.getWidth() * blockSize + frameSizeW,
        y: 0,
        width: frameSizeW,
        height: common.level.getHeight() * blockSize + 2 * frameSizeH,
        fill: frameColor,
      });
      const rectD = app.svg.createRect(1, {
        x: 0,
        y: common.level.getHeight() * blockSize + frameSizeH,
        width: common.level.getWidth() * blockSize + 2 * frameSizeW,
        height: frameSizeH,
        fill: frameColor,
      });
      const rectL = app.svg.createRect(1, {
        x: 0,
        y: 0,
        width: frameSizeW,
        height: common.level.getHeight() * blockSize + 2 * frameSizeH,
        fill: frameColor,
      });
      g.appendChild(rectU);
      g.appendChild(rectR);
      g.appendChild(rectD);
      g.appendChild(rectL);

      const borderColor = common.isNumMode ? app.colors.frameStrokeNumMode : app.colors.frameStroke;
      const rectUb = app.svg.createRect(1, {
        x: 0,
        y: 0,
        width: common.level.getWidth() * blockSize + 2 * frameSizeW,
        height: frameBorderWidth,
        fill: borderColor,
      });
      const rectRb = app.svg.createRect(1, {
        x: common.level.getWidth() * blockSize + 2 * frameSizeW - frameBorderWidth,
        y: 0,
        width: frameBorderWidth,
        height: common.level.getHeight() * blockSize + 2 * frameSizeH,
        fill: borderColor,
      });
      const rectDb = app.svg.createRect(1, {
        x: 0,
        y: common.level.getHeight() * blockSize + 2 * frameSizeH - frameBorderWidth,
        width: common.level.getWidth() * blockSize + 2 * frameSizeW,
        height: frameBorderWidth,
        fill: borderColor,
      });
      const rectLb = app.svg.createRect(1, {
        x: 0,
        y: 0,
        width: frameBorderWidth,
        height: common.level.getHeight() * blockSize + 2 * frameSizeH,
        fill: borderColor,
      });
      g.appendChild(rectUb);
      g.appendChild(rectRb);
      g.appendChild(rectDb);
      g.appendChild(rectLb);
    }

    if (editMode) {
      if (!common.level.isNormalized()) {
        const fontSize = `${frameSizeH * 0.7}px`;
        const text = app.svg.createText(frameSizeH, {
          x: 0,
          y: 0.5,
          text: 'Not normalized',
          fill: app.colors.editStroke,
        });
        const width = (common.level.getWidth() * blockSize + 2 * frameSizeW) / 2;
        const height = frameBorderWidth;
        text.setAttribute('font-size', fontSize);
        text.setAttribute('transform', `translate(${width},${height})`);
        g.appendChild(text);
      }

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

      const cx1 = frameSizeW / blockSize + 0.5;
      const cx2 = frameSizeW / blockSize + common.level.getWidth() * 0.3;
      const cx3 = frameSizeW / blockSize + common.level.getWidth() * 0.7;
      const cx4 = frameSizeW / blockSize + common.level.getWidth() - 0.5;
      const cxM = frameSizeW / blockSize + common.level.getWidth() * 0.5;

      const cy1 = frameSizeH / blockSize + 0.5;
      const cy2 = frameSizeH / blockSize + common.level.getHeight() * 0.3;
      const cy3 = frameSizeH / blockSize + common.level.getHeight() * 0.7;
      const cy4 = frameSizeH / blockSize + common.level.getHeight() - 0.5;
      const cyM = frameSizeH / blockSize + common.level.getHeight() * 0.5;

      // 軸位置変更ボタンの追加
      if (common.level.hasAxis()) {
        const buttons = [
          { cx: cxM, cy: cy1, points: pointsU, dx: +0, dy: -1 },
          { cx: cx4, cy: cyM, points: pointsR, dx: +1, dy: +0 },
          { cx: cxM, cy: cy4, points: pointsD, dx: +0, dy: +1 },
          { cx: cx1, cy: cyM, points: pointsL, dx: -1, dy: +0 },
        ];

        buttons.forEach((button) => {
          if (button.dx === 1 && !common.level.axisCxIncAble()) return;
          if (button.dx === -1 && !common.level.axisCxDecAble()) return;
          if (button.dy === 1 && !common.level.axisCyIncAble()) return;
          if (button.dy === -1 && !common.level.axisCyDecAble()) return;

          addEditButton(button, moveAxis.bind(null, button.dx, button.dy), app.colors[app.states.userMin]);
        });
      }

      // 盤面サイズ変更ボタンの追加
      {
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
          addEditButton(button, resizeLevel.bind(null, button.dx, button.dy, button.flag), app.colors.editButton);
        });
      }
    } else {
      const fontSize = `${frameSizeH * 0.7}px`;
      const fontSize2 = `${blockSize * 0.65}px`;
      const bestStep = common.level.getBestStep();

      let highestScorePrev = null;

      // クリア時のメッセージ
      if (isCompleted) {
        const width = (common.level.getWidth() * blockSize + 2 * frameSizeW) / 2;
        const height = (common.level.getHeight() - 0.5 + wallStrShift) * blockSize + frameSizeH;
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

        if (validStepCheck()) {
          const levelObj = common.level.getLevelObj();
          const replayStr = undoInfo.getReplayStr();

          // 記録保存
          highestScorePrev = app.savedata.getHighestScore(levelObj, common.level.getCheckMode());
          if (bestStep !== undefined) {
            app.savedata.saveSteps(levelObj, common.checkMode, replayStr);
          }

          // シルエットデータ保存
          {
            const shapeStr = common.level.getTargetShapeForSavedata();
            const result = app.savedata.saveShape(levelObj, common.checkMode, shapeStr, replayStr);
            if (result) {
              updateShapeButton();
            }
          }

          // ログ出力
          {
            const w = levelObj.w;
            const h = levelObj.h;
            const s = levelObj.s;
            const r = levelObj.r;
            const axis = levelObj.axis !== undefined ? ` axis: '${levelObj.axis}',` : '';
            const levelParams = `w: ${w}, h: ${h}, s: '${s}',${axis} r: '${replayStr}', step: ${replayStr.length}, subject: '${
              levelObj.subject ?? ''
            }'`;

            const levelObjStr = `{ ${levelParams} },`;
            // if (common.levelId === null) {
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
                consoleLog(`参照用公式記録は ${bestStep} 手です。\n(差: ${completedStep - bestStep} 手)`);
              }
            }
          }
        }

        if (settings.autoMode && !settingsAuto.paused) {
          clearTimeout(nextLevelTimerId);
          nextLevelTimerId = setTimeout(gotoNextLevel, AUTO_NEXT_LEVEL_DELAY);
        }
      } else {
        // if (symmetryFlag) {
        //   const text = app.svg.createText(blockSize, {
        //     x: 0,
        //     y: 0.5 + wallStrShift,
        //     text: 'Not connected',
        //     fill: 'white',
        //   });
        //   const width =
        //     (common.level.getWidth() * blockSize + 2 * frameSizeW) / 2;
        //   const height = (common.level.getHeight() - 1) * blockSize + frameSizeH;
        //   text.setAttribute('font-size', fontSize2);
        //   text.setAttribute('transform', `translate(${width},${height})`);
        //   g.appendChild(text);
        // }
      }

      // 今回の手数
      {
        const currentStep = undoInfo.getIndex();
        let color = common.isNumMode ? app.colors.stepNum : app.colors.stepNormal;
        if (isCompleted) {
          if (!highestScorePrev || currentStep <= highestScorePrev) {
            color = common.getStepColor(currentStep, bestStep);
          }
        }
        const text = app.svg.createText(frameSizeH, {
          x: 0,
          y: 0.5,
          text: `${currentStep} steps`,
          fill: color,
        });
        text.setAttribute('font-size', fontSize);
        const width = (common.level.getWidth() * blockSize + 2 * frameSizeW) / 2;
        const height = common.level.getHeight() * blockSize + frameSizeH - frameBorderWidth / 2;
        text.setAttribute('transform', `translate(${width},${height})`);
        g.appendChild(text);
      }

      // 自己最高記録
      if (common.levelId !== null) {
        const levelObj = common.level.getLevelObj();
        const highestScore = app.savedata.getHighestScore(levelObj, common.level.getCheckMode());

        {
          const crown = common.createCrown(
            frameSizeH,
            frameBorderWidth / frameSizeH,
            frameBorderWidth / frameSizeH,
            highestScore,
            bestStep
          );
          g.appendChild(crown);
          if (isCompleted) {
            const animationNewRecordCrownClass = 'animation-new-record-crown';
            if (highestScorePrev === null) {
              console.log('初回クリア');
              crown.classList.add(animationNewRecordCrownClass);
            } else if (highestScore === bestStep && highestScorePrev !== bestStep) {
              console.log('初回金冠');
              crown.classList.add(animationNewRecordCrownClass);
            }
          }
        }

        if (highestScore !== null) {
          const color = common.getStepColor(highestScore, bestStep);

          const text = app.svg.createText(frameSizeH, {
            x: 0,
            y: 0.5,
            text: `Your best: ${highestScore} steps`,
            fill: color,
          });
          const width = (common.level.getWidth() * blockSize + 2 * frameSizeW) / 2;
          const height = frameBorderWidth / 2;
          text.setAttribute('font-size', fontSize);
          text.setAttribute('transform', `translate(${width},${height})`);
          g.appendChild(text);
        }

        // 記録更新？
        if (highestScore !== null && highestScorePrev !== null && highestScore < highestScorePrev) {
          const width = (common.level.getWidth() * blockSize + 2 * frameSizeW) / 2;
          const height = frameSizeH + (0.5 - wallStrShift) * blockSize;
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

    function addEditButton(button, onClick, color) {
      if (button.dx === -1 && common.level.getW() <= common.minEditW) return;
      if (button.dy === -1 && common.level.getH() <= common.minEditH) return;
      if (button.dx === 1 && common.level.getW() >= common.maxEditW) return;
      if (button.dy === 1 && common.level.getH() >= common.maxEditH) return;

      const points = [];
      for (const point of button.points) {
        points.push([button.cx + 0.45 * point[0], button.cy + 0.45 * point[1]]);
      }

      const polygon = app.svg.createPolygon(blockSize, {
        points,
        fill: color.fill,
        stroke: color.stroke,
        strokeWidth: 0.1,
      });
      polygon.classList.add('button');
      polygon.addEventListener('click', onClick);
      g.appendChild(polygon);

      const char = button.dx + button.dy > 0 ? '+' : '-';
      const text = app.svg.createText(blockSize, {
        x: button.cx,
        y: button.cy,
        text: char,
        fill: color.stroke,
      });
      text.setAttribute('font-size', `${blockSize * 0.7}px`);
      g.appendChild(text);
    }

    // リプレイ用文字列が正常か否かのチェック。
    function validStepCheck() {
      const replayStr = undoInfo.getReplayStr();
      if (replayStr === null) {
        return false;
      }

      // TODO: クリアできるリプレイデータになっているかチェック。

      return true;
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
      common.showElem(elems.console.widget);
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

          canvas.setAttribute('width', width - 2 * frameSizeW);
          canvas.setAttribute('height', height - 2 * frameSizeH);

          const context = canvas.getContext('2d');
          context.drawImage(
            image,
            frameSizeW,
            frameSizeH,
            width - 2 * frameSizeW,
            height - 2 * frameSizeH,
            0,
            0,
            width - 2 * frameSizeW,
            height - 2 * frameSizeH
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
      common.hideElem(elems.console.widget);
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
        const xMax = common.level.getWidth() + 1;
        const yMax = common.level.getHeight() + 1;
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

    if (!common.level.isInsideInnerArea(x, y)) {
      return;
    }

    // タッチ環境の場合は、画面左端は必ずスワイプ操作できるように編集操作を無効化します。
    if (isTouchScreenAndNearLeftEdge(e)) {
      return;
    }

    e.preventDefault();

    if (touchStart && common.level.getState(x, y) === drawingState) {
      isRemoving = true;
    }
    touchStart = false;

    if (!isRemoving && common.level.getState(x, y) !== drawingState) {
      common.level.applyState(x, y, drawingState);
      addUndo(null);
      updateLinkUrl();
      drawMainSvg();
    } else if (isRemoving && common.level.getState(x, y) !== app.states.none) {
      common.level.applyState(x, y, app.states.none);
      addUndo(null);
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
      const x = Math.floor((cursorPos.x - frameSizeW) / blockSize);
      const y = Math.floor((cursorPos.y - frameSizeH) / blockSize);
      return { x, y };
    }
  }

  // 盤面サイズ変更
  function resizeLevel(dx, dy, flag) {
    const w = common.level.getW() + dx;
    const h = common.level.getH() + dy;
    if (w < 1) return;
    if (h < 1) return;
    if (w > common.maxW) return;
    if (h > common.maxH) return;

    common.level.resize(dx, dy, flag);
    addUndo(null);
    draw();
  }

  // 軸位置変更
  function moveAxis(dx, dy) {
    common.level.moveAxis(dx, dy);
    addUndo(null);
    draw();
  }

  function addUndo(dir) {
    undoInfo.pushData({
      dir,
      ...common.level.getCurrentLevelObj(),
      r: common.level.getR(),
    });

    updateUndoRedoButton();
  }

  function replaceUrlTitle() {
    const base = location.href.split('?')[0];
    const url = base;
    history.replaceState(null, '', url);
  }

  function replaceUrl() {
    if (common.isShownElem(elems.category.title)) {
      replaceUrlTitle();
      return;
    }
    const base = location.href.split('?')[0];
    let urlQuery;
    if (common.levelNum === null) {
      const levelObj = common.level.getLevelObj();
      urlQuery = app.Level.getUrlQuery(levelObj, common.level.getCheckMode());
    } else {
      const mode = app.Level.getCheckModeStr(common.level.getCheckMode());
      urlQuery = `mode=${mode}&num=${common.levelNum}`;
    }
    let url = `${base}?${urlQuery}`;
    if (settings.autoMode) url += '&auto';
    if (settings.debugFlag) url += '&debug';
    if (settings.mirrorFlag) url += '&mirror';
    if (settings.rotateNum !== 0) url += `&rotate=${settings.rotateNum}`;
    history.replaceState(null, '', url);
  }

  function updateButtonSpeedDisplay() {
    (settingsAuto.interval === settingsAuto.INTERVAL_MAX ? common.hideElem : common.showElem)(elems.auto.buttonSpeedDown);
    (settingsAuto.interval === 1 ? common.hideElem : common.showElem)(elems.auto.buttonSpeedUp);
  }

  function updateAutoMode(isOn) {
    if (isOn) {
      settings.autoMode = true;
      input.disable();
      common.showElem(elems.auto.buttons);
      updateEditMode(false);
    } else {
      clearTimeout(nextLevelTimerId);
      clearTimeout(redrawTimerId);
      settings.autoMode = false;
      settingsAuto.paused = true;
      input.enable();
      common.hideElem(elems.auto.buttons);

      input.update(app.Input.DIRS.NEUTRAL);
    }
    updateAutoStartPauseButtons();
    updateController();
    draw();
    replaceUrl();
  }

  function updateAutoStartPauseButtons() {
    if (settingsAuto.paused) {
      common.showElem(elems.auto.buttonStart);
      common.hideElem(elems.auto.buttonPause);
    } else {
      common.hideElem(elems.auto.buttonStart);
      common.showElem(elems.auto.buttonPause);
    }
  }

  function onButtonStop() {
    updateAutoMode(false);
    clearTimeout(nextLevelTimerId);
    clearTimeout(redrawTimerId);
  }

  function onButtonStart() {
    if (common.level.getBestStep() === undefined) {
      retryLevel();
      const levelObj = common.level.getCurrentLevelObj();
      // TODO activeElem を盤面に反映させてから計算する。Promiseを使うといけそう。
      // common.activeElem(elems.auto.buttonStart);
      const levelTemp = new app.Level({
        levelObj,
        checkMode: common.checkMode,
      });
      const maxStep = 1000; // 探索ステップ数上限値は大きな値にしておきます。時間制限もあるので、この制限にかかることはほぼないはずです。
      const timeLimit = 10;
      const result = app.solveLevel(null, levelTemp, { maxStep, timeLimit });
      // common.inactiveElem(elems.auto.buttonStart);
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
    if (common.level.isCompleted()) {
      gotoNextLevel();
    }

    intervalFuncAuto();
  }

  function onButtonPause() {
    settingsAuto.paused = true;
    updateAutoStartPauseButtons();
    clearTimeout(nextLevelTimerId);
    clearTimeout(redrawTimerId);
    clearTimeout(autoIntervalId);
  }

  function onButtonEnd() {
    const levelObj = common.level.getLevelObj();
    const r = levelObj.r;
    retryAndExecReplayStr(r);
  }

  function execReplayStr(r) {
    for (const dirChar of r) {
      const dir = Number(dirChar);
      tryMoving(dir);
    }
    draw();
  }

  function retryAndExecReplayStr(r) {
    const levelObj = common.level.getLevelObj();
    loadLevelObj(levelObj);
    execReplayStr(r);
  }

  function intervalFuncAuto() {
    const r = common.level.getLevelObj()?.r;
    if (!editMode && settings.autoMode) {
      if (!settingsAuto.paused) {
        if (r !== undefined) {
          const stepIndex = undoInfo.getIndex();
          if (stepIndex < r.length) {
            input.inputDir = Number(r[stepIndex]);
            inputFunc();
          }
        } else {
          settingsAuto.paused = true;
          updateAutoStartPauseButtons();
        }
      }
    }

    clearTimeout(autoIntervalId);
    autoIntervalId = setTimeout(intervalFuncAuto, settingsAuto.interval * INPUT_INTERVAL_MSEC);
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
    if (window.innerHeight * WINDOW_WIDTH >= window.innerWidth * WINDOW_HEIGHT) {
      elems.viewport.setAttribute('content', 'width=500');
    } else {
      const width = (WINDOW_HEIGHT * window.innerWidth) / window.innerHeight;
      elems.viewport.setAttribute('content', `width=${width}`);
    }
  }
})();
