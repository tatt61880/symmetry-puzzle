(function () {
  'use strict';
  const VERSION_TEXT = 'v' + '2026.11.07';

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
  const REPLAY_STEP_MSEC = MOVE_INTERVAL_MSEC * 2;

  const UNDO_INTERVAL_COUNT = 5;
  const UNDO_INTERVAL_MSEC = UNDO_INTERVAL_COUNT * INPUT_INTERVAL_MSEC;

  let moveIntervalCount = MOVE_INTERVAL_COUNT;
  let input;
  const moveKeys = new Set();
  const heldGameKeys = new Set();

  let settings = {
    autoMode: false,
    debugFlag: false,
    mirrorFlag: false,
    sharedFlag: false,
    rotateNum: 0,
  };

  let autoPaused = true;
  const AUTO_NEXT_LEVEL_DELAY = 1000;
  let nextLevelTimerId = null;

  let redrawTimerId = null;
  let replayTimerId = null;

  let editMode = false;
  let temporaryShowCharsFlag = false;
  let secretSequence = '';
  let isDrawing = false;
  let isRemoving = false;
  let touchStart = false;

  const undoInfoForEdit = new app.UndoInfo();
  let undoInfoForNormal;
  let undoFlag = false;
  let redoFlag = false;
  let undoIntervalId = null;
  let redoIntervalId = null;
  let autoIntervalId = null;
  let autoSeekPointerId = null;
  let autoSearchFrameId = null;

  let gotoPrevLevelIntervalId = null;
  let gotoNextLevelIntervalId = null;
  let gotoLevelsPrevPageIntervalId = null;
  let gotoLevelsNextPageIntervalId = null;
  let gotoShapesPrevPageIntervalId = null;
  let gotoShapesNextPageIntervalId = null;

  let levelHintState = 'locked';
  let hintWallPressCount = 0;
  let completeFlag = false;
  let symmetryFlag = false;

  let drawingState = app.states.none;
  const editboxFunctions = {};

  // 移動方向は上・右・下・左・軸操作の順です。
  const dxs = [0, 1, 0, -1, 0];
  const dys = [-1, 0, 1, 0, 0];
  let blockSize = 0;
  let desktopViewport = null;
  const defaultFrameSize = 32;
  let frameSizeW = defaultFrameSize;
  const frameSizeH = defaultFrameSize;

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
    if (!moveLevel(common.level, dir, document.documentElement)) return false;
    addUndo(dir);
    return true;
  }

  function moveLevel(level, dir, elem) {
    const dx = dxs[dir];
    const dy = dys[dir];

    if (!level.move(dx, dy)) return false;
    app.sound.playStep();
    elem.style.setProperty('--animation-move-transform', `translate(${-dx * blockSize}px, ${-dy * blockSize}px)`);
    return true;
  }

  function completeCheck() {
    if (editMode) return;

    const symmetryFlagPrev = symmetryFlag;
    completeFlag = common.level.isCompleted(); // 連結した対称図形であるとき
    symmetryFlag = common.level.isSymmetry(app.states.isTarget); // 連結しているか否かに関わらず対称図形であるとき
    const redrawFlag =
      completeFlag || // 完成したとき。
      (undoInfoForNormal.isUndoable() && symmetryFlag && symmetryFlag !== symmetryFlagPrev); // 初手以外で、対称フラグが変わったとき。
    if (redrawFlag && autoSeekPointerId === null) {
      const delay = settings.autoMode ? autoStepInterval() : MOVE_INTERVAL_MSEC;
      clearTimeout(redrawTimerId);
      redrawTimerId = setTimeout(drawMainSvg, delay, completeFlag);
    }

    if (completeFlag) {
      const center = common.level.getCenter(app.states.isTarget);
      document.documentElement.style.setProperty('--animation-origin', `${blockSize * center.x}px ${blockSize * center.y}px`);
    }
    if (settings.autoMode) {
      const length = common.level.getBestStep() ?? 0;
      elems.auto.seek.max = length;
      elems.auto.seek.value = Math.min(undoInfoForNormal.getIndex(), length);
      elems.auto.seek.disabled = length === 0;
    }
    updateLevelHint(settings.autoMode || completeFlag ? null : common.level.getHint());
  }

  function moveButtonStart(dir, e) {
    if (!input.isEnable()) return;
    e.preventDefault();
    startMoveInput(dir);
  }

  function startMoveInput(dir, isRepeat = false) {
    const previousDir = input.inputDir;
    input.update(dir);

    if (common.level === null || settings.autoMode || isRepeat) return;
    if (dir !== previousDir) countHintWallPress(dir);
    if (previousDir !== app.Input.DIRS.NEUTRAL || moveIntervalCount < MOVE_INTERVAL_COUNT) return;
    inputFunc(true);
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

  function releaseGameInput() {
    heldGameKeys.clear();
    moveKeys.clear();
    if (!settings.autoMode) input.update(app.Input.DIRS.NEUTRAL);
    undoEnd();
    redoEnd();
  }

  function pointerup() {
    undoEnd();
    redoEnd();
    clearInterval(gotoPrevLevelIntervalId);
    clearInterval(gotoNextLevelIntervalId);
    clearInterval(gotoLevelsPrevPageIntervalId);
    clearInterval(gotoLevelsNextPageIntervalId);
    clearInterval(gotoShapesPrevPageIntervalId);
    clearInterval(gotoShapesNextPageIntervalId);
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

  function parseClipboardLevel(text) {
    const start = text.indexOf('{');
    if (start < 0) throw new SyntaxError('盤面のオブジェクトがありません。');

    // 文字列とコメントをひとまとまりにし、説明文に含まれる括弧やカンマはそのまま扱います。
    const tokens = text.slice(start).match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|[\w$]+|[^\s]/g);
    const parts = [];
    let depth = 0;
    let hintStart;
    let hintEnd;
    for (const token of tokens) {
      if (token.startsWith('//') || token.startsWith('/*')) continue;
      if (token === ':') {
        const key = parts.pop();
        parts.push(key.startsWith('"') ? key : JSON.stringify(key), ':');
        if (depth === 1 && parts.at(-2) === '"hint"') hintStart = parts.length;
      } else if (token === '}' || token === ']') {
        if (parts.at(-1) === ',') parts.pop();
        if (depth === 1 && hintStart !== undefined && hintEnd === undefined) hintEnd = parts.length;
        parts.push(token);
        if (--depth === 0) break;
      } else {
        if (token === '{' || token === '[') ++depth;
        if (token === ',' && depth === 1 && hintStart !== undefined && hintEnd === undefined) hintEnd = parts.length;
        if (token.startsWith("'")) {
          const content = token.slice(1, -1).replace(/\\.|"/g, (s) => {
            if (s === "\\'") return "'";
            if (s === '"') return '\\"';
            return s;
          });
          parts.push('"' + content + '"');
        } else {
          parts.push(token);
        }
      }
    }
    try {
      return JSON.parse(parts.join(''));
    } catch (error) {
      // 組み込み面のヒントには map やスプレッド構文もあるため、該当面の登録済みデータを使います。
      if (hintEnd === undefined) throw error;
      parts.splice(hintStart, hintEnd - hintStart, 'null');
      const levelObj = JSON.parse(parts.join(''));
      delete levelObj.hint;
      if (getId(levelObj) === null) consoleWarn('ヒントを読み取れなかったため、盤面のみ貼り付けます。');
      return levelObj;
    }
  }

  async function keydown(e) {
    if (elems.auto.resultDialog.open || elems.menu.dialog.open || elems.edit.normalizeDialog.open) return;
    if (e.target === elems.auto.speed) return;
    if (e.target === elems.auto.searchCancel && (e.key === 'Enter' || e.key === ' ')) return;
    if (
      e.target === elems.auto.seek &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)
    ) {
      return;
    }
    // ダイアログを閉じた後、押したままのキーで盤面を操作しないようにします。
    if (e.repeat && !heldGameKeys.has(e.code)) return;
    heldGameKeys.add(e.code);
    if (e.altKey) return;
    if (
      (e.key === 'Enter' || e.key === ' ') &&
      [elems.controller.replay, elems.edit.normalizeHelp, elems.hint.toggle, elems.console.copySolver].includes(e.target)
    ) {
      return;
    }

    // 記録ダイアログで有効
    if (elems.records.dialog.open) {
      return;
    }

    // ヘルプダイアログで有効
    if (elems.help.dialog.open) {
      if (!e.ctrlKey) app.dialog.help.handleKey(e.key);
      return;
    }

    // レベル一覧ダイアログで有効
    if (elems.levels.dialog.open) {
      handleListDialogKey(e, app.dialog.levels);
      return;
    }

    // 形状一覧ダイアログで有効
    if (elems.shapes.dialog.open) {
      handleListDialogKey(e, app.dialog.shapes);
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
          if (common.isSeqMode) {
            gotoNumLineMode();
          } else {
            gotoNormalLineMode();
          }
          break;
        case 'z':
          if (e.shiftKey) return;
          if (common.isSeqMode) {
            gotoNumPointMode();
          } else {
            gotoNormalPointMode();
          }
          break;
        case 'o':
          if (e.shiftKey) return;
          if (common.isSeqMode) {
            gotoNumSpecialMode();
          } else {
            gotoNormalSpecialMode();
          }
          break;
        case '+':
        case '#':
          toggleNormalSeqMode();
          break;
        case '!':
          app.dialog.records.show();
      }
      return;
    }

    // 下段コントローラーが操作できない間は、対応するショートカットも受け付けません。
    if (settings.autoMode && !editMode && ['z', 'Z', 'y', 'Enter'].includes(e.key)) return;

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
          let levelObj;
          try {
            levelObj = parseClipboardLevel(await navigator.clipboard.readText());
            if (
              !Number.isInteger(levelObj.w) || levelObj.w <= 0 ||
              !Number.isInteger(levelObj.h) || levelObj.h <= 0 ||
              typeof levelObj.s !== 'string'
            ) {
              throw new Error('盤面の w, h, s を確認してください。');
            }
          } catch (error) {
            consoleWarn(`盤面を貼り付けられませんでした。 ${error.message}`);
            return;
          }
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
    } else if (e.key === 'Enter' && common.isShownElem(elems.controller.prevLevel)) {
      gotoPrevLevel();
    } else if (e.key === ' ') {
      if (settings.autoMode) {
        if (autoPaused) {
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
            // ↑
            case 'ArrowUp':
            case 'w':
            case 'k':
              return app.Input.DIRS.UP;
            // →
            case 'ArrowRight':
            case 'd':
            case 'l':
              return app.Input.DIRS.RIGHT;
            // ↓
            case 'ArrowDown':
            case 's':
            case 'j':
              return app.Input.DIRS.DOWN;
            // ←
            case 'ArrowLeft':
            case 'a':
            case 'h':
              return app.Input.DIRS.LEFT;
            // 軸
            case 'Enter':
              if (common.level.hasAxis()) {
                return app.Input.DIRS.AXIS;
              }
          }
          return null;
        })();

        if (dir !== null) {
          e.preventDefault();
          startMoveInput(dir, e.repeat);
          moveKeys.add(e.key);
        }
      }
    }

    if (editMode) {
      if (editboxFunctions[e.key]) {
        editboxFunctions[e.key]();
      } else if (e.key === '-' || e.key === '_' || e.key === '/' || e.key === '\\' || e.key === '|') {
        changeAxis();
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
    heldGameKeys.delete(e.code);
    if (common.isShownElem(elems.category.title)) return;
    moveKeys.delete(e.key);
    if (temporaryShowCharsFlag && e.key === ' ') {
      temporaryShowCharsFlag = false;
      drawMainSvg();
    }

    if (moveKeys.size === 0) {
      undoEnd();
      redoEnd();

      if (!settings.autoMode) {
        input.update(app.Input.DIRS.NEUTRAL);
      }
    }
    return false;
  }

  function handleListDialogKey(e, dialog) {
    if (e.ctrlKey) return;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'k':
        dialog.selectUp();
        break;
      case 'ArrowRight':
      case 'd':
      case 'l':
        if (e.shiftKey) {
          dialog.nextPage();
        } else {
          dialog.selectRight();
        }
        break;
      case 'ArrowDown':
      case 's':
      case 'j':
        dialog.selectDown();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'h':
        if (e.shiftKey) {
          dialog.prevPage();
        } else {
          dialog.selectLeft();
        }
        break;
      case 'Enter':
        dialog.selectEnter();
        break;
      case '#':
        dialog.close();
        break;
    }
  }

  function retryLevel() {
    if (editMode) return;
    cancelAutoSearch();

    resetLevelHint();
    window.getSelection().removeAllRanges();

    clearTimeout(nextLevelTimerId);
    clearTimeout(redrawTimerId);

    animateIcons();
    addAnimationClass(elems.level.retryArrow, 'rotate-ccw');

    app.sound.playStart();

    {
      const levelObj = undoInfoForNormal.undoAll();
      const resizeFlag = common.level.getW() !== levelObj.w || common.level.getH() !== levelObj.h;
      common.level.applyObj(levelObj, resizeFlag);
    }

    draw();
    scheduleNextAutoStep();
  }

  function resetUndo() {
    resetLevelHint();
    undoInfoForNormal = new app.UndoInfo();
  }

  function initLevel(paramObj) {
    stopReplay();
    paramObj.checkMode = common.checkMode;
    common.level = new app.Level(paramObj);

    app.sound.playStart();

    addUndo(null);
    draw();
  }

  function onWindowResize() {
    setTimeout(draw, 500);
  }

  function draw() {
    app.dialog.shapes.finishDiscovery();
    if (common.isHiddenElem(elems.category.game)) return;

    updateSvg();
    updateUndoRedoButton();
    updateEditAxisButton();
    completeCheck();
    drawMainSvg();
  }

  function getGameHeight() {
    const { innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio } = window;
    if (!window.matchMedia('(pointer: fine)').matches || !innerWidth || !outerWidth || !outerHeight) return innerHeight;

    // ページ拡大や右側の開発者ツールの開閉では、表示領域の物理的な高さは変わりません。
    const deviceHeight = innerHeight * devicePixelRatio;
    if (
      desktopViewport &&
      outerHeight === desktopViewport.outerHeight &&
      Math.abs(deviceHeight - desktopViewport.deviceHeight) <= devicePixelRatio
    ) {
      return Math.round(deviceHeight / desktopViewport.displayScale);
    }

    // 拡大済みで開いた場合はウィンドウ幅から倍率を推定します。左右の窓枠分は等倍とみなします。
    let zoom = devicePixelRatio / (desktopViewport?.displayScale ?? devicePixelRatio);
    const frameTolerance = 16;
    if (Math.abs(outerWidth - innerWidth) <= frameTolerance) {
      zoom = 1;
    } else if (Math.abs(outerWidth - innerWidth * zoom) > frameTolerance) {
      const widthRatio = outerWidth / innerWidth;
      if (innerHeight * widthRatio > outerHeight + 1) {
        // 横に開いた開発者ツールなどの幅は不明です。幅を使えるようになるまで推定を保留します。
        desktopViewport ??= { displayScale: devicePixelRatio };
        return Math.round(innerHeight * zoom);
      }
      zoom = widthRatio;
    }
    desktopViewport = { outerHeight, deviceHeight, displayScale: devicePixelRatio / zoom };
    return Math.round(innerHeight * zoom);
  }

  function updateSvg() {
    const divMainHeight = Math.max(
      frameSizeH * 3,
      getGameHeight() -
        10 -
        [
          //
          elems.header,
          elems.level.widget,
          elems.auto.buttons,
          elems.controller.widget,
          elems.edit.widget,
          elems.footer,
        ].reduce((sum, elem) => sum + elem.getBoundingClientRect().height, 0)
    );
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

    const svgHeight = blockSize * common.level.getHeight() + 2 * frameSizeH;
    const svgWidth = blockSize * common.level.getWidth() + 2 * frameSizeW;
    elems.main.div.style.setProperty('--board-width', `${svgWidth}px`);
    elems.main.div.style.setProperty('--board-half-height', `${svgHeight / 2}px`);
    for (const svg of [elems.main.svg, elems.main.replaySvg]) {
      svg.setAttribute('width', svgWidth);
      svg.setAttribute('height', svgHeight);
    }
  }

  function updateUndoRedoButton() {
    if (undoInfoForNormal !== undefined) {
      if (undoInfoForNormal.isUndoable()) {
        common.showElem(elems.controller.undo);
      } else {
        common.hideElem(elems.controller.undo);
      }

      if (undoInfoForNormal.isRedoable()) {
        common.showElem(elems.controller.redo);
      } else {
        common.hideElem(elems.controller.redo);
      }
    }

    // エディトモード用
    if (undoInfoForEdit !== undefined) {
      if (undoInfoForEdit.isUndoable()) {
        common.showElem(elems.edit.undo);
      } else {
        common.hideElem(elems.edit.undo);
      }

      if (undoInfoForEdit.isRedoable()) {
        common.showElem(elems.edit.redo);
      } else {
        common.hideElem(elems.edit.redo);
      }
    }
  }

  function execUndo() {
    window.getSelection().removeAllRanges();

    const undoInfo = editMode ? undoInfoForEdit : undoInfoForNormal;

    if (undoInfo.isUndoable()) {
      app.sound.playUndo();
      const levelObj = undoInfo.undo();
      const resizeFlag = common.level.getW() !== levelObj.w || common.level.getH() !== levelObj.h;
      common.level.applyObj(levelObj, resizeFlag);
      common.level.applyAxis(levelObj.axis);
      if (common.checkMode !== levelObj.checkMode) {
        common.level.setCheckMode(levelObj.checkMode);
        updateCheckMode(levelObj.checkMode);
      }
      draw();
    }
  }

  function execRedo() {
    window.getSelection().removeAllRanges();

    const undoInfo = editMode ? undoInfoForEdit : undoInfoForNormal;

    if (undoInfo.isRedoable()) {
      app.sound.playRedo();
      const levelObj = undoInfo.redo();
      const resizeFlag = common.level.getW() !== levelObj.w || common.level.getH() !== levelObj.h;
      common.level.applyObj(levelObj, resizeFlag);
      common.level.applyAxis(levelObj.axis);
      if (common.checkMode !== levelObj.checkMode) {
        common.level.setCheckMode(levelObj.checkMode);
        updateCheckMode(levelObj.checkMode);
      }
      draw();
    }
  }

  function createObjByNum(num_) {
    common.levelId = num_;
    common.levelNum = num_;

    const digitStates = {
      //   -, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      0: '000111001111111101111111111111111',
      1: '000101001001001101100100001101101',
      2: '111101001111111111111111001111111',
      3: '000101001100001001001101001101001',
      4: '000111001111111001111111001111111',
    };

    let isMinus = false;

    let num = num_;
    if (num < 0) {
      num = -num;
      isMinus = true;
    }

    const digits = [];

    while (num) {
      digits.unshift(num % 10);
      num = Math.floor(num / 10);
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
      const num = Math.floor(id);
      levelObj = createObjByNum(num);
    }

    consoleLog(`[LEVEL ${id}]${levelObj?.subject ?? ''}`);

    loadLevelObj(levelObj);
    if (isLocalhost()) {
      common.level.printSolveJsStr();
    }

    updateLevelVisibility();
    elems.level.id.textContent = common.levelId;
    replaceUrl();

    if (id_ === 1 && common.levelNum === null) {
      // 通常モードのレベル1をロード時、レベル1を未クリアのときはヘルプ画面を表示する。
      const playerScore = app.savedata.getHighestScore(common.level);
      if (playerScore === null) {
        app.dialog.help.show(false);
      }
    }
  }

  function updateShapeButton(discoveredShape = null) {
    const shapesObj = common.level && app.savedata.getShapesObj(common.level);
    if (!shapesObj) {
      common.hideElem(elems.shapes.buttonG);
      return;
    }

    common.showElem(elems.shapes.buttonG);
    const count = Object.keys(shapesObj).length;
    const denumerator = common.level.getShapes() ?? '?';
    elems.shapes.buttonDenumerator.textContent = denumerator;
    const fill = common.isSeqMode ? app.colors.frameFillSeqMode : app.colors.frameFill;
    const stroke = common.isSeqMode ? app.colors.frameStrokeSeqMode : app.colors.frameStroke;
    elems.shapes.button.setAttribute('fill', fill);
    elems.shapes.button.setAttribute('stroke', stroke);

    if (discoveredShape) {
      const center = common.level.getCenter(app.states.isTarget);
      const source = new DOMPoint(frameSizeW + blockSize * center.x, frameSizeH + blockSize * center.y);
      if (app.dialog.shapes.animateDiscovery(discoveredShape, blockSize, source, () => showCount(count))) {
        showCount(count - 1);
        return;
      }
    }
    showCount(count);

    function showCount(numerator) {
      elems.shapes.buttonNumerator.textContent = numerator;
      let fontColor = numerator === denumerator ? app.colors.shapeNumPerfect : app.colors.shapeNumNormal;
      if (common.isSeqMode) fontColor = app.colors.shapeNumSeqMode;
      elems.shapes.buttonNumerator.setAttribute('fill', fontColor);
      elems.shapes.buttonLine.setAttribute('fill', fontColor);
      elems.shapes.buttonDenumerator.setAttribute('fill', fontColor);
    }
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
      scheduleNextAutoStep();
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

    common.hideElem(elems.level.edit);

    if (common.levelId !== null) {
      common.showElem(elems.level.id);
      common.showElem(elems.levels.button);
    } else {
      common.hideElem(elems.level.id);
      common.hideElem(elems.levels.button);

      if (!settings.sharedFlag) {
        common.showElem(elems.level.edit);
      }
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

  function gotoPrevLevelButton() {
    const style = window.getComputedStyle(elems.controller.prevLevel);
    if (style.opacity > 0.5) {
      gotoPrevLevel();
    }
  }

  function updateEditMode(isEditMode, resetFlag = true) {
    editMode = isEditMode;
    elems.level.edit.classList.toggle('editing', editMode);

    if (editMode) {
      common.showElem(elems.edit.widget);
      updateLevelHint(null);
      common.hideElem(elems.controller.widget);
      common.hideElem(elems.level.retry);
      addUndo(null);
    } else {
      common.hideElem(elems.edit.widget);
      common.showElem(elems.controller.widget);
      common.showElem(elems.level.retry);

      if (resetFlag && undoInfoForNormal) {
        resetUndo();
        addUndo(null);
      }
    }
  }

  // エディトモードのオンオフ
  function toggleEditLevel() {
    app.dialog.shapes.finishDiscovery();
    cancelAutoSearch();
    settings.sharedFlag = false;

    app.sound.playButton();
    editMode = !editMode;
    switchToCustomLevel();
    updateEditMode(editMode);

    if (editMode) {
      updateEditAxisButton();
      updateEditElems();
    } else {
      // 正規化します。
      common.level.normalize();

      // 現在の盤面を初期値とするレベルに更新しておかないと、クリア時のセーブ情報がバグります。
      common.level = new app.Level({ levelObj: common.level.getCurrentLevelObj(), checkMode: common.checkMode });
      const base = location.href.split('?')[0];
      const urlQuery = common.level.getCurrentUrlQuery();
      const url = `${base}?${urlQuery}`;
      history.replaceState(null, '', url);

      updateShapeButton();
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
    requestAnimationFrame(() => {
      elem.classList.add(className);
    });

    elem.addEventListener(
      'animationend',
      () => {
        elem.classList.remove(className);
      },
      { once: true }
    );
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

    let stopFlag = false;

    const ON_POINTER_UP = Symbol('onPointerUp');

    if (elem[ON_POINTER_UP]) {
      elem.removeEventListener('pointerup', elem[ON_POINTER_UP]);
    }

    const onPointerUp = () => {
      stopFlag = true;
    };

    elem[ON_POINTER_UP] = onPointerUp;
    // pointerdown だと、スワイプ操作の無効化との相性が悪いので、 pointerup にします。
    elem.addEventListener('pointerup', onPointerUp);

    const intervalId = setInterval(() => {
      if (!common.isShownElem(elems.category.title)) {
        return;
      }

      if (stopFlag) {
        stopFlag = false;
      } else if (getRand(1, 15) !== 1) {
        const moveFlag = level.move(dx, 0);
        if (!moveFlag) {
          clearInterval(intervalId);
          initTitleCharacter(elem);
          return;
        }
      }

      elem.textContent = '';

      elem.style.setProperty('--animation-move-transform', `translate(${-dx * blockSize}px, ${-dy * blockSize}px)`);

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
    let lang = app.savedata.getLang();
    if (lang === undefined) {
      const userLang = window.navigator.language;
      switch (userLang) {
        case 'ja':
        case 'ja-JP':
          lang = 'ja';
          break;
        default:
          lang = 'en';
      }
      app.savedata.saveLang(lang);
      app.dialog.help.show(false);
    }
    common.applyLangAll(lang);
  }

  function onloadApp() {
    elems.version.textContent = VERSION_TEXT;
    elems.help.version.textContent = VERSION_TEXT;
    elems.records.version.textContent = VERSION_TEXT;
    elems.achievements.version.textContent = VERSION_TEXT;

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
    stopReplay();
    settings.sharedFlag = false;

    completeFlag = false;
    window.getSelection().removeAllRanges();

    common.levelNum = null;
    updateCheckMode(null);
    common.showElem(elems.category.title);
    common.hideElem(elems.category.game);
    updateAutoMode(false);
    replaceUrlTitle();
    app.sound.playButton();

    // ある程度クリアするまで連番モードを隠します。
    common.updateTitleSeqModeButton();
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
      updateNormalSeqMode(!idFlag);
      if (common.isSeqMode) {
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

    switchToCustomLevel();
    loadLevelObj(levelObj);
  }

  function switchToCustomLevel() {
    common.levelId = null;
    common.levelNum = null;
    if (common.isSeqMode) updateNormalSeqMode(false);
    updateLevelVisibility();
  }

  function initSoundButtons() {
    const buttons = [elems.help.sound, elems.menu.sound];
    for (const button of buttons) {
      button.appendChild(elems.soundIcon.content.cloneNode(true));
      button.addEventListener('click', toggleSound);
    }

    async function toggleSound() {
      const enable = !app.sound.isEnabled();
      for (const button of buttons) {
        button.setAttribute('aria-pressed', String(enable));
      }

      if (!enable) {
        app.sound.disable();
        app.sound.stopBgm();
      } else {
        await app.sound.enable();
        await app.sound.resumeIfNeeded();
        if (app.sound.isEnabled() && !app.sound.isBgmPlaying()) {
          app.sound.playStart();
          app.sound.startBgm();
        }
      }
    }
  }

  function initElems() {
    let setTimeoutIdOnWindowResize = null;
    window.addEventListener('resize', () => {
      if (setTimeoutIdOnWindowResize !== null) {
        clearTimeout(setTimeoutIdOnWindowResize);
      }
      setTimeoutIdOnWindowResize = setTimeout(onWindowResize, 100);
    });

    {
      [document.body, elems.contents].forEach((elem) => {
        elem.addEventListener('mousedown', (e) => {
          // シークバー・倍率選択・ダイアログでは、ブラウザーにフォーカスを移させます。
          if (e.target === elems.auto.seek || e.target === elems.auto.speed || document.activeElement === elems.auto.speed) return;
          if (e.target === elems.auto.searchCancel) return;
          if (e.detail === 1 && e.target.closest('button[aria-haspopup="dialog"], dialog button')) return;
          // ダブルタップしたときの画面の拡大縮小をしないようにする。
          e.preventDefault();
        });
      });

      const touchDevice = common.isTouchDevice();
      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      [document.body, elems.contents].forEach((elem) => {
        elem.addEventListener(
          pointermoveEventName,
          (e) => {
            if (e.target === elems.auto.seek || e.target === elems.auto.speed) return;
            if (elems.help.dialogDiv.contains(e.target) || elems.edit.normalizeDialog.open || common.isShownElem(elems.console.widget)) return;
            // スワイプ操作を無効化する。
            e.preventDefault();
          },
          { passive: false } // Safari on iOS で passive のデフォルトが true になっていないために body を拡大縮小できてしまう問題に対する対策。
        );
      });
    }

    elems.top.addEventListener('click', gotoTitlePage);
    elems.console.copySolver.addEventListener('click', () => copyTextToClipboard(common.level.getSolverCommand()));

    initElemsForAuto();
    initElemsForEdit();
    elems.hint.toggle.addEventListener('click', () => {
      releaseGameInput();
      app.sound.playButton();
      levelHintState = levelHintState === 'showing' ? 'available' : 'showing';
      updateLevelHint(common.level.getHint());
    });
    initSoundButtons();
    app.dialog.help.init();
    initElemsForTitle();
    initElemsForRecords();
    initElemsForAchievements();
    initElemsForLevelWidget();
    initElemsForLevelsDialog();
    initElemsForShapesDialog();
    initLogo();

    // キー入力用
    {
      document.addEventListener('keydown', keydown);
      document.addEventListener('keyup', keyup);
      window.addEventListener('blur', releaseGameInput);
    }

    // タッチ入力用
    {
      elems.main.svg.addEventListener('pointerdown', pointerDown);
      elems.main.svg.addEventListener('pointermove', pointerMove);
      elems.main.svg.addEventListener('pointerup', pointerUp);
      elems.main.svg.oncontextmenu = function () {
        return !editMode;
      };

      elems.controller.undo.addEventListener('pointerdown', undodown);
      elems.edit.undo.addEventListener('pointerdown', undodown);

      elems.controller.redo.addEventListener('pointerdown', redodown);
      elems.edit.redo.addEventListener('pointerdown', redodown);

      elems.controller.buttons.up.addEventListener('pointerdown', moveButtonStart.bind(null, app.Input.DIRS.UP));
      elems.controller.buttons.right.addEventListener('pointerdown', moveButtonStart.bind(null, app.Input.DIRS.RIGHT));
      elems.controller.buttons.down.addEventListener('pointerdown', moveButtonStart.bind(null, app.Input.DIRS.DOWN));
      elems.controller.buttons.left.addEventListener('pointerdown', moveButtonStart.bind(null, app.Input.DIRS.LEFT));
      elems.controller.buttons.axis.addEventListener('pointerdown', moveButtonStart.bind(null, app.Input.DIRS.AXIS));

      elems.controller.nextLevel.addEventListener('click', gotoNextLevelButton);
      elems.controller.prevLevel.addEventListener('click', gotoPrevLevelButton);
      elems.controller.replay.addEventListener('click', toggleReplay);

      // メニューダイアログ
      elems.menu.button.addEventListener('click', () => {
        releaseGameInput();
        app.dialog.menu.show();
      });
      elems.menu.dialog.addEventListener('click', app.dialog.menu.close);
      elems.menu.close.addEventListener('click', app.dialog.menu.close);
      elems.menu.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
      elems.menu.title.addEventListener('click', menuGotoTitlePage);
      elems.menu.retry.addEventListener('click', menuRetryLevel);

      document.addEventListener('pointerup', pointerup);

      input = new app.Input(elems.controller.buttons, () => common.level?.releaseBumpFaces());
    }

    function menuGotoTitlePage() {
      app.dialog.menu.close(false);
      gotoTitlePage();
    }

    function menuRetryLevel() {
      app.dialog.menu.close(false);
      retryLevel();
    }
  }

  // Autoモード用
  function initElemsForAuto() {
    elems.auto.seek.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary || e.button !== 0) return;
      autoSeekPointerId = e.pointerId;
      elems.auto.seek.setPointerCapture(e.pointerId);
      clearTimeout(nextLevelTimerId);
      clearTimeout(redrawTimerId);
    });
    elems.auto.seek.addEventListener('lostpointercapture', (e) => {
      if (e.pointerId !== autoSeekPointerId) return;
      autoSeekPointerId = null;
      if (completeFlag) completeCheck();
      scheduleNextAutoStep();
    });
    elems.auto.seek.addEventListener('input', seekAuto);
    elems.auto.buttonStop.addEventListener('click', onButtonStop);
    elems.auto.resultDialog.addEventListener('close', () => app.sound.playUiClose());
    elems.auto.buttonStart.addEventListener('click', onButtonStart);
    elems.auto.searchCancel.addEventListener('click', () => {
      app.sound.playButton();
      cancelAutoSearch();
    });
    elems.auto.buttonPause.addEventListener('click', onButtonPause);
    elems.auto.buttonEnd.addEventListener('click', onButtonEnd);
    elems.auto.speed.addEventListener('change', () => {
      app.sound.playButton();
      if (autoSeekPointerId === null && !completeFlag) scheduleNextAutoStep();
    });
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

        {
          const g = app.svg.createG();
          g.classList.add('button-transform');

          const gBlock = levelForEditChar.createSvgG({
            blockSize: 40,
            showCharsFlag: true,
            smallJumpFlag: true,
            drawBackground: char === '0',
            x0: 2,
            y0: 2,
            width: 1,
            height: 1,
          });

          g.appendChild(gBlock);
          elem.appendChild(g);
        }

        const func = () => {
          app.sound.playButton();
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

    // 軸変更ボタン
    elems.edit.buttons.axis.addEventListener('click', changeAxis);

    // モード変更ボタン
    elems.edit.switchMode.addEventListener('click', () => {
      app.sound.playButton();

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
      addUndo(null);
      draw();
    });

    // 鏡映ボタン
    elems.edit.mirror.addEventListener('click', () => {
      app.sound.playButton();
      common.level.mirror();
      addUndo(null);
      draw();
    });

    // 回転ボタン
    elems.edit.rotate.addEventListener('click', () => {
      app.sound.playButton();
      common.level.rotate(1);
      addUndo(null);
      draw();
    });

    // 正規化ボタン
    elems.edit.normalize.addEventListener('click', () => {
      app.sound.playButton();

      if (!common.level.isNormalized()) {
        common.level.normalize();
        addUndo(null);
        draw();
      }
    });

    const dialog = elems.edit.normalizeDialog;
    elems.edit.normalizeHelp.addEventListener('click', () => {
      releaseGameInput();
      app.sound.playUiOpen();
      elems.edit.normalizeHelp.focus({ preventScroll: true });
      dialog.showModal();
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => app.sound.playUiClose());
  }

  function changeAxis() {
    app.sound.playButton();

    common.level.changeAxis();
    updateEditAxisButton();
    addUndo(null);
    draw();
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
    elems.title.buttonSeqLine.addEventListener('click', gotoNumLineMode);

    // 点対称-連番モード
    elems.title.buttonSeqPoint.addEventListener('click', gotoNumPointMode);

    // 線点対称-連番モード
    elems.title.buttonSeqSpecial.addEventListener('click', gotoNumSpecialMode);

    elems.title.buttonToggleToNormal.addEventListener('click', toggleNormalSeqMode);
    elems.title.buttonToggleToSeq.addEventListener('click', toggleNormalSeqMode);
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

  function updateNormalSeqMode(isSeqMode) {
    if (isSeqMode) {
      common.isSeqMode = true;
      common.hideElem(elems.title.buttonNormalsTr);
      common.showElem(elems.title.buttonSeqsTr);
      common.showElem(elems.title.buttonToggleToNormalDiv);
      common.hideElem(elems.title.buttonToggleToSeqDiv);

      for (const elem of document.getElementsByClassName('normal-mode')) {
        elem.classList.add('hide');
      }
      for (const elem of document.getElementsByClassName('seq-mode')) {
        elem.classList.remove('hide');
      }
    } else {
      common.isSeqMode = false;
      common.showElem(elems.title.buttonNormalsTr);
      common.hideElem(elems.title.buttonSeqsTr);
      common.hideElem(elems.title.buttonToggleToNormalDiv);
      common.showElem(elems.title.buttonToggleToSeqDiv);

      for (const elem of document.getElementsByClassName('normal-mode')) {
        elem.classList.remove('hide');
      }
      for (const elem of document.getElementsByClassName('seq-mode')) {
        elem.classList.add('hide');
      }
    }

    animateIcons();
  }

  function toggleNormalSeqMode() {
    if (common.isShownElem(elems.title.buttonToggleToSeqDiv)) {
      app.sound.playButton();
      updateNormalSeqMode(true);
    } else if (common.isShownElem(elems.title.buttonToggleToNormalDiv)) {
      app.sound.playButton();
      updateNormalSeqMode(false);
    }
  }

  // 記録画面用
  function initElemsForRecords() {
    const size = Number(elems.records.buttonSvg.dataset.crownSize);
    const crown = common.createCrown(size, 0, 0, 1, 1);
    elems.records.buttonSvg.appendChild(crown);
    elems.records.button.addEventListener('click', app.dialog.records.show);
    elems.records.dialog.addEventListener('click', app.dialog.records.close);
    elems.records.dialog.addEventListener('cancel', app.dialog.records.cancel); // Escで閉じたとき用。
    elems.records.close.addEventListener('click', app.dialog.records.close);
    elems.records.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
    elems.records.backup.addEventListener('click', app.dialog.records.backup);
    elems.records.restore.addEventListener('click', app.dialog.records.restore);
  }

  // 実績画面用
  function initElemsForAchievements() {
    const size = Number(elems.achievements.buttonSvg.dataset.starSize);
    const star = app.svg.createStar(size, { x: 0, y: 0, fill: '#ffd54a', stroke: '#c08a00' });
    elems.achievements.buttonSvg.appendChild(star);
    elems.achievements.button.addEventListener('click', app.dialog.achievements.show);
    elems.achievements.dialog.addEventListener('click', app.dialog.achievements.close);
    elems.achievements.close.addEventListener('click', app.dialog.achievements.close);
    elems.achievements.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
  }

  // レベル操作用
  function initElemsForLevelWidget() {
    elems.level.retry.addEventListener('click', retryLevel);

    {
      elems.level.prev.addEventListener('pointerdown', gotoPrevLevelStart);
      elems.level.prev.addEventListener('pointerup', gotoPrevLevelEnd);
      elems.level.next.addEventListener('pointerdown', gotoNextLevelStart);
      elems.level.next.addEventListener('pointerup', gotoNextLevelEnd);
    }
    elems.level.edit.addEventListener('click', toggleEditLevel);
    elems.levels.button.addEventListener('click', app.dialog.levels.show);
    elems.levels.dialog.addEventListener('click', app.dialog.levels.close);
    elems.levels.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
    elems.levels.display.checkbox.addEventListener('click', app.dialog.levels.update);
  }

  function gotoPrevLevelStart(e) {
    if (e.button === 2) return; // 右クリックは無視
    gotoPrevLevel();
    gotoPrevLevelIntervalId = setInterval(gotoPrevLevel, MOVE_INTERVAL_MSEC * 1.5);
  }

  function gotoPrevLevelEnd() {
    clearInterval(gotoPrevLevelIntervalId);
  }

  function gotoNextLevelStart(e) {
    if (e.button === 2) return; // 右クリックは無視
    gotoNextLevel();
    gotoNextLevelIntervalId = setInterval(gotoNextLevel, MOVE_INTERVAL_MSEC * 1.5);
  }

  function gotoNextLevelEnd() {
    clearInterval(gotoNextLevelIntervalId);
  }

  // レベル一覧ダイアログ
  function initElemsForLevelsDialog() {
    elems.levels.close.addEventListener('click', app.dialog.levels.close);
    {
      elems.levels.prev.addEventListener('pointerdown', gotoLevelsPrevPageStart);
      elems.levels.prev.addEventListener('pointerup', gotoLevelsPrevPageEnd);
      elems.levels.next.addEventListener('pointerdown', gotoLevelsNextPageStart);
      elems.levels.next.addEventListener('pointerup', gotoLevelsNextPageEnd);
    }
  }

  function gotoLevelsPrevPageStart(e) {
    if (e.button === 2) return; // 右クリックは無視
    app.dialog.levels.prevPage();
    gotoLevelsPrevPageIntervalId = setInterval(app.dialog.levels.prevPage, MOVE_INTERVAL_MSEC * 1.5);
  }

  function gotoLevelsPrevPageEnd() {
    clearInterval(gotoLevelsPrevPageIntervalId);
  }

  function gotoLevelsNextPageStart(e) {
    if (e.button === 2) return; // 右クリックは無視
    app.dialog.levels.nextPage();
    gotoLevelsNextPageIntervalId = setInterval(app.dialog.levels.nextPage, MOVE_INTERVAL_MSEC * 1.5);
  }

  function gotoLevelsNextPageEnd() {
    clearInterval(gotoLevelsNextPageIntervalId);
  }

  // 形状一覧ダイアログ
  function initElemsForShapesDialog() {
    elems.shapes.buttonG.addEventListener('click', app.dialog.shapes.show);
    elems.shapes.dialog.addEventListener('click', app.dialog.shapes.close);
    elems.shapes.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
    elems.shapes.close.addEventListener('click', app.dialog.shapes.close);
    {
      elems.shapes.prev.addEventListener('pointerdown', gotoShapesPrevPageStart);
      elems.shapes.prev.addEventListener('pointerup', gotoShapesPrevPageEnd);
      elems.shapes.next.addEventListener('pointerdown', gotoShapesNextPageStart);
      elems.shapes.next.addEventListener('pointerup', gotoShapesNextPageEnd);
    }
  }

  function gotoShapesPrevPageStart(e) {
    if (e.button === 2) return; // 右クリックは無視
    app.dialog.shapes.prevPage();
    gotoShapesPrevPageIntervalId = setInterval(app.dialog.shapes.prevPage, MOVE_INTERVAL_MSEC * 1.5);
  }

  function gotoShapesPrevPageEnd() {
    clearInterval(gotoShapesPrevPageIntervalId);
  }

  function gotoShapesNextPageStart(e) {
    if (e.button === 2) return; // 右クリックは無視
    app.dialog.shapes.nextPage();
    gotoShapesNextPageIntervalId = setInterval(app.dialog.shapes.nextPage, MOVE_INTERVAL_MSEC * 1.5);
  }

  function gotoShapesNextPageEnd() {
    clearInterval(gotoShapesNextPageIntervalId);
  }

  function initLogo() {
    function initLogoSub({ className, levelObj, checkMode, event = false }) {
      for (const elem of document.getElementsByClassName(className)) {
        const initElem = () => {
          elem.textContent = '';

          const level = new app.Level({
            levelObj,
            checkMode,
          });

          const blockSize = Number(elem.dataset.blockSize);
          const g = level.createSvgG({
            blockSize,
            smallJumpFlag: true,
            drawBackground: false,
            x0: 1,
            y0: 1,
            width: levelObj.w,
            height: levelObj.h,
          });

          elem.appendChild(g);
        };

        initElem();

        if (event) {
          // pointerdown だと、スワイプ操作の無効化との相性が悪いので、 pointerup にします。
          elem.addEventListener('pointerup', initElem);
        }
      }
    }

    for (const obj of [
      { className: 'logo-app', levelObj: { w: 3, h: 3, s: '01-222-02' }, checkMode: app.Level.CHECK_MODE.SPECIAL },

      { className: 'logo-line-s', levelObj: { w: 5, h: 4, s: '-0112-001s' }, checkMode: app.Level.CHECK_MODE.LINE, event: true },
      { className: 'logo-point-s', levelObj: { w: 5, h: 4, s: '-011s-0012' }, checkMode: app.Level.CHECK_MODE.POINT, event: true },
      { className: 'logo-special-s', levelObj: { w: 5, h: 4, s: '-011-021s' }, checkMode: app.Level.CHECK_MODE.SPECIAL, event: true },

      { className: 'logo-line', levelObj: { w: 3, h: 2, s: '112-01' }, checkMode: app.Level.CHECK_MODE.LINE },
      { className: 'logo-point', levelObj: { w: 3, h: 2, s: '11-012' }, checkMode: app.Level.CHECK_MODE.POINT },
      { className: 'logo-special', levelObj: { w: 2, h: 2, s: '11-21' }, checkMode: app.Level.CHECK_MODE.SPECIAL },

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

  function inputFunc(immediate = false) {
    if (input.inputDir === app.Input.DIRS.NEUTRAL) return;
    if (undoFlag) return;
    if (redoFlag) return;
    if (!editMode && completeFlag) return;

    if (settings.autoMode) {
      input.update(input.inputDir);
    }
    // 即時入力後の最初のタイマーでは 0 に進め、長押しの次の一手が従来より早まるのを防ぎます。
    moveIntervalCount = immediate ? -1 : 0;

    const movedFlag = tryMoving(input.inputDir);
    if (movedFlag) {
      drawMainSvg();
      completeCheck();
    } else {
      drawMainSvg(); // 目の向きをリセットするために、描画し直します。

      if (input.inputDir !== app.Input.DIRS.AXIS) {
        const dx = dxs[input.inputDir];
        const dy = dys[input.inputDir];

        const pixel = 4;
        document.documentElement.style.setProperty('--animation-illegal-move', `translate(${dx * pixel}px, ${dy * pixel}px)`);

        // 動けないときは盤面を振動させます。
        addAnimationClass(elems.main.svg, 'animation-illegal-move');
        app.sound.playBump();
      } else {
        const className = (() => {
          switch (common.level.getAxisType()) {
            case app.Level.SYMMETRY_TYPE.LINE1: {
              return 'animation-illegal-move-line1';
            }
            case app.Level.SYMMETRY_TYPE.LINE2: {
              return 'animation-illegal-move-line2';
            }
            case app.Level.SYMMETRY_TYPE.LINE3: {
              return 'animation-illegal-move-line3';
            }
            case app.Level.SYMMETRY_TYPE.LINE4: {
              return 'animation-illegal-move-line4';
            }
            case app.Level.SYMMETRY_TYPE.POINT1: {
              return 'animation-illegal-move-point1';
            }
            case app.Level.SYMMETRY_TYPE.POINT2: {
              return 'animation-illegal-move-point2';
            }
          }
        })();

        const { cx, cy } = common.level.getAxisCenter();
        elems.main.svg.style.setProperty('--animation-origin-illegal', `${(blockSize * cx) / 2}px ${(blockSize * cy) / 2}px`);
        addAnimationClass(elems.main.svg, className);
        app.sound.playBump();
      }
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
    common.showElem(elems.controller.buttons.base);
    common.hideElem(elems.controller.nextLevel);
    common.hideElem(elems.controller.prevLevel);
    common.hideElem(elems.controller.replay);
    common.hideElem(elems.controller.shareLevel);

    if (completeFlag) {
      common.hideElem(elems.controller.buttons.base);
      if (!editMode && !settings.autoMode && undoInfoForNormal.getReplayStr()) {
        common.showElem(elems.controller.replay);
      }

      if (!common.isShownElem(elems.level.prev) && !common.isShownElem(elems.level.next)) {
        common.showElem(elems.controller.shareLevel);

        {
          const textJaCreated = '"対称パズルのレベルを共有！"\n#対称パズル';
          const textJaShared = '"共有されたレベルをクリア！"\n#対称パズル';
          const textJa = settings.sharedFlag ? textJaShared : textJaCreated;

          const textEnCreated = '"Share a level from Symmetry Puzzle!"\n#SymmetryPuzzle';
          const textEnShared = '"Cleared shared level!"\n#SymmetryPuzzle';
          const textEn = settings.sharedFlag ? textEnShared : textEnCreated;

          const urlBase = 'https://tatt61880.github.io/symmetry-puzzle/?';
          const url = urlBase + location.href.split('?')[1] + (settings.sharedFlag ? '' : '&shared');

          // Twitter
          {
            const base = 'https://twitter.com/intent/tweet';
            const elem = elems.controller.shareLevelX;
            elem.classList.add('translatable-toggle');
            elem.dataset.ja = `${base}?text=${encodeURIComponent(textJa)}%0A${encodeURIComponent(url)}`;
            elem.dataset.en = `${base}?text=${encodeURIComponent(textEn)}%0A${encodeURIComponent(url)}`;
            common.applyLang(elem, app.savedata.getLang());
          }

          // Bluesky
          {
            const base = 'https://bsky.app/intent/compose';
            const elem = elems.controller.shareLevelBluesky;
            elem.classList.add('translatable-toggle');
            elem.dataset.ja = `${base}?text=${encodeURIComponent(textJa)}%0A${encodeURIComponent(url)}`;
            elem.dataset.en = `${base}?text=${encodeURIComponent(textEn)}%0A${encodeURIComponent(url)}`;
            common.applyLang(elem, app.savedata.getLang());
          }
        }
      } else if (!common.isSeqMode) {
        if (common.isShownElem(elems.level.next)) {
          common.showElem(elems.controller.nextLevel);
        }
      } else if (common.isSeqMode) {
        if (common.levelNum > 0) {
          common.showElem(elems.controller.nextLevel);
        } else {
          common.showElem(elems.controller.prevLevel);
        }
      }
    }
  }

  // 描画
  function drawMainSvg(isCompleted = false) {
    if (!completeFlag || editMode || settings.autoMode) stopReplay();
    updateController();

    let highestScorePrev = null;
    if (isCompleted) {
      app.sound.playClear();
      if (!editMode) {
        highestScorePrev = recordCompletion();
      }
    }
    drawBoard(elems.main.svg, common.level, undoInfoForNormal?.getIndex(), {
      isCompleted,
      highestScorePrev,
      showCharsFlag: editMode || settings.debugFlag || temporaryShowCharsFlag,
    });
  }

  function resetLevelHint() {
    levelHintState = 'locked';
    hintWallPressCount = 0;
  }

  function countHintWallPress(dir) {
    if (levelHintState !== 'locked' || editMode || completeFlag || undoFlag || redoFlag) return;
    const hint = common.level.getHint();
    if (!hint?.wallDirs?.includes(Number(dir))) return;

    hintWallPressCount++;
    if (hintWallPressCount === 3) {
      levelHintState = 'available';
      updateLevelHint(hint);
    }
  }

  function updateLevelHint(hint) {
    if (hint && levelHintState === 'locked' && undoInfoForNormal.getIndex() >= hint.afterSteps) {
      levelHintState = 'available';
    }
    const visible = Boolean(hint && levelHintState === 'showing');
    elems.hint.toggle.classList.toggle('hide', !hint || levelHintState === 'locked');
    elems.hint.toggle.setAttribute('aria-pressed', String(visible));
    elems.controller.undo.classList.toggle('hint-undo', Boolean(visible && hint.undo));
    elems.controller.buttons.axis.classList.toggle('hint-axis', visible && hint.dir === 4);
    const message = elems.hint.message;
    message.classList.toggle('hide', !visible);
    if (visible) {
      const { ja, en } = hint;
      if (message.dataset.ja !== ja || message.dataset.en !== en) {
        message.dataset.ja = ja;
        message.dataset.en = en;
        common.applyLang(message, app.savedata.getLang());
      }
    }
    const arrow = elems.hint.arrow;
    const showArrow = visible && hint.x !== undefined;
    arrow.classList.toggle('hide', !showArrow);
    if (!showArrow) return;

    // 矢印の中心を、押し始めるマスとその隣のマスの境界に置きます。
    const x = (hint.x + 0.5 + dxs[hint.dir] / 2 - common.level.getW() / 2) * blockSize;
    const y = (hint.y + 0.5 + dys[hint.dir] / 2 - common.level.getH() / 2) * blockSize;
    arrow.style.left = `calc(50% + ${x}px)`;
    arrow.style.top = `calc(50% + ${y}px)`;
    arrow.style.width = `${blockSize}px`;
    arrow.style.setProperty('--hint-angle', `${(hint.dir - 1) * 90}deg`);
  }

  function drawBoard(svg, level, currentStep, { isCompleted = false, highestScorePrev = null, showCharsFlag = settings.debugFlag } = {}) {
    const edit = editMode ? { normalized: level.isNormalized(), moveAxis, resizeLevel } : null;
    const idleAnimationFlag = !showCharsFlag && !settings.autoMode && !completeFlag;
    if (edit) elems.edit.normalize.classList.toggle('hide', edit.normalized);

    app.BoardRenderer.drawBoard(svg, level, {
      layout: { blockSize, frameSizeW, frameSizeH },
      isSeqMode: common.isSeqMode,
      lang: app.savedata.getLang(),
      symmetryAnimationFlag: isCompleted,
      showCharsFlag,
      smallJumpFlag: !editMode && !undoInfoForNormal.isUndoable() && input.inputDir === app.Input.DIRS.NEUTRAL,
      idleAnimationFlag,
      holdBumpFace: svg === elems.main.svg && idleAnimationFlag && input.inputDir !== app.Input.DIRS.NEUTRAL,
      edit,
      score: {
        currentStep,
        bestStep: common.level.getBestStep(),
        highestScore: !editMode && common.levelId !== null ? app.savedata.getHighestScore(common.level) : undefined,
        highestScorePrev,
        onClearMessageDrawn: scheduleAutoNextLevel,
      },
    });
  }

  function scheduleAutoNextLevel() {
    if (!settings.autoMode || autoPaused || autoSeekPointerId !== null) return;
    clearTimeout(nextLevelTimerId);
    nextLevelTimerId = setTimeout(gotoNextLevel, AUTO_NEXT_LEVEL_DELAY);
  }

  function recordCompletion() {
    const replayStr = undoInfoForNormal.getReplayStr();
    if (replayStr === null) return null;

    const bestStep = common.level.getBestStep();
    // 記録保存
    const highestScorePrev = app.savedata.getHighestScore(common.level);
    if (bestStep !== undefined) {
      app.savedata.saveSteps(common.level, replayStr);
    }

    // シルエットデータ保存
    {
      const shapeStr = common.level.getTargetShapeForSavedata();
      const isNewShape = app.savedata.getShapesObj(common.level)?.[shapeStr] === undefined;
      app.savedata.saveShape(common.level, shapeStr, replayStr);
      if (isNewShape) updateShapeButton(shapeStr);
    }

    // ログ出力
    {
      const levelObj = common.level.getLevelObj();
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

      const completedStep = undoInfoForNormal.getIndex();
      if (r === undefined) {
        consoleWarn('参照用公式記録の情報がありません！');
      } else if (completedStep < bestStep) {
        consoleLog(
          `参照用公式記録を破りました！\n参照用公式記録[${bestStep}] → あなたの記録[${completedStep}] (${completedStep - bestStep} 手)`
        );
      } else {
        if (replayStr === r) {
          consoleLog('参照用公式記録と完全に同じ手順です。');
        } else {
          consoleLog(`参照用公式記録は ${bestStep} 手です。\n(差: ${completedStep - bestStep} 手)`);
        }
      }
    }
    return highestScorePrev;
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
        const encodedSvg = encodeURIComponent(svgData);
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

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
      drawMainSvg();
    } else if (isRemoving && common.level.getState(x, y) !== app.states.none) {
      common.level.applyState(x, y, app.states.none);
      addUndo(null);
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
    app.sound.playButton();

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
    app.sound.playButton();
    common.level.moveAxis(dx, dy);
    addUndo(null);
    draw();
  }

  function addUndo(dir) {
    const undoInfo = editMode ? undoInfoForEdit : undoInfoForNormal;

    const data = createUndoData(dir);

    if (editMode) {
      // 直前の盤面と同じ場合は無視します。
      if (undoInfo.getIndex() < 0 || JSON.stringify(data) !== JSON.stringify(undoInfo.getTopData())) {
        undoInfo.pushData(data);
      }
    } else {
      undoInfo.pushData(data);
    }

    common.level.printDebugInfo();
    updateUndoRedoButton();
  }

  function createUndoData(dir) {
    return {
      dir: editMode ? null : dir,
      ...common.level.getCurrentLevelObj(),
      r: editMode ? null : common.level.getR(),
      checkMode: common.level.getCheckMode(),
    };
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
      urlQuery = common.level.getUrlQuery();
    } else {
      const mode = app.Level.getCheckModeStr(common.level.getCheckMode());
      urlQuery = `mode=${mode}&num=${common.levelNum}`;
    }
    let url = `${base}?${urlQuery}`;
    if (settings.autoMode) url += '&auto';
    if (settings.debugFlag) url += '&debug';
    if (settings.mirrorFlag) url += '&mirror';
    if (settings.sharedFlag) url += '&shared';
    if (settings.rotateNum !== 0) url += `&rotate=${settings.rotateNum}`;
    history.replaceState(null, '', url);
  }

  function autoStepInterval() {
    return REPLAY_STEP_MSEC / Number(elems.auto.speed.value);
  }

  function updateAutoMode(isAutoMode) {
    cancelAutoSearch();
    autoSeekPointerId = null;
    settings.autoMode = isAutoMode;
    elems.controller.widget.inert = isAutoMode;

    if (isAutoMode) {
      releaseGameInput();
      input.disable();
      common.showElem(elems.auto.buttons);
      updateEditMode(false, false);
    } else {
      clearTimeout(nextLevelTimerId);
      clearTimeout(redrawTimerId);
      clearTimeout(autoIntervalId);
      autoPaused = true;
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
    const searching = autoSearchFrameId !== null;
    elems.auto.searchControls.classList.toggle('hide', !searching);
    elems.auto.searchIcon.classList.toggle('hide', !searching);
    elems.auto.seek.classList.toggle('hide', searching);
    elems.auto.buttonStart.classList.toggle('hide', searching || !autoPaused);
    elems.auto.buttonPause.classList.toggle('hide', searching || autoPaused);
  }

  function cancelAutoSearch() {
    if (autoSearchFrameId === null) return;
    cancelAnimationFrame(autoSearchFrameId);
    autoSearchFrameId = null;
    updateAutoStartPauseButtons();
  }

  function onButtonStop() {
    updateAutoMode(false);
    clearTimeout(nextLevelTimerId);
    clearTimeout(redrawTimerId);
    app.sound.playButton();
  }

  function onButtonStart() {
    if (autoSearchFrameId !== null) return;
    app.sound.playButton();
    if (common.level.getBestStep() !== undefined) {
      onButtonStartSub();
      return;
    }

    retryLevel();
    const levelObj = common.level.getCurrentLevelObj();
    const levelTemp = new app.Level({ levelObj, checkMode: common.checkMode });
    const search = app.searchLevel(null, levelTemp, { maxStep: 1000, timeLimit: 10 }, 8);
    autoSearchFrameId = requestAnimationFrame(() => {
      // 短い探索でも、開始前に「探索中」を一度描画します。
      autoSearchFrameId = requestAnimationFrame(findSolution);
    });
    updateAutoStartPauseButtons();

    function findSolution() {
      let next;
      try {
        next = search.next();
      } catch (error) {
        cancelAutoSearch();
        throw error;
      }
      if (!next.done) {
        autoSearchFrameId = requestAnimationFrame(findSolution);
        return;
      }
      cancelAutoSearch();
      const result = next.value;
      if (result.replayStr === null) {
        const dialog = elems.auto.resultDialog;
        for (const elem of dialog.querySelectorAll('[data-reason]')) {
          elem.hidden = elem.dataset.reason !== result.reason;
        }
        releaseGameInput();
        app.sound.playUiOpen();
        dialog.showModal();
        return;
      }
      resetUndo();
      initLevel({ levelObj: { ...levelObj, r: result.replayStr } });
      onButtonStartSub();
    }
  }

  function onButtonStartSub() {
    autoPaused = false;
    updateAutoStartPauseButtons();
    if (common.level.isCompleted()) {
      gotoNextLevel();
    } else if (undoInfoForNormal.getIndex() === 0) {
      scheduleNextAutoStep();
    } else {
      intervalFuncAuto();
    }
  }

  function onButtonPause() {
    app.sound.playButton();
    pauseAuto();
  }

  function pauseAuto() {
    autoPaused = true;
    updateAutoStartPauseButtons();
    clearTimeout(nextLevelTimerId);
    clearTimeout(redrawTimerId);
    clearTimeout(autoIntervalId);
  }

  function seekAuto() {
    clearTimeout(nextLevelTimerId);
    clearTimeout(redrawTimerId);
    releaseGameInput();
    showAutoStep(elems.auto.seek.valueAsNumber);
    // キーボード操作では、1回の入力でシークが完了します。
    if (autoSeekPointerId === null) scheduleNextAutoStep();
  }

  function scheduleNextAutoStep() {
    if (!settings.autoMode || autoPaused) return;
    clearTimeout(autoIntervalId);
    autoIntervalId = setTimeout(intervalFuncAuto, autoStepInterval());
  }

  function showAutoStep(target) {
    const replay = common.level.getR();
    if (!replay) return;

    const snapshot = undoInfoForNormal.seekReplayPrefix(replay, target);
    common.level.applyObj(snapshot, false);
    common.level.applyAxis(snapshot.axis);
    for (let i = undoInfoForNormal.getIndex(); i < target; i++) {
      const dir = Number(replay[i]);
      if (!common.level.move(dxs[dir], dys[dir])) break;
      undoInfoForNormal.pushData(createUndoData(dir));
    }
    // 途中の各手の移動音やアニメーションを再生せず、選んだ盤面を一度だけ描きます。
    common.level.applyObj(undoInfoForNormal.getTopData(), false);
    draw();
  }

  function onButtonEnd() {
    if (autoSearchFrameId !== null) return;
    app.sound.playButton();
    showAutoStep(common.level.getBestStep());
  }

  function toggleReplay() {
    if (replayTimerId !== null) {
      stopReplay();
      return;
    }
    if (window.getComputedStyle(elems.controller.replay).opacity <= 0.5) return;

    const moves = undoInfoForNormal.getReplayStr();
    if (!moves) return;
    const level = common.level.createReplayLevel(undoInfoForNormal.undoArray[0]);
    const svg = elems.main.replaySvg;
    setReplayVisible(true);
    let step = 0;
    drawStep();

    function drawStep() {
      drawBoard(svg, level, step);
      replayTimerId = setTimeout(nextStep, REPLAY_STEP_MSEC);
    }

    function nextStep() {
      if (step === moves.length || !moveLevel(level, moves[step], svg)) {
        stopReplay();
        return;
      }
      step++;
      drawStep();
    }
  }

  function stopReplay() {
    if (replayTimerId === null) return;
    clearTimeout(replayTimerId);
    replayTimerId = null;
    elems.main.replaySvg.replaceChildren();
    setReplayVisible(false);
  }

  function setReplayVisible(visible) {
    if (visible) app.dialog.shapes.finishDiscovery();
    elems.main.svg.classList.toggle('hide', visible);
    elems.main.replaySvg.classList.toggle('hide', !visible);
    elems.controller.replay.firstElementChild.classList.toggle('hide', visible);
    elems.controller.replay.lastElementChild.classList.toggle('hide', !visible);
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
      if (!autoPaused && autoSeekPointerId === null) {
        if (r !== undefined) {
          const stepIndex = undoInfoForNormal.getIndex();
          if (stepIndex < r.length) {
            input.inputDir = Number(r[stepIndex]);
            inputFunc();
          }
        } else {
          autoPaused = true;
          updateAutoStartPauseButtons();
        }
      }
    }

    scheduleNextAutoStep();
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

  async function copyTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      alert('クリップボードへのコピーに失敗しました。');
      return;
    }
    alert('【クリップボードにコピーしました】\n' + text);
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
