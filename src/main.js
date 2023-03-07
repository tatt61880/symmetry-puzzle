(function () {
  'use strict';
  const VERSION_TEXT = 'v2023.03.07';

  const app = window.app;
  Object.freeze(app);

  const savedata = new app.Savedata();

  const DIRS = {
    NEUTRAL: 'N',
    UP: '0',
    RIGHT: '1',
    DOWN: '2',
    LEFT: '3',
  };

  const INPUT_INTERVAL_MSEC = 28; // この値を変更するときは、iOSの省電力モード時のsetIntervalの動作を確認した上で変更してください。詳細: https://github.com/tatt61880/symmetry-puzzle/issues/38

  const MOVE_INTERVAL_COUNT = 6;
  const MOVE_INTERVAL_MSEC = MOVE_INTERVAL_COUNT * INPUT_INTERVAL_MSEC;

  const UNDO_INTERVAL_COUNT = 5;
  const UNDO_INTERVAL_MSEC = UNDO_INTERVAL_COUNT * INPUT_INTERVAL_MSEC;

  let moveIntervalCount = MOVE_INTERVAL_COUNT;
  let pointerInputFlag = false;
  let inputDir = DIRS.NEUTRAL;
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
  let undoIntervalId = null;
  let autoIntervalId = null;

  let completeFlag = false;
  let symmetryFlag = false;

  let drawingState = app.states.none;
  const editboxFunctions = {};

  let blockSize = 0;
  const frameSize = 32;
  const frameBorderWidth = 3;

  let levelsList = null;
  let levelsListEx = null;
  let levelId = null;
  let level = null;
  let checkMode;

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

  const elems = app.elems;

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
    inputDir = dir;
    const transforms = {
      [DIRS.NEUTRAL]: () => 'rotateX(0deg) rotateY(0deg) translate(0, 0)',
      [DIRS.UP]: (dist) =>
        `rotateX(45deg) rotateY(0deg) translate(0, -${dist}px)`,
      [DIRS.RIGHT]: (dist) =>
        `rotateX(0deg) rotateY(45deg) translate(${dist}px, 0)`,
      [DIRS.DOWN]: (dist) =>
        `rotateX(-45deg) rotateY(0deg) translate(0, ${dist}px)`,
      [DIRS.LEFT]: (dist) =>
        `rotateX(0deg) rotateY(-45deg) translate(-${dist}px, 0)`,
    };

    elems.controller.stickThickness.style.setProperty(
      'transform',
      transforms[dir](28)
    );

    elems.controller.stickOuter.style.setProperty(
      'transform',
      transforms[dir](32.1)
    );
    elems.controller.stickOuter2.style.setProperty(
      'transform',
      transforms[dir](33.3)
    );

    elems.controller.stickMiddle.style.setProperty(
      'transform',
      transforms[dir](32.9)
    );
    elems.controller.stickMiddle2.style.setProperty(
      'transform',
      transforms[dir](34.1)
    );

    elems.controller.stickInner.style.setProperty(
      'transform',
      transforms[dir](33.7)
    );
    elems.controller.stickInner2.style.setProperty(
      'transform',
      transforms[dir](34.9)
    );
  }

  function move(dir) {
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
      addUndo(dir);
      level.move();
    }
    return moveFlag;
  }

  function completeCheck() {
    const symmetryFlagPrev = symmetryFlag;
    completeFlag = level.isCompleted();
    symmetryFlag = level.isSymmetry(app.states.isTarget);
    const redrawFlag = completeFlag || symmetryFlag !== symmetryFlagPrev;
    if (redrawFlag) {
      const delay = settings.autoMode
        ? settingsAuto.interval * INPUT_INTERVAL_MSEC
        : MOVE_INTERVAL_MSEC;
      setTimeout(draw, delay, true);
    }

    if (completeFlag) {
      const center = level.getCenter(app.states.isTarget);
      document.documentElement.style.setProperty(
        '--animation-origin',
        `${blockSize * center.x}px ${blockSize * center.y}px`
      );
    }
  }

  function undoStart() {
    if (undoFlag) return;
    undoFlag = true;
    clearTimeout(nextLevelTimerId);
    elems.controller.undo.classList.add('low-contrast');
    updateStick(DIRS.NEUTRAL);
    execUndo();
    undoIntervalId = setInterval(execUndo, UNDO_INTERVAL_MSEC);
  }

  function undoEnd() {
    if (!undoFlag) return;
    undoFlag = false;
    elems.controller.undo.classList.remove('low-contrast');
    clearInterval(undoIntervalId);
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
    if (settings.autoMode) return;
    pointerInputFlag = true;
    pointermove(e);
  }

  function pointermove(e) {
    e.preventDefault();
    if (!pointerInputFlag || settings.autoMode) return;
    const cursorPos = getCursorPos(elems.controller.stickBase, e);
    const bcRect = elems.controller.stickBase.getBoundingClientRect();
    const x = cursorPos.x - bcRect.width / 2;
    const y = cursorPos.y - bcRect.height / 2;
    const minDist = 60;
    if (x ** 2 + y ** 2 < minDist ** 2) {
      const dir = DIRS.NEUTRAL;
      updateStick(dir);
    } else if (Math.abs(x) > Math.abs(y)) {
      const dir = x < 0 ? DIRS.LEFT : DIRS.RIGHT;
      updateStick(dir);
    } else {
      const dir = y < 0 ? DIRS.UP : DIRS.DOWN;
      updateStick(dir);
    }
  }

  function pointerup() {
    undoEnd();
    if (settings.autoMode) return;
    pointerInputFlag = false;
    updateStick(DIRS.NEUTRAL);
  }

  function keydown(e) {
    if (!elems.category.title.classList.contains('hide')) return;
    if (e.altKey) return;

    if (e.shiftKey) {
      switch (e.key) {
        case 'ArrowRight':
          gotoNextLevel();
          break;
        case 'ArrowLeft':
          gotoPrevLevel();
          break;
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
              return DIRS.UP;
            case 'ArrowRight':
            case 'd':
            case 'l':
              return DIRS.RIGHT;
            case 'ArrowDown':
            case 's':
            case 'j':
              return DIRS.DOWN;
            case 'ArrowLeft':
            case 'a':
            case 'h':
              return DIRS.LEFT;
          }
          return null;
        })();

        if (dir !== null) {
          e.preventDefault();
          updateStick(dir);
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
        updateStick(DIRS.NEUTRAL);
      }
    }
    return false;
  }

  function resetLevel() {
    window.getSelection().removeAllRanges();

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

  function initLevel(obj, initParam) {
    level = new app.Level(obj, checkMode, initParam);
    updateSvg();
  }

  function applyObj(obj, { resizeFlag = false }) {
    level.applyObj(obj, resizeFlag);
    updateSvg();
  }

  function updateSvg() {
    const svgMaxWidth = 490;
    const svgMaxHeight = 280;
    blockSize = Math.min(
      (svgMaxWidth - 2 * frameSize) / level.getWidth(),
      (svgMaxHeight - 2 * frameSize) / level.getHeight()
    );
    completeCheck();
    updateUrl();

    elems.main.svg.setAttribute(
      'width',
      blockSize * level.getWidth() + 2 * frameSize
    );
    elems.main.svg.setAttribute(
      'height',
      blockSize * level.getHeight() + 2 * frameSize
    );
    draw();
  }

  function execUndo() {
    window.getSelection().removeAllRanges();

    if (undoInfo.isUndoable()) {
      const data = undoInfo.undo();
      const resizeFlag = level.getW() !== data.w || level.getH() !== data.h;
      applyObj(data, { resizeFlag });
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
    window.getSelection().removeAllRanges();

    clearTimeout(nextLevelTimerId);
    const id = Number(id_);
    levelId = id;
    let levelObj;
    if (levelsList[levelId] !== undefined) {
      levelObj = levelsList[levelId];
    } else if (levelsListEx[levelId] !== undefined) {
      levelObj = levelsListEx[levelId];
    }
    consoleLog(
      `[LEVEL ${id}]${
        levelObj?.subject !== undefined ? ` ${levelObj.subject}` : ''
      }`
    );

    loadLevelObj(levelObj !== undefined ? levelObj : createObjById(levelId));
    updateLevelVisibility();
    elems.level.id.textContent = levelId;
    replaceUrl();
  }

  function loadLevelObj(levelObj, param = {}) {
    const initParam = {};
    if (!param.reset) {
      initParam.mirrorFlag = settings.mirrorFlag;
      initParam.rotateNum = settings.rotateNum;
    }

    resetUndo();
    initLevel(levelObj, initParam);

    updateStick(DIRS.NEUTRAL);
    moveIntervalCount = MOVE_INTERVAL_COUNT;

    if (settings.autoMode) {
      updateAutoMode(true);
    }
  }

  function showLevelPrev() {
    if (levelId === null) return false;
    if (levelId === 0) return false;
    if (levelId === 1) return false;
    if (levelsList[levelId] !== undefined)
      return levelsList[levelId - 1] !== undefined;
    if (isNaN(levelId)) return false;
    if (levelsListEx[levelId] !== undefined)
      return levelsListEx[levelId - 1] !== undefined;
    return (
      levelsList[levelId - 1] === undefined &&
      levelsListEx[levelId - 1] === undefined
    );
  }

  function showLevelNext() {
    if (levelId === null) return false;
    if (levelId === -1) return false;
    if (levelId === 0) return false;
    if (levelsList[levelId] !== undefined)
      return levelsList[levelId + 1] !== undefined;
    if (isNaN(levelId)) return false;
    if (levelsListEx[levelId] !== undefined)
      return levelsListEx[levelId + 1] !== undefined;
    return (
      levelsList[levelId + 1] === undefined &&
      levelsListEx[levelId + 1] === undefined
    );
  }

  function updateLevelVisibility() {
    (showLevelPrev() ? showElem : hideElem)(elems.level.prev);
    (showLevelNext() ? showElem : hideElem)(elems.level.next);
    (levelId !== null ? showElem : hideElem)(elems.level.id);
    (levelId !== null ? showElem : hideElem)(elems.levels.button);
    (levelId === null ? showElem : hideElem)(elems.level.edit);
  }

  function gotoPrevLevel() {
    if (!showLevelPrev()) return;
    loadLevelById(levelId - 1);
  }

  function gotoNextLevel() {
    if (!showLevelNext()) return;
    loadLevelById(levelId + 1);
  }

  function updateUrl() {
    if (!editMode) return;
    const url = level.getUrlStr(level.isReflectionMode());
    elems.url.innerHTML = `<a href="${url}">現在の盤面を0手目として完成！</a>`;
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

  function showRecordsDialog() {
    const table = document.createElement('table');

    {
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');

      elems.records.tableDiv.innerHTML = '';
      elems.records.tableDiv
        .appendChild(table)
        .appendChild(thead)
        .appendChild(tr);

      const imgSize = '50';
      {
        const th = document.createElement('th');
        tr.appendChild(th);
      }
      {
        const th = document.createElement('th');
        tr.appendChild(th);
        const img = document.createElement('img');
        img.src = './images/point.png';
        img.setAttribute('width', imgSize);
        img.setAttribute('height', imgSize);
        th.appendChild(img);
      }
      {
        const th = document.createElement('th');
        tr.appendChild(th);
        const img = document.createElement('img');
        img.src = './images/reflection.png';
        img.setAttribute('width', imgSize);
        img.setAttribute('height', imgSize);
        th.appendChild(img);
      }
      {
        const th = document.createElement('th');
        tr.appendChild(th);
        th.innerText = 'Total';
      }
    }

    {
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);
      const size = 30;

      let numPointNotSolved = 0;
      let numPointSolvedNormal = 0;
      let numPointSolvedBest = 0;

      {
        const levelsList = app.levelsPoint;
        const levelsListEx = app.levelsPointEx;
        const levelObjs = [];
        for (let i = 1; i < levelsList.length; ++i) {
          const levelObj = levelsList[i];
          levelObjs.push(levelObj);
        }

        for (const id of Object.keys(levelsListEx)) {
          if (String(id) === 'NaN') continue;
          const levelObj = levelsListEx[id];
          levelObjs.push(levelObj);
        }
        for (let i = 0; i < levelObjs.length; ++i) {
          const levelObj = levelObjs[i];
          const playerScore = savedata.getHighestScore(levelObj, false);
          const appScore = levelObj.step;
          if (playerScore === null) {
            ++numPointNotSolved;
          } else if (playerScore > appScore) {
            ++numPointSolvedNormal;
          } else {
            ++numPointSolvedBest;
          }
        }
      }

      let numReflectionNotSolved = 0;
      let numReflectionSolvedNormal = 0;
      let numReflectionSolvedBest = 0;

      {
        const levelsList = app.levelsReflection;
        const levelsListEx = app.levelsReflectionEx;
        const levelObjs = [];
        for (let i = 1; i < levelsList.length; ++i) {
          const levelObj = levelsList[i];
          levelObjs.push(levelObj);
        }

        for (const id of Object.keys(levelsListEx)) {
          if (String(id) === 'NaN') continue;
          const levelObj = levelsListEx[id];
          levelObjs.push(levelObj);
        }
        for (let i = 0; i < levelObjs.length; ++i) {
          const levelObj = levelObjs[i];
          const playerScore = savedata.getHighestScore(levelObj, true);
          const appScore = levelObj.step;
          if (playerScore === null) {
            ++numReflectionNotSolved;
          } else if (playerScore > appScore) {
            ++numReflectionSolvedNormal;
          } else {
            ++numReflectionSolvedBest;
          }
        }
      }

      const numTotalNotSolved = numPointNotSolved + numReflectionNotSolved;
      const numTotalSolvedNormal =
        numPointSolvedNormal + numReflectionSolvedNormal;
      const numTotalSolvedBest = numPointSolvedBest + numReflectionSolvedBest;

      const numPointTotal =
        numPointSolvedBest + numPointSolvedNormal + numPointNotSolved;

      const numReflectionTotal =
        numReflectionSolvedBest +
        numReflectionSolvedNormal +
        numReflectionNotSolved;

      const numTotalTotal = numPointTotal + numReflectionTotal;

      {
        const tr = document.createElement('tr');
        tbody.appendChild(tr);

        {
          const th = document.createElement('th');
          const svg = app.svg.createSvg();
          svg.setAttribute('width', size);
          svg.setAttribute('height', size);
          const color = getStepColor(1, 1);
          const crown = app.svg.createCrown(size, { x: 0, y: 0, fill: color });
          tr.appendChild(th);
          th.appendChild(svg);
          svg.appendChild(crown);
        }
        {
          const td = document.createElement('td');
          td.innerText = numPointSolvedBest;
          tr.appendChild(td);
        }
        {
          const td = document.createElement('td');
          td.innerText = numReflectionSolvedBest;
          tr.appendChild(td);
        }
        {
          const td = document.createElement('td');
          td.innerText = numTotalSolvedBest;
          tr.appendChild(td);
        }
      }
      {
        const tr = document.createElement('tr');
        tbody.appendChild(tr);
        {
          const th = document.createElement('th');
          const svg = app.svg.createSvg();
          svg.setAttribute('width', size);
          svg.setAttribute('height', size);
          const color = getStepColor(1, 0);
          const crown = app.svg.createCrown(size, { x: 0, y: 0, fill: color });
          tr.appendChild(th);
          th.appendChild(svg);
          svg.appendChild(crown);
        }
        {
          const td = document.createElement('td');
          td.innerText = numPointSolvedNormal;
          tr.appendChild(td);
        }
        {
          const td = document.createElement('td');
          td.innerText = numReflectionSolvedNormal;
          tr.appendChild(td);
        }
        {
          const td = document.createElement('td');
          td.innerText = numTotalSolvedNormal;
          tr.appendChild(td);
        }
      }
      {
        const tr = document.createElement('tr');
        tbody.appendChild(tr);
        {
          const th = document.createElement('th');
          tr.appendChild(th);
          th.innerText = 'Not solved';
        }
        {
          const td = document.createElement('td');
          td.innerText = numPointNotSolved;
          tr.appendChild(td);
        }
        {
          const td = document.createElement('td');
          td.innerText = numReflectionNotSolved;
          tr.appendChild(td);
        }
        {
          const td = document.createElement('td');
          td.innerText = numTotalNotSolved;
          tr.appendChild(td);
        }
      }
      {
        const tr = document.createElement('tr');
        tbody.appendChild(tr);
        {
          const th = document.createElement('th');
          tr.appendChild(th);
          th.innerText = 'Total';
        }
        {
          const td = document.createElement('td');
          td.innerText = numPointTotal;
          tr.appendChild(td);
        }
        {
          const td = document.createElement('td');
          td.innerText = numReflectionTotal;
          tr.appendChild(td);
        }
        {
          const td = document.createElement('td');
          td.innerText = numTotalTotal;
          tr.appendChild(td);
        }
      }
    }

    elems.records.dialog.showModal();
  }

  function closeRecordsDialog() {
    elems.records.dialog.close();
  }

  function updateCheckMode(mode) {
    checkMode = mode;
    const className = (() => {
      if (mode === app.Level.CHECK_MODE.POINT) {
        return 'point';
      } else if (mode === app.Level.CHECK_MODE.REFLECTION) {
        return 'reflection';
      }
      return 'none';
    })();

    for (const elem of document.getElementsByClassName('check-mode')) {
      elem.classList.add('hide-mode');
    }
    for (const elem of document.getElementsByClassName(
      `check-mode ${className}`
    )) {
      elem.classList.remove('hide-mode');
    }
    animateIcon();
  }

  function applyLang(lang) {
    window.getSelection().removeAllRanges();

    animateIcon();
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
  }

  function animateIcon() {
    elems.icon.classList.remove('animation-rotation-icon');
    setTimeout(() => {
      elems.icon.classList.add('animation-rotation-icon');
    }, 100);
    elems.iconPoint.classList.remove('animation-rotation-icon');
    setTimeout(() => {
      elems.iconPoint.classList.add('animation-rotation-icon');
    }, 100);
    elems.iconReflection.classList.remove('animation-reflection1-icon');
    setTimeout(() => {
      elems.iconReflection.classList.add('animation-reflection1-icon');
    }, 100);
  }

  function selectLang(lang) {
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
    window.getSelection().removeAllRanges();

    // const hideCompletedLevelsFlag = elems.levels.hideCompletedLevels.checked;
    const hideShortestLevelsFlag = elems.levels.hideShortestLevels.checked;

    elems.levels.dialogSvg.innerHTML = '';
    const HEIGHT = 90;
    const WIDTH = 90;
    const COLS = 5;

    let count = 0;
    for (let id = 1; id < levelsList.length; ++id) {
      const levelObj = levelsList[id];
      appendLevel(levelObj, id);
    }
    for (const id of Object.keys(levelsListEx).sort()) {
      if (String(id) === 'NaN') continue;
      const levelObj = levelsListEx[id];
      appendLevel(levelObj, id);
    }

    elems.levels.dialogSvg.style.setProperty(
      'height',
      `${HEIGHT * Math.ceil(count / COLS)}px`
    );

    function appendLevel(levelObj, id) {
      const level = new app.Level(levelObj, checkMode, {});
      const bestStep = level.getBestStep();
      const highestScore = savedata.getHighestScore(
        levelObj,
        level.isReflectionMode()
      );

      // if (highestScore !== null && hideCompletedLevelsFlag) {
      //   return;
      // }

      if (
        highestScore !== null &&
        hideShortestLevelsFlag &&
        highestScore <= bestStep
      ) {
        return;
      }

      count++;

      const g = app.svg.createG();
      g.classList.add('level-select');
      elems.levels.dialogSvg.appendChild(g);

      {
        {
          if (highestScore !== null) {
            const color = getStepColor(highestScore, bestStep);
            const crown = app.svg.createCrown(20, { x: 0, y: 1, fill: color });
            g.appendChild(crown);
          }
        }
        {
          const text = app.svg.createText(5, {
            x: 10.5,
            y: 2,
            text: id,
            fill: 'black',
          });
          g.appendChild(text);
          g.setAttribute('transform', `translate(20,20)`);
        }
        {
          const blockSize = Math.min(
            (WIDTH - 25) / level.getWidth(),
            (HEIGHT - 25) / level.getHeight()
          );
          const levelSvgG = level.createSvgG(blockSize);
          levelSvgG.setAttribute('transform', `translate(20,20)`);
          g.appendChild(levelSvgG);
        }
      }
      const x = ((count - 1) % COLS) * WIDTH;
      const y = Math.floor((count - 1) / COLS) * HEIGHT;
      g.setAttribute('transform', `translate(${x},${y})`);
      g.setAttribute('data-id', id);
      g.addEventListener(
        'click',
        function () {
          const id = Number(g.getAttribute('data-id'));
          loadLevelById(id);
          closeLevelsDialog();
        },
        false
      );
    }
  }

  function closeLevelsDialog() {
    elems.levels.dialog.close();
  }

  function onloadApp() {
    elems.init();
    elems.version.textContent = VERSION_TEXT;

    initElems();
    updateEditLevel();

    window.onresize = resizeWindow;
    resizeWindow();

    let lang = savedata.loadLang();
    if (lang === undefined) {
      lang = 'en';
      savedata.saveLang(lang);
      showHelpDialog();
    }
    applyLang(lang);

    const queryParams = app.analyzeUrl();
    settings = queryParams.settings;

    setInterval(intervalFunc, INPUT_INTERVAL_MSEC);

    const id = queryParams.id;

    if (id === null && queryParams.levelObj.s === '') {
      onloadTitle();
      return;
    }

    if (settings.r) {
      updateCheckMode(app.Level.CHECK_MODE.REFLECTION);
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
    if (checkMode === app.Level.CHECK_MODE.POINT) {
      levelsList = app.levelsPoint;
      levelsListEx = app.levelsPointEx;
    } else if (checkMode === app.Level.CHECK_MODE.REFLECTION) {
      levelsList = app.levelsReflection;
      levelsListEx = app.levelsReflectionEx;
    } else {
      levelsList = null;
      levelsListEx = null;
    }
    for (let id = 0; id < levelsList.length; ++id) {
      const levelObj = levelsList[id];
      if (
        levelObj.w === queryObj.w &&
        levelObj.h === queryObj.h &&
        levelObj.s === queryObj.s
      ) {
        return id;
      }
    }
    for (const id of Object.keys(levelsListEx).sort()) {
      if (String(id) === 'NaN') continue;
      const levelObj = levelsListEx[id];
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

  function onloadTitle() {
    window.getSelection().removeAllRanges();

    updateCheckMode(null);
    showElem(elems.category.title);
    hideElem(elems.category.game);
    updateAutoMode(false);
    replaceUrlTitle();
  }

  function onloadId(id_) {
    window.getSelection().removeAllRanges();

    if (editMode) {
      toggleEditLevel();
    }
    if (checkMode === app.Level.CHECK_MODE.POINT) {
      levelsList = app.levelsPoint;
      levelsListEx = app.levelsPointEx;
    } else if (checkMode === app.Level.CHECK_MODE.REFLECTION) {
      levelsList = app.levelsReflection;
      levelsListEx = app.levelsReflectionEx;
    } else {
      levelsList = null;
      levelsListEx = null;
    }
    hideElem(elems.category.title);
    showElem(elems.category.game);
    showElem(elems.main.div);
    showElem(elems.level.widget);
    showElem(elems.svgDiv);
    showElem(elems.controller.widget);

    let id = id_;
    if (id === null) id = 1;
    loadLevelById(id);
  }

  function onloadObj(obj) {
    window.getSelection().removeAllRanges();

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
      elems.auto.buttonEnd.addEventListener('click', onButtonEnd);
      elems.auto.buttonSpeedDown.addEventListener('click', onButtonSpeedDown);
      elems.auto.buttonSpeedUp.addEventListener('click', onButtonSpeedUp);
    }

    // Editモード用
    {
      for (const char in app.states.charToState) {
        const elem = document.getElementById(`edit_${char}`);
        if (elem === null) continue;

        {
          const levelForEditChar = new app.Level(
            { w: 1, h: 1, s: char },
            app.Level.CHECK_MODE.POINT,
            {}
          );
          const blockSize = 32;
          const state = app.states.charToState[char];
          const block = levelForEditChar.createOneBlock(
            1,
            1,
            blockSize,
            null,
            true,
            app.states.isUser(state) || app.states.isOther(state)
          );
          block.setAttribute(
            'transform',
            `translate(${-blockSize},${-blockSize})`
          );
          elem.appendChild(block);

          const func = () => {
            elems.edit.editShape.innerHTML = '';
            elems.edit.editShape.appendChild(block.cloneNode(true));
            drawingState = state;
          };
          editboxFunctions[char] = func;
          elem.addEventListener('click', func, false);
        }
      }
      editboxFunctions[app.states.stateToChar[app.states.none]]();

      elems.edit.wDec.addEventListener('click', () => resize(-1, 0), false);
      elems.edit.wInc.addEventListener('click', () => resize(1, 0), false);
      elems.edit.hDec.addEventListener('click', () => resize(0, -1), false);
      elems.edit.hInc.addEventListener('click', () => resize(0, 1), false);
      elems.edit.normalize.addEventListener(
        'click',
        () => {
          if (!level.isNormalized()) {
            addUndo(null);
            level.normalize();
            updateUrl();
            draw();
          }
        },
        false
      );
      elems.edit.mirror.addEventListener(
        'click',
        () => {
          addUndo(null);
          level.mirror();
          updateUrl();
          draw();
        },
        false
      );
      elems.edit.rotate.addEventListener(
        'click',
        () => {
          addUndo(null);
          level.rotate();
          updateUrl();
          draw();
          updateSvg();
        },
        false
      );
      elems.edit.switchMode.addEventListener(
        'click',
        () => {
          if (level.isReflectionMode()) {
            updateCheckMode(app.Level.CHECK_MODE.POINT);
          } else {
            updateCheckMode(app.Level.CHECK_MODE.REFLECTION);
          }
          const w = level.getW();
          const h = level.getH();
          const s = level.getStateStr();
          level = new app.Level({ w, h, s }, checkMode, {});
          completeCheck();
          updateUrl();
          draw();
        },
        false
      );
    }

    // ヘルプ画面用
    {
      elems.help.button.addEventListener('click', showHelpDialog, false);
      elems.help.dialog.addEventListener('click', closeHelpDialog, false);
      elems.help.close.addEventListener('click', closeHelpDialog, false);
      elems.help.dialogDiv.addEventListener(
        'click',
        (e) => e.stopPropagation(),
        false
      );
      elems.help.langEn.addEventListener(
        'click',
        () => selectLang('en'),
        false
      );
      elems.help.langJa.addEventListener(
        'click',
        () => selectLang('ja'),
        false
      );
    }

    // タイトル画面用
    {
      elems.title.buttonPlayPoint.addEventListener(
        'click',
        () => {
          updateCheckMode(app.Level.CHECK_MODE.POINT);
          onloadId(1);
        },
        false
      );

      elems.title.buttonPlayReflection.addEventListener(
        'click',
        () => {
          updateCheckMode(app.Level.CHECK_MODE.REFLECTION);
          onloadId(1);
        },
        false
      );

      // elems.title.buttonEdit.addEventListener('click', () => onloadObj({ w: 6, h: 5, s: '' }), false);
    }

    // 記録画面用
    {
      elems.records.button.addEventListener('click', showRecordsDialog, false);
      elems.records.dialog.addEventListener('click', closeRecordsDialog, false);
      elems.records.close.addEventListener('click', closeRecordsDialog, false);
      elems.records.dialogDiv.addEventListener(
        'click',
        (e) => e.stopPropagation(),
        false
      );
    }

    // レベル操作用
    {
      elems.level.reset.addEventListener('click', resetLevel, false);
      elems.level.prev.addEventListener('click', gotoPrevLevel, false);
      elems.level.next.addEventListener('click', gotoNextLevel, false);
      elems.level.edit.addEventListener('click', toggleEditLevel, false);
      elems.levels.button.addEventListener('click', showLevelsDialog, false);
      elems.levels.dialog.addEventListener('click', closeLevelsDialog, false);
      elems.levels.dialogDiv.addEventListener(
        'click',
        (e) => e.stopPropagation(),
        false
      );
      // elems.levels.hideCompletedLevels.addEventListener(
      //   'click',
      //   toggleHideCompletedLevels,
      //   false
      // );
      elems.levels.hideShortestLevels.addEventListener(
        'click',
        toggleHideCompletedLevels,
        false
      );
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

      elems.main.svg.addEventListener(pointerdownEventName, pointerDown, false);
      elems.main.svg.addEventListener(pointermoveEventName, pointerMove, false);
      elems.main.svg.addEventListener(pointerupEventName, pointerUp, false);
      elems.main.svg.oncontextmenu = function () {
        return !editMode;
      };

      elems.controller.stickBase.addEventListener(
        pointerdownEventName,
        pointerdown,
        false
      );
      elems.controller.stickBase.addEventListener(
        pointermoveEventName,
        pointermove,
        false
      );
      elems.controller.stickBase.addEventListener(
        pointerupEventName,
        pointerup,
        false
      );
      document.addEventListener(pointerupEventName, pointerup, false);

      elems.controller.undo.addEventListener(
        pointerdownEventName,
        undodown,
        false
      );

      elems.controller.nextLevel.addEventListener(
        'click',
        gotoNextLevel,
        false
      );
    }
  }

  function intervalFunc() {
    if (level === null) return;
    if (settings.autoMode) return;

    if (moveIntervalCount >= MOVE_INTERVAL_COUNT) {
      input();
    } else {
      moveIntervalCount++;
    }
  }

  function input() {
    if (undoFlag) return;
    if (completeFlag) return;

    if (inputDir !== DIRS.NEUTRAL) {
      if (settings.autoMode) {
        updateStick(inputDir);
      }
      moveIntervalCount = 0;
      const moveFlag = move(inputDir);
      if (moveFlag) {
        draw();
        completeCheck();
        updateUrl();
      }
    }
  }

  function updateController() {
    if (settings.autoMode && settingsAuto.paused) {
      hideElem(elems.controller.stickBase);
    } else {
      if (completeFlag) {
        hideElem(elems.controller.stickBase);
        if (!elems.level.next.classList.contains('hide')) {
          showElem(elems.controller.nextLevel);
        }
      } else {
        showElem(elems.controller.stickBase);
        hideElem(elems.controller.nextLevel);
      }
    }
  }

  // 描画
  function draw(completeCheckFlag = false) {
    elems.main.svg.textContent = '';
    updateController();

    const mainSvgG = app.svg.createG();
    mainSvgG.style.setProperty('pointer-events', 'none');
    elems.main.svg.appendChild(mainSvgG);

    {
      const symmetryType = (() => {
        if (completeCheckFlag && completeFlag) {
          return level.getSymmetryType(app.states.isTarget);
        }
        return null;
      })();

      const showCharsFlag =
        editMode || settings.debugFlag || temporaryShowCharsFlag;
      const levelSvgG = level.createSvgG(
        blockSize,
        symmetryType,
        showCharsFlag
      );
      levelSvgG.setAttribute(
        'transform',
        `translate(${frameSize},${frameSize})`
      );

      mainSvgG.appendChild(levelSvgG);
    }
    level.resetMoveFlags();

    // 点線
    if (levelId !== 0) {
      const dasharray = '1, 4';
      const g = app.svg.createG();
      mainSvgG.appendChild(g);
      // 横線
      for (let y = 1; y < level.getHeight(); ++y) {
        const line = app.svg.createLine(blockSize, {
          x1: 0,
          y1: y,
          x2: level.getWidth(),
          y2: y,
          stroke: app.colors.line,
        });
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      // 縦線
      for (let x = 1; x < level.getWidth(); ++x) {
        const line = app.svg.createLine(blockSize, {
          x1: x,
          y1: 0,
          x2: x,
          y2: level.getHeight(),
          stroke: app.colors.line,
        });
        line.setAttribute('stroke-dasharray', dasharray);
        g.appendChild(line);
      }
      g.setAttribute('transform', `translate(${frameSize},${frameSize})`);
    }
    drawFrame(mainSvgG);
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

    if (editMode && !level.isNormalized()) {
      const fontSize = `${frameSize * 0.7}px`;
      const text = app.svg.createText(frameSize, {
        x: 0,
        y: 0,
        text: 'Not normalized',
        fill: '#aa33aa',
      });
      const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
      const height = frameBorderWidth;
      text.setAttribute('font-size', fontSize);
      text.setAttribute('transform', `translate(${width},${height})`);
      g.appendChild(text);
    }

    if (!editMode) {
      const fontSize = `${frameSize * 0.7}px`;
      const fontSize2 = `${blockSize * 0.7}px`;
      const bestStep = level.getBestStep();

      let highestScorePrev = null;

      // クリア時のメッセージ
      if (completeFlag) {
        const text = app.svg.createText(blockSize, {
          x: 0,
          y: 0.05,
          text: 'Congratulations!',
          fill: 'white',
        });
        const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
        const height = (level.getHeight() - 1) * blockSize + frameSize;
        text.setAttribute('font-size', fontSize2);
        text.setAttribute('transform', `translate(${width},${height})`);
        g.appendChild(text);
        {
          const levelObj = level.getLevelObj();
          const replayStr = undoInfo.getReplayStr();

          // 記録保存
          if (bestStep !== undefined) {
            highestScorePrev = savedata.getHighestScore(
              levelObj,
              level.isReflectionMode()
            );
            savedata.saveSteps(levelObj, level.isReflectionMode(), replayStr);
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
            if (levelId === null) {
              copyTextToClipboard(levelObjStr);
            }
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
            y: 0.05,
            text: 'Not connected.',
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
          ? getStepColor(currentStep, bestStep)
          : 'black';
        const text = app.svg.createText(frameSize, {
          x: 0,
          y: 0,
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
      if (levelId !== null) {
        const levelObj = level.getLevelObj();
        const highestScore = savedata.getHighestScore(
          levelObj,
          level.isReflectionMode()
        );
        if (highestScore !== null) {
          const color = getStepColor(highestScore, bestStep);

          const text = app.svg.createText(frameSize, {
            x: 0,
            y: 0,
            text: `Your best: ${highestScore} steps`,
            fill: color,
          });
          const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
          const height = frameBorderWidth / 2;
          text.setAttribute('font-size', fontSize);
          text.setAttribute('transform', `translate(${width},${height})`);
          g.appendChild(text);

          const crown = app.svg.createCrown(frameSize, {
            x: frameBorderWidth / frameSize,
            y: frameBorderWidth / frameSize / 2,
            fill: color,
          });
          g.appendChild(crown);
        }

        // 記録更新？
        if (
          highestScore !== null &&
          highestScorePrev !== null &&
          highestScore < highestScorePrev
        ) {
          const text = app.svg.createText(blockSize, {
            x: 0,
            y: -0.05,
            text: 'New record!',
            fill: 'white',
          });
          const width = (level.getWidth() * blockSize + 2 * frameSize) / 2;
          const height = frameSize;
          text.setAttribute('font-size', fontSize2);
          text.setAttribute('transform', `translate(${width},${height})`);
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

  function secretSequenceAdd(c) {
    secretSequence += c;

    let resetFlag = true;
    if (secretSequence === '1234') {
      toggleEditLevel();
    } else if (secretSequence === '1414') {
      updateAutoMode(true);
    } else if (secretSequence === '4343') {
      showElem(elems.console.widget);
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

          canvas.setAttribute('width', width - 2 * blockSize);
          canvas.setAttribute('height', height - 2 * blockSize);

          const context = canvas.getContext('2d');
          context.drawImage(
            image,
            blockSize,
            blockSize,
            width - 2 * blockSize,
            height - 2 * blockSize,
            0,
            0,
            width - 2 * blockSize,
            height - 2 * blockSize
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
      hideElem(elems.console.widget);
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
      addUndo(null);
      level.applyState(x, y, drawingState);
      completeCheck();
      updateUrl();
      draw();
    } else if (isRemoving && level.getState(x, y) !== app.states.none) {
      addUndo(null);
      level.applyState(x, y, app.states.none);
      completeCheck();
      updateUrl();
      draw();
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
    applyObj(obj, { resizeFlag: true });
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
    if (!elems.category.title.classList.contains('hide')) {
      replaceUrlTitle();
      return;
    }
    const base = location.href.split('?')[0];
    const levelObj = level.getLevelObj();
    let url = `${base}?w=${levelObj.w}&h=${levelObj.h}&s=${levelObj.s}`;
    if (level.isReflectionMode()) url += '&r';
    if (settings.autoMode) url += '&auto';
    if (settings.debugFlag) url += '&debug';
    if (settings.mirrorFlag) url += '&mirror';
    if (settings.rotateNum !== 0) url += `&rotate=${settings.rotateNum}`;
    history.replaceState(null, '', url);
  }

  function updateButtonSpeedDisplay() {
    (settingsAuto.interval === settingsAuto.INTERVAL_MAX ? hideElem : showElem)(
      elems.auto.buttonSpeedDown
    );
    (settingsAuto.interval === 1 ? hideElem : showElem)(
      elems.auto.buttonSpeedUp
    );
  }

  function updateAutoMode(isOn) {
    if (isOn) {
      settings.autoMode = true;
      showElem(elems.auto.buttons);
    } else {
      clearTimeout(nextLevelTimerId);
      settings.autoMode = false;
      settingsAuto.paused = true;
      hideElem(elems.auto.buttons);

      updateStick(DIRS.NEUTRAL);
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
    if (level.getBestStep() === undefined) {
      const w = level.getW();
      const h = level.getH();
      const s = level.getStateStr();
      const levelObj = { w, h, s };
      // TODO low-contrastを盤面に反映させてから計算する。Promiseを使うといけそう。
      // elems.auto.buttonStart.classList.add('low-contrast');
      const levelTemp = new app.Level(levelObj, checkMode, {});
      const maxStep = 1000; // 探索ステップ数上限値は大きな値にしておきます。時間制限もあるので、この制限にかかることはほぼないはずです。
      const timeLimit = 10;
      const result = app.solveLevel(null, levelTemp, { maxStep, timeLimit });
      // elems.auto.buttonStart.classList.remove('low-contrast');
      if (result.replayStr === null) {
        window.alert(result.errorMessage);
        return;
      } else {
        resetUndo();
        const newLevelObj = { ...levelObj, ...{ r: result.replayStr } };
        initLevel(newLevelObj, {});
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
      move(dir);
    }
    completeCheck();
  }

  function intervalFuncAuto() {
    const r = level.getLevelObj()?.r;
    if (!editMode && settings.autoMode && r !== undefined) {
      const stepIndex = undoInfo.getIndex();
      if (!settingsAuto.paused) {
        if (stepIndex < r.length) {
          inputDir = Number(r[stepIndex]);
          input();
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

  function resizeWindow() {
    const WIDTH = 500;
    const HEIGHT = 688;
    if (window.innerHeight * WIDTH >= window.innerWidth * HEIGHT) {
      elems.viewport.setAttribute('content', 'width=500');
    } else {
      const width = (HEIGHT * window.innerWidth) / window.innerHeight;
      elems.viewport.setAttribute('content', `width=${width}`);
    }
  }
})();
