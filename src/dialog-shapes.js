(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);
  console.assert(app?.common !== undefined);
  console.assert(app?.savedata !== undefined);

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
  const common = app.common;

  const shapeSelectId = 'shapes-select-id';

  const SELECT_NUM_PER_PAGE = 10;
  const SELECT_HEIGHT = 125;
  const SELECT_WIDTH = 90;
  const SELECT_COLS = 5;

  function show() {
    updateDialog();
    window.sound.playUiOpen();
    elems.shapes.dialog.showModal();
  }

  function update() {
    const page = Number(elems.shapes.dialog.dataset.page);
    updateDialog(page);
  }

  function prevPage() {
    if (common.isShownElem(elems.shapes.prev)) {
      window.sound.playButton();
      elems.shapes.dialog.dataset.selectCount = Number(elems.shapes.dialog.dataset.selectCount) - SELECT_NUM_PER_PAGE;
      const page = Number(elems.shapes.dialog.dataset.page) - 1;
      updateDialog(page);
    }
  }

  function nextPage() {
    if (common.isShownElem(elems.shapes.next)) {
      window.sound.playButton();
      elems.shapes.dialog.dataset.selectCount = Number(elems.shapes.dialog.dataset.selectCount) + SELECT_NUM_PER_PAGE;
      const page = Number(elems.shapes.dialog.dataset.page) + 1;
      updateDialog(page);
    }
  }

  function selectUpdate(selectCount) {
    if (common.isTouchDevice()) {
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
    const y = Math.floor((selectCount % SELECT_NUM_PER_PAGE) / SELECT_COLS) * SELECT_HEIGHT;
    g.setAttribute('transform', `translate(${x},${y})`);
  }

  function selectUp() {
    const selectCount = Number(elems.shapes.dialog.dataset.selectCount) - SELECT_COLS;
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
    const selectCount = Number(elems.shapes.dialog.dataset.selectCount) + SELECT_COLS;
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
    const r = JSON.parse(elems.shapes.dialog.dataset.selectR)[selectCount];
    selectShape(r);
    elems.shapes.dialog.close(false);
  }

  function updateDialog(page_ = null) {
    let page = page_;
    window.getSelection().removeAllRanges();

    elems.shapes.dialogSvg.innerHTML = '';

    const shapesObj = app.savedata.getShapesObj(common.level);
    const shapeStrs = Object.keys(shapesObj).sort((a, b) => shapesObj[a].length - shapesObj[b].length);
    const totalNum = shapeStrs.length;
    elems.shapes.dialog.dataset.maxCount = totalNum - 1;
    elems.shapes.dialog.dataset.selectCount = 0;

    if (page === null) {
      page = 0;
    }
    elems.shapes.dialog.dataset.page = page;

    let count = 0;
    const selectR = {};
    const levelShapes = common.level.getLevelObj().shapes;
    const iEnd = levelShapes ?? shapeStrs.length;
    elems.shapes.dialogSvg.style.width = `${Math.min(iEnd, SELECT_COLS) * SELECT_WIDTH + 2}px`;
    elems.shapes.dialogSvg.style.height = `${Math.min(Math.floor((iEnd + SELECT_COLS - 1) / SELECT_COLS), 2) * SELECT_HEIGHT + 2}px`;
    const dialogTop = iEnd > SELECT_COLS ? 130 : 240;
    elems.shapes.dialog.style.marginTop = `${dialogTop}px`;

    let prevHide = false;

    // ←
    if (page === 0) {
      common.hideElem(elems.shapes.prev);
      prevHide = true;
    } else {
      common.showElem(elems.shapes.prev);
    }

    common.showElem(elems.shapes.buttonSvg);

    // →
    if (page + 1 === Math.floor((iEnd + SELECT_NUM_PER_PAGE - 1) / SELECT_NUM_PER_PAGE)) {
      common.hideElem(elems.shapes.next);
      if (prevHide) {
        common.hideElem(elems.shapes.buttonSvg);
      }
    } else {
      common.showElem(elems.shapes.next);
    }

    for (let i = 0; i < iEnd; ++i) {
      if (page * SELECT_NUM_PER_PAGE <= count && count < (page + 1) * SELECT_NUM_PER_PAGE) {
        if (i < shapeStrs.length) {
          const shapeStr = shapeStrs[i];
          const r = shapesObj[shapeStr];
          appendShape({ shapeStr, r });
          selectR[count] = r;
        } else {
          appendShape();
        }
      }
      count++;
    }
    elems.shapes.dialog.dataset.selectR = JSON.stringify(selectR);

    // 選択枠
    if (!common.isTouchDevice()) {
      if (Number(elems.shapes.dialog.dataset.selectCount) > Number(elems.shapes.dialog.dataset.maxCount)) {
        elems.shapes.dialog.dataset.selectCount = Number(elems.shapes.dialog.dataset.maxCount);
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
      const y = Math.floor((selectCount % SELECT_NUM_PER_PAGE) / SELECT_COLS) * SELECT_HEIGHT;
      g.setAttribute('id', shapeSelectId);
      g.setAttribute('transform', `translate(${x},${y})`);
    }

    function appendShape({ shapeStr = null, r } = {}) {
      const g = app.svg.createG();
      elems.shapes.dialogSvg.appendChild(g);

      {
        // 背景
        const fill = '#ffffff';
        const stroke = '#ffbb77';
        const rect = app.svg.createRect(1, {
          x: 0,
          y: 0,
          width: SELECT_WIDTH,
          height: SELECT_HEIGHT,
          fill,
          stroke,
        });
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        g.appendChild(rect);
      }

      if (shapeStr !== null) {
        const checkMode = common.checkMode;
        const { w, h } = getSizeOfShapeStr(shapeStr);
        const level = new app.Level({
          levelObj: { w, h, s: shapeStr },
          checkMode,
        });
        const yMargin = 16;
        const blockSize = Math.min((SELECT_WIDTH - 8) / w, (SELECT_HEIGHT - yMargin - 8) / h, (SELECT_HEIGHT - yMargin - 8) / 5);
        const levelSvgG = level.createSvgG({
          blockSize,
          drawBackground: false,
          x0: 1,
          y0: 1,
          width: w,
          height: h,
        });

        {
          const dx = (SELECT_WIDTH - blockSize * w) / 2;
          const dy = yMargin + (SELECT_HEIGHT - yMargin - blockSize * h) / 2;
          levelSvgG.setAttribute('transform', `translate(${dx},${dy})`);
        }
        g.appendChild(levelSvgG);

        // 手数情報
        {
          const text = app.svg.createText(1, {
            x: SELECT_WIDTH / 2,
            y: 12,
            text: '',
            fill: 'black',
          });
          text.classList.add('translatable-toggle');
          text.dataset.ja = `${r.length}手`;
          text.dataset.en = `${r.length} step${r.length === 1 ? '' : 's'}`; // 0 steps, 1 step, 2 steps, ......
          common.applyLang(text, app.savedata.getLang());
          text.setAttribute('font-size', '14px');
          g.appendChild(text);
        }

        // クリック時の処理
        {
          g.dataset.r = r;
          g.classList.add('shape-select');
          g.classList.add('button', 'active-hover');
          g.addEventListener('click', function () {
            selectShape(g.dataset.r);
            close(false);
          });
        }
      } else {
        const text = app.svg.createText(1, {
          x: SELECT_WIDTH / 2,
          y: SELECT_HEIGHT / 2 + 4,
          text: '?',
          fill: '#ff7700',
        });
        text.setAttribute('font-size', '32px');
        g.appendChild(text);
      }

      {
        const x = (count % SELECT_COLS) * SELECT_WIDTH + 1;
        const y = Math.floor((count % SELECT_NUM_PER_PAGE) / SELECT_COLS) * SELECT_HEIGHT + 1;
        g.setAttribute('transform', `translate(${x},${y})`);
      }
    }
  }

  function selectShape(r) {
    window.retryAndExecReplayStr(r);
  }

  function getSizeOfShapeStr(shapeStr) {
    const shapeStrLines = shapeStr.split('-');
    const w = Math.max(...shapeStrLines.map((x) => x.length));
    const h = shapeStrLines.length;
    return { w, h };
  }

  function close(sound = true) {
    if (sound) {
      window.sound.playUiClose();
    }
    elems.shapes.dialog.close();
  }
})();
