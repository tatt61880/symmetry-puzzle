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
    init,
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

  let onSelectLevel;
  let createPreviewLevel;

  function readIndex(name) {
    return BigInt(elems.levels.dialog.dataset[name] ?? '0');
  }

  function sequenceSign() {
    return app.common.levelId < 0 ? -1n : 1n;
  }

  function selectionPosition(count) {
    const index = Number(count % BigInt(LEVEL_SELECT_NUM_PER_PAGE));
    return {
      x: (index % LEVEL_SELECT_COLS) * LEVEL_SELECT_WIDTH,
      y: Math.floor(index / LEVEL_SELECT_COLS) * LEVEL_SELECT_HEIGHT,
    };
  }

  function init(onSelect, createLevel) {
    onSelectLevel = onSelect;
    createPreviewLevel = createLevel;
  }

  function show() {
    updateLevelsDialog();
    app.sound.playUiOpen();
    elems.levels.dialog.showModal();
  }

  function update() {
    app.sound.playButton();
    const page = readIndex('page');
    updateLevelsDialog(page);
  }

  function prevPage() {
    if (app.common.isShownElem(elems.levels.prev)) {
      app.sound.playButton();
      elems.levels.dialog.dataset.selectCount = readIndex('selectCount') - BigInt(LEVEL_SELECT_NUM_PER_PAGE);
      const page = readIndex('page') - 1n;
      updateLevelsDialog(page);
    }
  }

  function nextPage() {
    if (app.common.isShownElem(elems.levels.next)) {
      app.sound.playButton();
      elems.levels.dialog.dataset.selectCount = readIndex('selectCount') + BigInt(LEVEL_SELECT_NUM_PER_PAGE);
      const page = readIndex('page') + 1n;
      updateLevelsDialog(page);
    }
  }

  function levelSelectUpdate(selectCount) {
    if (app.common.isTouchDevice()) {
      return;
    }
    const currentPage = readIndex('page');
    const page = selectCount / BigInt(LEVEL_SELECT_NUM_PER_PAGE);
    if (page !== currentPage) {
      updateLevelsDialog(page);
    }

    elems.levels.dialog.dataset.selectCount = selectCount;
    const g = document.getElementById(levelSelectId);
    const { x, y } = selectionPosition(selectCount);
    g.setAttribute('transform', `translate(${x},${y})`);
  }

  function selectUp() {
    const selectCount = readIndex('selectCount') - BigInt(LEVEL_SELECT_COLS);
    if (selectCount >= 0) {
      levelSelectUpdate(selectCount);
    }
  }

  function selectRight() {
    const selectCount = readIndex('selectCount') + 1n;
    const maxCount = Number(elems.levels.dialog.dataset.maxCount);
    if (maxCount === -1 || selectCount <= maxCount) {
      levelSelectUpdate(selectCount);
    }
  }

  function selectDown() {
    const selectCount = readIndex('selectCount') + BigInt(LEVEL_SELECT_COLS);
    const maxCount = Number(elems.levels.dialog.dataset.maxCount);
    if (maxCount === -1 || selectCount <= maxCount) {
      levelSelectUpdate(selectCount);
    }
  }

  function selectLeft() {
    const selectCount = readIndex('selectCount') - 1n;
    if (selectCount >= 0) {
      levelSelectUpdate(selectCount);
    }
  }

  function selectEnter() {
    const selectCount = readIndex('selectCount');
    const maxCount = Number(elems.levels.dialog.dataset.maxCount);
    if (maxCount === -1) {
      onSelectLevel(sequenceSign() * (selectCount + 1n));
    } else {
      const id = JSON.parse(elems.levels.dialog.dataset.selectIds)[selectCount];
      onSelectLevel(id);
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

    const listedLevels = app.common.isSeqMode ? [] : app.common.levels.getListedLevels();
    const totalNum = listedLevels.length;

    if (app.common.isSeqMode) {
      if (page === null) {
        const num = typeof app.common.levelId === 'bigint' ? app.common.levelId * sequenceSign() : 1n;
        const index = num > 0n ? num - 1n : 0n;
        page = index / BigInt(LEVEL_SELECT_NUM_PER_PAGE);
        elems.levels.dialog.dataset.selectCount = index;
      }
    } else if (page === null) {
      const index = listedLevels.findIndex(({ levelId }) => String(levelId) === String(app.common.levelId));
      if (index !== -1) {
        page = BigInt(Math.floor(index / LEVEL_SELECT_NUM_PER_PAGE));
        elems.levels.dialog.dataset.selectCount = index;
      }
    }
    elems.levels.dialog.dataset.maxCount = totalNum - 1;

    if (page === null) {
      page = 0n;
    }
    elems.levels.dialog.dataset.page = page;

    let prevHide = false;

    // ←
    if (page === 0n) {
      app.common.hideElem(elems.levels.prev);
      prevHide = true;
    } else {
      app.common.showElem(elems.levels.prev);
    }

    app.common.showElem(elems.levels.buttonSvg);

    // →
    if (page + 1n === BigInt(Math.ceil(totalNum / LEVEL_SELECT_NUM_PER_PAGE))) {
      app.common.hideElem(elems.levels.next);
      if (prevHide) {
        app.common.hideElem(elems.levels.buttonSvg);
      }
    } else {
      app.common.showElem(elems.levels.next);
    }

    if (app.common.isSeqMode) {
      const start = page * BigInt(LEVEL_SELECT_NUM_PER_PAGE);
      for (let i = 0; i < LEVEL_SELECT_NUM_PER_PAGE; i++) {
        appendLevelForSeqMode(sequenceSign() * (start + BigInt(i) + 1n), i);
      }
    } else {
      const selectIds = {};
      const start = Number(page) * LEVEL_SELECT_NUM_PER_PAGE;
      listedLevels.slice(start, start + LEVEL_SELECT_NUM_PER_PAGE).forEach(({ levelId, levelObj }, indexOnPage) => {
        appendLevel(levelObj, levelId, indexOnPage);
        selectIds[start + indexOnPage] = levelId;
      });
      elems.levels.dialog.dataset.selectIds = JSON.stringify(selectIds);
    }

    // 選択枠
    if (!app.common.isTouchDevice()) {
      const maxCount = Number(elems.levels.dialog.dataset.maxCount);
      if (maxCount !== -1 && readIndex('selectCount') > maxCount) {
        elems.levels.dialog.dataset.selectCount = maxCount;
      }

      const selectCount = readIndex('selectCount');
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

      const { x, y } = selectionPosition(selectCount);
      g.setAttribute('id', levelSelectId);
      g.setAttribute('transform', `translate(${x},${y})`);
    }

    function appendLevelForSeqMode(num, indexOnPage) {
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
        if (String(num).length > 6) {
          text.setAttribute('textLength', String(LEVEL_SELECT_WIDTH - 10));
          text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
        }
      }

      {
        const x = (indexOnPage % LEVEL_SELECT_COLS) * LEVEL_SELECT_WIDTH + 1;
        const y = Math.floor(indexOnPage / LEVEL_SELECT_COLS) * LEVEL_SELECT_HEIGHT + 1;
        g.setAttribute('transform', `translate(${x},${y})`);
      }

      g.dataset.id = num;
      g.classList.add('button', 'active-hover', 'button-press');
      g.addEventListener('click', function () {
        const id = app.sequence.parseNumber(g.dataset.id);
        onSelectLevel(id);
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

    function appendLevel(levelObj, id, indexOnPage) {
      const level = createPreviewLevel(levelObj);
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
        const x = (indexOnPage % LEVEL_SELECT_COLS) * LEVEL_SELECT_WIDTH + 1;
        const y = Math.floor(indexOnPage / LEVEL_SELECT_COLS) * LEVEL_SELECT_HEIGHT + 1;
        g.setAttribute('transform', `translate(${x},${y})`);
      }

      g.dataset.id = id;
      g.classList.add('button', 'active-hover', 'button-press');
      g.addEventListener('click', function () {
        const id = Number(g.dataset.id);
        onSelectLevel(id);
        close(false);
      });
    }
  }

  function close(sound = true) {
    if (sound) {
      app.sound.playUiClose();
    }
    elems.levels.dialog.close();
  }
})();
