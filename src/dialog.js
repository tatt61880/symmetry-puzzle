(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  if (!isBrowser) {
    console.error('Error: dialog.js is for browser.');
    return;
  }

  const app = window.app;
  if (app.elems === undefined) app.console.error('app.elems is undefined.');

  const elems = app.elems;

  const dialog = {
    toggleHelpDialog,
    showHelpDialog,
    closeHelpDialog,

    showLevelsDialog,
    toggleHideCompletedLevels,
    gotoPrevLevelPage,
    gotoNextLevelPage,
    levelSelectUp,
    levelSelectRight,
    levelSelectDown,
    levelSelectLeft,
    levelSelectEnter,

    showRecordsDialog,
    closeRecordsDialog,
  };

  // --------------------------------------------------------------------------

  function toggleHelpDialog() {
    if (!elems.help.dialog.open) {
      showHelpDialog();
    } else {
      closeHelpDialog();
    }
  }

  function showHelpDialog() {
    if (app.common.checkMode === app.Level.CHECK_MODE.POINT) {
      elems.help.tabPoint.checked = true;
    } else if (app.common.checkMode === app.Level.CHECK_MODE.LINE) {
      elems.help.tabLine.checked = true;
    } else {
      elems.help.tabSymmetry.checked = true;
    }

    elems.help.dialog.showModal();
  }

  function closeHelpDialog() {
    elems.help.dialog.close();
  }

  // --------------------------------------------------------------------------

  const LEVEL_SELECT_NUM_PER_PAGE = 20;
  const LEVEL_SELECT_HEIGHT = 90;
  const LEVEL_SELECT_WIDTH = 90;
  const LEVEL_SELECT_COLS = 5;

  function showLevelsDialog() {
    updateLevelsDialog();
    elems.levels.dialog.showModal();
  }

  function toggleHideCompletedLevels() {
    const page = Number(elems.levels.dialog.dataset.page);
    updateLevelsDialog(page);
  }

  function gotoPrevLevelPage() {
    if (!elems.levels.prev.classList.contains('hide')) {
      elems.levels.dialog.dataset.selectCount =
        Number(elems.levels.dialog.dataset.selectCount) -
        LEVEL_SELECT_NUM_PER_PAGE;
      const page = Number(elems.levels.dialog.dataset.page) - 1;
      updateLevelsDialog(page);
    }
  }

  function gotoNextLevelPage() {
    if (!elems.levels.next.classList.contains('hide')) {
      elems.levels.dialog.dataset.selectCount =
        Number(elems.levels.dialog.dataset.selectCount) +
        LEVEL_SELECT_NUM_PER_PAGE;
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
    const g = document.getElementById('levelSelect');
    const x = (selectCount % LEVEL_SELECT_COLS) * LEVEL_SELECT_WIDTH;
    const y =
      Math.floor(
        (selectCount % LEVEL_SELECT_NUM_PER_PAGE) / LEVEL_SELECT_COLS
      ) * LEVEL_SELECT_HEIGHT;
    g.setAttribute('transform', `translate(${x},${y})`);
  }

  function levelSelectUp() {
    const selectCount =
      Number(elems.levels.dialog.dataset.selectCount) - LEVEL_SELECT_COLS;
    if (selectCount >= 0) {
      levelSelectUpdate(selectCount);
    }
  }

  function levelSelectRight() {
    const selectCount = Number(elems.levels.dialog.dataset.selectCount) + 1;
    if (selectCount <= Number(elems.levels.dialog.dataset.maxCount)) {
      levelSelectUpdate(selectCount);
    }
  }

  function levelSelectDown() {
    const selectCount =
      Number(elems.levels.dialog.dataset.selectCount) + LEVEL_SELECT_COLS;
    if (selectCount <= Number(elems.levels.dialog.dataset.maxCount)) {
      levelSelectUpdate(selectCount);
    }
  }

  function levelSelectLeft() {
    const selectCount = Number(elems.levels.dialog.dataset.selectCount) - 1;
    if (selectCount >= 0) {
      levelSelectUpdate(selectCount);
    }
  }

  function levelSelectEnter() {
    const selectCount = Number(elems.levels.dialog.dataset.selectCount);
    const id = JSON.parse(elems.levels.dialog.dataset.selectIds)[selectCount];
    app.common.loadLevelById(id);
    elems.levels.dialog.close();
  }

  function updateLevelsDialog(page_ = null) {
    let page = page_;
    window.getSelection().removeAllRanges();

    if (!elems.levels.toggleCrown.hasChildNodes()) {
      elems.levels.toggleCrown.appendChild(
        app.common.createCrown(20, 0, 0, 1, 1)
      );
    }

    // const hideCompletedLevelsFlag = elems.levels.hideClearedLevels.checked;
    const hideShortestLevelsFlag = elems.levels.hideShortestLevels.checked;

    elems.levels.dialogSvg.innerHTML = '';

    let totalNum = 0;
    for (let id = 1; id < app.common.levelsList.length; ++id) {
      if (page === null && id === app.common.levelId) {
        page = Math.floor(totalNum / LEVEL_SELECT_NUM_PER_PAGE);
        elems.levels.dialog.dataset.selectCount = totalNum;
      }
      totalNum++;
    }
    for (const id of Object.keys(app.common.levelsListEx).sort()) {
      if (String(id) === 'NaN') continue;
      if (page === null && Number(id) === app.common.levelId) {
        page = Math.floor(totalNum / LEVEL_SELECT_NUM_PER_PAGE);
        elems.levels.dialog.dataset.selectCount = totalNum;
      }
      totalNum++;
    }
    elems.levels.dialog.dataset.maxCount = totalNum - 1;

    if (page === null) {
      page = 0;
    }
    elems.levels.dialog.dataset.page = page;
    if (page === 0) {
      app.common.hideElem(elems.levels.prev);
    } else {
      app.common.showElem(elems.levels.prev);
    }
    if (
      page + 1 ===
      Math.floor(
        (totalNum + LEVEL_SELECT_NUM_PER_PAGE - 1) / LEVEL_SELECT_NUM_PER_PAGE
      )
    ) {
      app.common.hideElem(elems.levels.next);
    } else {
      app.common.showElem(elems.levels.next);
    }

    let count = 0;
    const selectIds = {};
    for (let id = 1; id < app.common.levelsList.length; ++id) {
      if (
        page * LEVEL_SELECT_NUM_PER_PAGE <= count &&
        count < (page + 1) * LEVEL_SELECT_NUM_PER_PAGE
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
        page * LEVEL_SELECT_NUM_PER_PAGE <= count &&
        count < (page + 1) * LEVEL_SELECT_NUM_PER_PAGE
      ) {
        const levelObj = app.common.levelsListEx[id];
        appendLevel(levelObj, id);
        selectIds[count] = id;
      }
      count++;
    }
    elems.levels.dialog.dataset.selectIds = JSON.stringify(selectIds);

    // 選択枠
    if (!app.common.isTouchDevice()) {
      if (
        Number(elems.levels.dialog.dataset.selectCount) >
        Number(elems.levels.dialog.dataset.maxCount)
      ) {
        elems.levels.dialog.dataset.selectCount = Number(
          elems.levels.dialog.dataset.maxCount
        );
      }

      const selectCount = Number(elems.levels.dialog.dataset.selectCount);
      const rect = app.svg.createRect(1, {
        x: 1,
        y: 1,
        width: LEVEL_SELECT_WIDTH - 2,
        height: LEVEL_SELECT_HEIGHT - 2,
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
      const y =
        Math.floor(
          (selectCount % LEVEL_SELECT_NUM_PER_PAGE) / LEVEL_SELECT_COLS
        ) * LEVEL_SELECT_HEIGHT;
      g.setAttribute('id', 'levelSelect');
      g.setAttribute('transform', `translate(${x},${y})`);
    }

    function appendLevel(levelObj, id) {
      const level = new app.Level(levelObj, app.common.checkMode, {});
      const bestStep = level.getBestStep();
      const highestScore = app.savedata.getHighestScore(
        levelObj,
        level.isLineMode()
      );

      if (
        highestScore !== null &&
        hideShortestLevelsFlag &&
        highestScore <= bestStep
      ) {
        return;
      }

      const g = app.svg.createG();
      g.classList.add('level-select');
      elems.levels.dialogSvg.appendChild(g);

      if (String(id) === String(app.common.levelId)) {
        const rect = app.svg.createRect(1, {
          x: 0,
          y: 0,
          width: LEVEL_SELECT_WIDTH,
          height: LEVEL_SELECT_HEIGHT,
          fill: app.colors.levelsDialogCurrentLevel,
        });
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        g.appendChild(rect);
      } else {
        const rect = app.svg.createRect(1, {
          x: 0,
          y: 0,
          width: LEVEL_SELECT_WIDTH,
          height: LEVEL_SELECT_HEIGHT,
          fill: '#ffffff',
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
          x: LEVEL_SELECT_WIDTH / 2,
          y: 12,
          text: id,
          fill: 'black',
        });
        g.appendChild(text);
        g.setAttribute('transform', 'translate(20,20)');
      }
      {
        const blockSize = Math.min(
          (LEVEL_SELECT_WIDTH - 8) / level.getWidth(),
          (LEVEL_SELECT_HEIGHT - 25) / level.getHeight()
        );
        const levelSvgG = level.createSvgG(blockSize);
        levelSvgG.setAttribute(
          'transform',
          `translate(${
            (LEVEL_SELECT_WIDTH - blockSize * level.getWidth()) / 2
          },20)`
        );
        g.appendChild(levelSvgG);
      }

      {
        const x = (count % LEVEL_SELECT_COLS) * LEVEL_SELECT_WIDTH + 1;
        const y =
          Math.floor((count % LEVEL_SELECT_NUM_PER_PAGE) / LEVEL_SELECT_COLS) *
          LEVEL_SELECT_HEIGHT;
        g.setAttribute('transform', `translate(${x},${y})`);
      }
      g.dataset.id = id;
      g.addEventListener('click', function () {
        const id = Number(g.dataset.id);
        app.common.loadLevelById(id);
        closeLevelsDialog();
      });
    }
  }

  function closeLevelsDialog() {
    elems.levels.dialog.close();
  }

  // --------------------------------------------------------------------------

  function showRecordsDialog() {
    elems.records.tableDiv.innerHTML = '';
    elems.records.tableDiv.appendChild(createRecordsTable());
    elems.records.dialog.showModal();
  }

  function createRecordsTable() {
    const table = document.createElement('table');
    table.appendChild(createRecordsThead());
    table.appendChild(createRecordsTbody());
    return table;
  }

  function createRecordsThead() {
    const thead = document.createElement('thead');

    const tr = document.createElement('tr');
    thead.appendChild(tr);

    const imgSize = '50';
    {
      const th = document.createElement('th');
      tr.appendChild(th);
    }
    {
      const th = document.createElement('th');
      tr.appendChild(th);
      const img = document.createElement('img');
      img.src = './images/line.png';
      img.setAttribute('width', imgSize);
      img.setAttribute('height', imgSize);
      th.appendChild(img);
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
      th.innerText = 'Total';
      th.classList.add('total-col');
    }

    return thead;
  }

  function createRecordsTbody() {
    const tbody = document.createElement('tbody');
    const size = 30;

    let numLineNotSolved = 0;
    let numLineSolvedNormal = 0;
    let numLineSolvedBest = 0;

    {
      const levelsList = app.levelsLine;
      const levelsListEx = app.levelsLineEx;
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
        const playerScore = app.savedata.getHighestScore(levelObj, true);
        const appScore = levelObj.step;
        if (playerScore === null) {
          ++numLineNotSolved;
        } else if (playerScore > appScore) {
          ++numLineSolvedNormal;
        } else {
          ++numLineSolvedBest;
        }
      }
    }

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
        const playerScore = app.savedata.getHighestScore(levelObj, false);
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

    const numTotalNotSolved = numLineNotSolved + numPointNotSolved;
    const numTotalSolvedNormal = numLineSolvedNormal + numPointSolvedNormal;
    const numTotalSolvedBest = numLineSolvedBest + numPointSolvedBest;

    const numLineTotal =
      numLineSolvedBest + numLineSolvedNormal + numLineNotSolved;

    const numPointTotal =
      numPointSolvedBest + numPointSolvedNormal + numPointNotSolved;

    const numTotalTotal = numLineTotal + numPointTotal;

    {
      const tr = document.createElement('tr');
      tbody.appendChild(tr);

      {
        const th = document.createElement('th');
        const svg = app.svg.createSvg();
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        const crown = app.common.createCrown(size, 0, 0, 1, 1);
        tr.appendChild(th);
        th.appendChild(svg);
        svg.appendChild(crown);
      }
      {
        const td = document.createElement('td');
        td.innerText = numLineSolvedBest;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numPointSolvedBest;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numTotalSolvedBest;
        tr.appendChild(td);
        td.classList.add('total-col');
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
        const crown = app.common.createCrown(size, 0, 0, 1, 0);
        tr.appendChild(th);
        th.appendChild(svg);
        svg.appendChild(crown);
      }
      {
        const td = document.createElement('td');
        td.innerText = numLineSolvedNormal;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numPointSolvedNormal;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numTotalSolvedNormal;
        tr.appendChild(td);
        td.classList.add('total-col');
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
        const crown = app.common.createCrown(size, 0, 0, null, 1);
        tr.appendChild(th);
        th.appendChild(svg);
        svg.appendChild(crown);
      }
      {
        const td = document.createElement('td');
        td.innerText = numLineNotSolved;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numPointNotSolved;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numTotalNotSolved;
        tr.appendChild(td);
        td.classList.add('total-col');
      }
    }
    {
      const tr = document.createElement('tr');
      tbody.appendChild(tr);
      {
        const th = document.createElement('th');
        tr.appendChild(th);
        th.innerText = 'Total';
        th.classList.add('total-row');
      }
      {
        const td = document.createElement('td');
        td.innerText = numLineTotal;
        tr.appendChild(td);
        td.classList.add('total-row');
      }
      {
        const td = document.createElement('td');
        td.innerText = numPointTotal;
        tr.appendChild(td);
        td.classList.add('total-row');
      }
      {
        const td = document.createElement('td');
        td.innerText = numTotalTotal;
        tr.appendChild(td);
        td.classList.add('total-row');
        td.classList.add('total-col');
      }
    }

    return tbody;
  }

  function closeRecordsDialog() {
    elems.records.dialog.close();
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.dialog = dialog;
  }
})();
