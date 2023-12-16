(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);
  console.assert(app?.common !== undefined);

  window.app = window.app || {};
  window.app.dialog = window.app.dialog || {};
  window.app.dialog.shapes = {
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

  const shapeSelectId = 'shapes-select';

  const SELECT_NUM_PER_PAGE = 20;
  const SELECT_HEIGHT = 90;
  const SELECT_WIDTH = 90;
  const SELECT_COLS = 5;

  function show() {
    updateDialog();
    elems.shapes.dialog.showModal();
  }

  function update() {
    const page = Number(elems.shapes.dialog.dataset.page);
    updateDialog(page);
  }

  function prevPage() {
    if (app.common.isShownElem(elems.shapes.prev)) {
      elems.shapes.dialog.dataset.selectCount =
        Number(elems.shapes.dialog.dataset.selectCount) - SELECT_NUM_PER_PAGE;
      const page = Number(elems.shapes.dialog.dataset.page) - 1;
      updateDialog(page);
    }
  }

  function nextPage() {
    if (app.common.isShownElem(elems.shapes.next)) {
      elems.shapes.dialog.dataset.selectCount =
        Number(elems.shapes.dialog.dataset.selectCount) + SELECT_NUM_PER_PAGE;
      const page = Number(elems.shapes.dialog.dataset.page) + 1;
      updateDialog(page);
    }
  }

  function selectUpdate(selectCount) {
    if (app.common.isTouchDevice()) {
      return;
    }
    const currentPage = Number(elems.shapes.dialog.dataset.page);
    const page = Math.floor(selectCount / SELECT_NUM_PER_PAGE);
    if (page !== currentPage) {
      updateDialog(page);
    }

    elems.shapes.dialog.dataset.selectCount = selectCount;
    const g = document.getElementById(shapeSelectId);
    const x = (selectCount % SELECT_COLS) * SELECT_WIDTH;
    const y =
      Math.floor((selectCount % SELECT_NUM_PER_PAGE) / SELECT_COLS) *
      SELECT_HEIGHT;
    g.setAttribute('transform', `translate(${x},${y})`);
  }

  function selectUp() {
    const selectCount =
      Number(elems.shapes.dialog.dataset.selectCount) - SELECT_COLS;
    if (selectCount >= 0) {
      selectUpdate(selectCount);
    }
  }

  function selectRight() {
    const selectCount = Number(elems.shapes.dialog.dataset.selectCount) + 1;
    if (selectCount <= Number(elems.shapes.dialog.dataset.maxCount)) {
      selectUpdate(selectCount);
    }
  }

  function selectDown() {
    const selectCount =
      Number(elems.shapes.dialog.dataset.selectCount) + SELECT_COLS;
    if (selectCount <= Number(elems.shapes.dialog.dataset.maxCount)) {
      selectUpdate(selectCount);
    }
  }

  function selectLeft() {
    const selectCount = Number(elems.shapes.dialog.dataset.selectCount) - 1;
    if (selectCount >= 0) {
      selectUpdate(selectCount);
    }
  }

  function selectEnter() {
    const selectCount = Number(elems.shapes.dialog.dataset.selectCount);
    const id = JSON.parse(elems.shapes.dialog.dataset.selectIds)[selectCount];
    app.common.loadLevelById(id);
    elems.shapes.dialog.close();
  }

  function updateDialog(page_ = null) {
    let page = page_;
    window.getSelection().removeAllRanges();

    elems.shapes.dialogSvg.innerHTML = '';

    let totalNum = 0;
    for (let id = 1; id < app.common.levelsList.length; ++id) {
      if (page === null && id === app.common.levelId) {
        page = Math.floor(totalNum / SELECT_NUM_PER_PAGE);
        elems.shapes.dialog.dataset.selectCount = totalNum;
      }
      totalNum++;
    }
    for (const id of Object.keys(app.common.levelsListEx).sort()) {
      if (String(id) === 'NaN') continue;
      if (page === null && Number(id) === app.common.levelId) {
        page = Math.floor(totalNum / SELECT_NUM_PER_PAGE);
        elems.shapes.dialog.dataset.selectCount = totalNum;
      }
      totalNum++;
    }
    elems.shapes.dialog.dataset.maxCount = totalNum - 1;

    if (page === null) {
      page = 0;
    }
    elems.shapes.dialog.dataset.page = page;

    let prevHide = false;

    // ←
    if (page === 0) {
      app.common.hideElem(elems.shapes.prev);
      prevHide = true;
    } else {
      app.common.showElem(elems.shapes.prev);
    }

    app.common.showElem(elems.shapes.buttonSvg);

    // →
    if (
      page + 1 ===
      Math.floor((totalNum + SELECT_NUM_PER_PAGE - 1) / SELECT_NUM_PER_PAGE)
    ) {
      app.common.hideElem(elems.shapes.next);
      if (prevHide) {
        app.common.hideElem(elems.shapes.buttonSvg);
      }
    } else {
      app.common.showElem(elems.shapes.next);
    }

    let count = 0;
    const selectIds = {};
    for (let id = 1; id < app.common.levelsList.length; ++id) {
      if (
        page * SELECT_NUM_PER_PAGE <= count &&
        count < (page + 1) * SELECT_NUM_PER_PAGE
      ) {
        const levelObj = app.common.levelsList[id];
        appendLevel(levelObj, id);
        selectIds[count] = id;
      }
      count++;
    }
    for (const id of Object.keys(app.common.levelsListEx).sort()) {
      if (String(id) === 'NaN') continue;
      if (
        page * SELECT_NUM_PER_PAGE <= count &&
        count < (page + 1) * SELECT_NUM_PER_PAGE
      ) {
        const levelObj = app.common.levelsListEx[id];
        appendLevel(levelObj, id);
        selectIds[count] = id;
      }
      count++;
    }
    elems.shapes.dialog.dataset.selectIds = JSON.stringify(selectIds);

    // 選択枠
    if (!app.common.isTouchDevice()) {
      if (
        Number(elems.shapes.dialog.dataset.selectCount) >
        Number(elems.shapes.dialog.dataset.maxCount)
      ) {
        elems.shapes.dialog.dataset.selectCount = Number(
          elems.shapes.dialog.dataset.maxCount
        );
      }

      const selectCount = Number(elems.shapes.dialog.dataset.selectCount);
      const rect = app.svg.createRect(1, {
        x: 1,
        y: 1,
        width: SELECT_WIDTH,
        height: SELECT_HEIGHT,
        fill: 'none',
        stroke: app.colors.levelsDialogSelect,
      });
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('rx', '5');
      rect.setAttribute('ry', '5');

      const g = app.svg.createG();
      g.appendChild(rect);
      elems.shapes.dialogSvg.appendChild(g);

      const x = (selectCount % SELECT_COLS) * SELECT_WIDTH;
      const y =
        Math.floor((selectCount % SELECT_NUM_PER_PAGE) / SELECT_COLS) *
        SELECT_HEIGHT;
      g.setAttribute('id', shapeSelectId);
      g.setAttribute('transform', `translate(${x},${y})`);
    }

    function appendLevel(levelObj, id) {
      const level = new app.Level({
        levelObj,
        checkMode: app.common.checkMode,
      });
      const bestStep = level.getBestStep();
      const highestScore = app.savedata.getHighestScore(
        levelObj,
        level.getCheckMode()
      );

      const g = app.svg.createG();
      g.classList.add('level-select');
      elems.shapes.dialogSvg.appendChild(g);

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
          width: SELECT_WIDTH,
          height: SELECT_HEIGHT,
          fill: backgroundColor,
          stroke: '#dddddd',
        });
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        g.appendChild(rect);
      }

      {
        const crown = app.common.createCrown(20, 0, 0, highestScore, bestStep);
        g.appendChild(crown);
      }
      {
        const text = app.svg.createText(1, {
          x: SELECT_WIDTH / 2,
          y: 12,
          text: id,
          fill: 'black',
        });
        text.setAttribute('font-size', '16px');
        g.appendChild(text);
      }
      if (highestScore !== null) {
        const text = app.svg.createText(1, {
          x: SELECT_WIDTH - 3,
          y: 10,
          text: highestScore,
          fill: app.common.getStepColor(highestScore, bestStep),
        });
        text.setAttribute('font-size', '11px');
        text.setAttribute('text-anchor', 'end');
        g.appendChild(text);
      }

      {
        const blockSize = Math.min(
          (SELECT_WIDTH - 8) / level.getWidth(),
          (SELECT_HEIGHT - 25) / level.getHeight()
        );
        const levelSvgG = level.createSvgG({
          blockSize,
          edgeColor: backgroundColor,
        });
        levelSvgG.setAttribute(
          'transform',
          `translate(${(SELECT_WIDTH - blockSize * level.getWidth()) / 2},20)`
        );
        g.appendChild(levelSvgG);
      }

      {
        const x = (count % SELECT_COLS) * SELECT_WIDTH + 1;
        const y =
          Math.floor((count % SELECT_NUM_PER_PAGE) / SELECT_COLS) *
          SELECT_HEIGHT;
        g.setAttribute('transform', `translate(${x},${y})`);
      }
      g.dataset.id = id;
      g.addEventListener('click', function () {
        const id = Number(g.dataset.id);
        app.common.loadLevelById(id);
        close();
      });
    }
  }

  function close() {
    elems.shapes.dialog.close();
  }
})();
