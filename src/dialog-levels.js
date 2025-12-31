(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);
  console.assert(app?.common !== undefined);

  window.app = window.app || {};
  window.app.dialog = window.app.dialog || {};
  window.app.dialog.levels = {
    show,
    update,
    prevPage,
    nextPage,
    selectUp,
    selectRight,
    selectDown,
    selectLeft,
    selectEnter,
    close,
  };

  const elems = app.elems;

  const levelSelectId = 'level-select-id';

  const LEVEL_SELECT_NUM_PER_PAGE = 10;
  const LEVEL_SELECT_HEIGHT = 125;
  const LEVEL_SELECT_WIDTH = 90;
  const LEVEL_SELECT_COLS = 5;

  function show() {
    updateLevelsDialog();
    window.sound.playUiOpen();
    elems.levels.dialog.showModal();
  }

  function update() {
    window.sound.playButton();
    const page = Number(elems.levels.dialog.dataset.page);
    updateLevelsDialog(page);
  }

  function prevPage() {
    if (app.common.isShownElem(elems.levels.prev)) {
      window.sound.playButton();
      elems.levels.dialog.dataset.selectCount = Number(elems.levels.dialog.dataset.selectCount) - LEVEL_SELECT_NUM_PER_PAGE;
      const page = Number(elems.levels.dialog.dataset.page) - 1;
      updateLevelsDialog(page);
    }
  }

  function nextPage() {
    if (app.common.isShownElem(elems.levels.next)) {
      window.sound.playButton();
      elems.levels.dialog.dataset.selectCount = Number(elems.levels.dialog.dataset.selectCount) + LEVEL_SELECT_NUM_PER_PAGE;
      const page = Number(elems.levels.dialog.dataset.page) + 1;
      updateLevelsDialog(page);
    }
  }

  function levelSelectUpdate(selectCount) {
    if (app.common.isTouchDevice()) {
      return;
    }
    const currentPage = Number(elems.levels.dialog.dataset.page);
    const page = Math.floor(selectCount / LEVEL_SELECT_NUM_PER_PAGE);
    if (page !== currentPage) {
      updateLevelsDialog(page);
    }

    elems.levels.dialog.dataset.selectCount = selectCount;
    const g = document.getElementById(levelSelectId);
    const x = (selectCount % LEVEL_SELECT_COLS) * LEVEL_SELECT_WIDTH;
    const y = Math.floor((selectCount % LEVEL_SELECT_NUM_PER_PAGE) / LEVEL_SELECT_COLS) * LEVEL_SELECT_HEIGHT;
    g.setAttribute('transform', `translate(${x},${y})`);
  }

  function selectUp() {
    const selectCount = Number(elems.levels.dialog.dataset.selectCount) - LEVEL_SELECT_COLS;
    if (selectCount >= 0) {
      levelSelectUpdate(selectCount);
    }
  }

  function selectRight() {
    const selectCount = Number(elems.levels.dialog.dataset.selectCount) + 1;
    const maxCount = Number(elems.levels.dialog.dataset.maxCount);
    if (maxCount === -1 || selectCount <= maxCount) {
      levelSelectUpdate(selectCount);
    }
  }

  function selectDown() {
    const selectCount = Number(elems.levels.dialog.dataset.selectCount) + LEVEL_SELECT_COLS;
    const maxCount = Number(elems.levels.dialog.dataset.maxCount);
    if (maxCount === -1 || selectCount <= maxCount) {
      levelSelectUpdate(selectCount);
    }
  }

  function selectLeft() {
    const selectCount = Number(elems.levels.dialog.dataset.selectCount) - 1;
    if (selectCount >= 0) {
      levelSelectUpdate(selectCount);
    }
  }

  function selectEnter() {
    const selectCount = Number(elems.levels.dialog.dataset.selectCount);
    const maxCount = Number(elems.levels.dialog.dataset.maxCount);
    if (maxCount === -1) {
      app.common.loadLevelById(selectCount + 1);
    } else {
      const id = JSON.parse(elems.levels.dialog.dataset.selectIds)[selectCount];
      app.common.loadLevelById(id);
    }
    elems.levels.dialog.close();
  }

  function updateLevelsDialog(page_ = null) {
    let page = page_;
    window.getSelection().removeAllRanges();

    if (!elems.levels.display.crown.hasChildNodes()) {
      elems.levels.display.crown.appendChild(app.common.createCrown(38, 0.1, 0.1, 1, undefined));
    }

    const largeCrownFlag = elems.levels.display.checkbox.checked;

    elems.levels.dialogSvg.innerHTML = '';

    let totalNum = 0;

    if (app.common.isSeqMode) {
      if (page === null) {
        const num = app.common.levelId;
        page = Math.floor((num - 1) / LEVEL_SELECT_NUM_PER_PAGE);
        elems.levels.dialog.dataset.selectCount = num - 1;
      }
    } else {
      const levels = app.common.levels.getAllLevels();
      for (const { levelId } of levels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;
        if (page === null && String(levelId) === String(app.common.levelId)) {
          page = Math.floor(totalNum / LEVEL_SELECT_NUM_PER_PAGE);
          elems.levels.dialog.dataset.selectCount = totalNum;
        }
        totalNum++;
      }
    }
    elems.levels.dialog.dataset.maxCount = totalNum - 1;

    if (page === null) {
      page = 0;
    }
    elems.levels.dialog.dataset.page = page;

    let prevHide = false;

    // ←
    if (page === 0) {
      app.common.hideElem(elems.levels.prev);
      prevHide = true;
    } else {
      app.common.showElem(elems.levels.prev);
    }

    app.common.showElem(elems.levels.buttonSvg);

    // →
    if (page + 1 === Math.floor((totalNum + LEVEL_SELECT_NUM_PER_PAGE - 1) / LEVEL_SELECT_NUM_PER_PAGE)) {
      app.common.hideElem(elems.levels.next);
      if (prevHide) {
        app.common.hideElem(elems.levels.buttonSvg);
      }
    } else {
      app.common.showElem(elems.levels.next);
    }

    let count = 0;

    if (app.common.isSeqMode) {
      for (let num = page * LEVEL_SELECT_NUM_PER_PAGE + 1; num <= (page + 1) * LEVEL_SELECT_NUM_PER_PAGE; num++) {
        appendLevelForSeqMode(num);
      }
    } else {
      const selectIds = {};
      const levels = app.common.levels.getAllLevels();
      for (const { levelId, levelObj } of levels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;
        if (page * LEVEL_SELECT_NUM_PER_PAGE <= count && count < (page + 1) * LEVEL_SELECT_NUM_PER_PAGE) {
          appendLevel(levelObj, levelId);
          selectIds[count] = levelId;
        }
        count++;
      }
      elems.levels.dialog.dataset.selectIds = JSON.stringify(selectIds);
    }

    // 選択枠
    if (!app.common.isTouchDevice()) {
      const maxCount = Number(elems.levels.dialog.dataset.maxCount);
      if (maxCount !== -1 && Number(elems.levels.dialog.dataset.selectCount) > maxCount) {
        elems.levels.dialog.dataset.selectCount = maxCount;
      }

      const selectCount = Number(elems.levels.dialog.dataset.selectCount);
      const rect = app.svg.createRect(1, {
        x: 1,
        y: 1,
        width: LEVEL_SELECT_WIDTH,
        height: LEVEL_SELECT_HEIGHT,
        fill: 'none',
        stroke: app.colors.levelsDialogSelect,
      });
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('rx', '5');
      rect.setAttribute('ry', '5');

      const g = app.svg.createG();
      g.appendChild(rect);
      elems.levels.dialogSvg.appendChild(g);

      const x = (selectCount % LEVEL_SELECT_COLS) * LEVEL_SELECT_WIDTH;
      const y = Math.floor((selectCount % LEVEL_SELECT_NUM_PER_PAGE) / LEVEL_SELECT_COLS) * LEVEL_SELECT_HEIGHT;
      g.setAttribute('id', levelSelectId);
      g.setAttribute('transform', `translate(${x},${y})`);
    }

    function appendLevelForSeqMode(num) {
      const g = app.svg.createG();
      g.classList.add('level-select');
      elems.levels.dialogSvg.appendChild(g);

      let backgroundColor;
      if (num === app.common.levelId) {
        backgroundColor = app.colors.levelsDialogCurrentLevelSeqMode;
      } else {
        backgroundColor = '#ffffff';
      }

      {
        // 背景
        const rect = app.svg.createRect(1, {
          x: 0,
          y: 0,
          width: LEVEL_SELECT_WIDTH,
          height: LEVEL_SELECT_HEIGHT,
          fill: backgroundColor,
          stroke: app.colors.frameStrokeSeqMode,
        });
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        g.appendChild(rect);
      }

      // レベルID
      {
        const text = app.svg.createText(1, {
          x: LEVEL_SELECT_WIDTH / 2,
          y: 14,
          text: num,
          fill: '#303080',
        });
        text.setAttribute('font-size', '20px');
        g.appendChild(text);
      }

      {
        const x = ((num - 1) % LEVEL_SELECT_COLS) * LEVEL_SELECT_WIDTH + 1;
        const y = Math.floor(((num - 1) % LEVEL_SELECT_NUM_PER_PAGE) / LEVEL_SELECT_COLS) * LEVEL_SELECT_HEIGHT + 1;
        g.setAttribute('transform', `translate(${x},${y})`);
      }

      g.dataset.id = num;
      g.classList.add('button', 'active-hover');
      g.addEventListener('click', function () {
        const id = Number(g.dataset.id);
        app.common.loadLevelById(id);
        close(false);
      });

      const mode = app.Level.getCheckModeStr(app.common.level.getCheckMode());
      const highestScore = app.savedata.getHighestScoreForSeqMode(num, mode);

      let hideDetailFlag = false;
      if (largeCrownFlag) {
        hideDetailFlag = true;
      }

      // 王冠
      if (hideDetailFlag) {
        // 大きい王冠
        const crown = app.common.createCrown(LEVEL_SELECT_WIDTH / 2, 0.5, 1, highestScore, undefined);
        g.appendChild(crown);
      } else {
        // 小さい王冠
        const crown = app.common.createCrown(LEVEL_SELECT_WIDTH / 3, 1, 1.1, highestScore, undefined);
        g.appendChild(crown);
      }

      // クリア時のステップ数
      if (!hideDetailFlag) {
        const text = app.svg.createText(1, {
          x: LEVEL_SELECT_WIDTH / 2,
          y: (LEVEL_SELECT_HEIGHT * 2) / 3 - 3,
          text: highestScore ?? '-',
          fill: app.common.getStepColor(highestScore, undefined),
        });
        text.setAttribute('font-size', '24px');
        g.appendChild(text);
      }
    }

    function appendLevel(levelObj, id) {
      const level = new app.Level({
        levelObj,
        checkMode: app.common.checkMode,
      });
      const bestStep = level.getBestStep();
      const highestScore = app.savedata.getHighestScore(level);

      let hideDetailFlag = false;
      if (highestScore !== null) {
        if (largeCrownFlag) hideDetailFlag = true;
      }

      const g = app.svg.createG();
      g.classList.add('level-select');
      elems.levels.dialogSvg.appendChild(g);

      let backgroundColor;
      if (String(id) === String(app.common.levelId)) {
        backgroundColor = app.colors.levelsDialogCurrentLevel;
      } else {
        backgroundColor = '#ffffff';
      }

      {
        // 背景
        const rect = app.svg.createRect(1, {
          x: 0,
          y: 0,
          width: LEVEL_SELECT_WIDTH,
          height: LEVEL_SELECT_HEIGHT,
          fill: backgroundColor,
          stroke: app.colors.frameStroke,
        });
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        g.appendChild(rect);
      }

      // レベルID
      {
        const text = app.svg.createText(1, {
          x: LEVEL_SELECT_WIDTH / 2,
          y: 14,
          text: id,
          fill: '#303080',
        });
        text.setAttribute('font-size', '20px');
        g.appendChild(text);
      }

      // 王冠
      if (hideDetailFlag) {
        // 大きい王冠
        const crown = app.common.createCrown(LEVEL_SELECT_WIDTH / 2, 0.5, 1, highestScore, bestStep);
        g.appendChild(crown);
      } else {
        // 小さい王冠
        const crown = app.common.createCrown(20, 0, 1, highestScore, bestStep);
        g.appendChild(crown);
      }

      if (!hideDetailFlag && highestScore !== null) {
        // クリア時のステップ数
        {
          const text = app.svg.createText(1, {
            x: 22,
            y: 33,
            text: highestScore,
            fill: app.common.getStepColor(highestScore, bestStep),
          });
          text.setAttribute('font-size', '15px');
          text.setAttribute('text-anchor', 'start');
          g.appendChild(text);
        }

        // 形状数
        {
          const shapesObj = app.savedata.getShapesObj(level);
          const shapeNum = shapesObj !== undefined ? Object.keys(shapesObj).length : '0';
          const shapes = level.getShapes() ?? '?';

          const text = app.svg.createText(1, {
            x: LEVEL_SELECT_WIDTH - 5,
            y: 33,
            text: `${shapeNum}/${shapes}`,
            fill: '#888888',
          });
          text.setAttribute('font-size', '15px');
          text.setAttribute('text-anchor', 'end');

          const fill = shapeNum === shapes ? app.colors.shapeNumPerfect : app.colors.shapeNumNormal;
          text.setAttribute('fill', fill);
          g.appendChild(text);
        }
      }

      // 盤面表示
      if (!hideDetailFlag) {
        const blockSize = Math.min((LEVEL_SELECT_WIDTH - 4) / level.getWidth(), (LEVEL_SELECT_HEIGHT - 42) / level.getHeight());
        const levelSvgG = level.createSvgG({
          blockSize,
          smallJumpFlag: true,
          edgeColor: backgroundColor,
        });
        levelSvgG.setAttribute('transform', `translate(${(LEVEL_SELECT_WIDTH - blockSize * level.getWidth()) / 2},40)`);
        g.appendChild(levelSvgG);
      }

      {
        const x = (count % LEVEL_SELECT_COLS) * LEVEL_SELECT_WIDTH + 1;
        const y = Math.floor((count % LEVEL_SELECT_NUM_PER_PAGE) / LEVEL_SELECT_COLS) * LEVEL_SELECT_HEIGHT + 1;
        g.setAttribute('transform', `translate(${x},${y})`);
      }

      g.dataset.id = id;
      g.classList.add('button', 'active-hover');
      g.addEventListener('click', function () {
        const id = Number(g.dataset.id);
        app.common.loadLevelById(id);
        close(false);
      });
    }
  }

  function close(sound = true) {
    if (sound) {
      window.sound.playUiClose();
    }
    elems.levels.dialog.close();
  }
})();
