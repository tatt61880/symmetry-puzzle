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
    animateDiscovery,
    finishDiscovery,
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

  let settleDiscovery = null;

  function show() {
    finishDiscovery();
    updateDialog();
    app.sound.playUiOpen();
    elems.shapes.dialog.showModal();
  }

  function update() {
    const page = Number(elems.shapes.dialog.dataset.page);
    updateDialog(page);
  }

  function prevPage() {
    if (common.isShownElem(elems.shapes.prev)) {
      app.sound.playButton();
      elems.shapes.dialog.dataset.selectCount = Number(elems.shapes.dialog.dataset.selectCount) - SELECT_NUM_PER_PAGE;
      const page = Number(elems.shapes.dialog.dataset.page) - 1;
      updateDialog(page);
    }
  }

  function nextPage() {
    if (common.isShownElem(elems.shapes.next)) {
      app.sound.playButton();
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
    if (r !== undefined) selectShape(r);
  }

  function updateDialog(page_ = null) {
    let page = page_;
    window.getSelection().removeAllRanges();

    elems.shapes.dialogSvg.innerHTML = '';

    const records = app.savedata.getShapeRecords(common.level, common.levelNum).sort((a, b) => a.steps - b.steps);
    const totalNum = records.length;
    elems.shapes.dialog.dataset.maxCount = totalNum - 1;
    if (page === null) {
      page = 0;
      elems.shapes.dialog.dataset.selectCount = 0;
    }
    elems.shapes.dialog.dataset.page = page;

    let count = 0;
    const selectR = {};
    const levelShapes = common.level.getLevelObj().shapes;
    const iEnd = levelShapes ?? totalNum;
    elems.shapes.dialogSvg.style.width = `${Math.min(iEnd, SELECT_COLS) * SELECT_WIDTH + 2}px`;
    elems.shapes.dialogSvg.style.height = `${Math.min(Math.floor((iEnd + SELECT_COLS - 1) / SELECT_COLS), 2) * SELECT_HEIGHT + 2}px`;

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
        const record = records[i];
        appendShape(record);
        if (record?.replay !== undefined) selectR[count] = record.replay;
      }
      count++;
    }
    elems.shapes.dialog.dataset.selectR = JSON.stringify(selectR);

    // 選択枠
    if (!common.isTouchDevice()) {
      const selectCount = Math.max(page * SELECT_NUM_PER_PAGE, Math.min(Number(elems.shapes.dialog.dataset.selectCount), totalNum - 1));
      elems.shapes.dialog.dataset.selectCount = selectCount;
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

    function appendShape({ shapeStr = null, steps, replay } = {}) {
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
        const { w, h } = getSizeOfShapeStr(shapeStr);
        const yMargin = 16;
        const shapeHeight = SELECT_HEIGHT - yMargin - (replay === undefined ? 20 : 0);
        const blockSize = Math.min((SELECT_WIDTH - 8) / w, (shapeHeight - 8) / h, (SELECT_HEIGHT - yMargin - 8) / 5);
        const levelSvgG = createSilhouette(shapeStr, w, h, blockSize);

        {
          const dx = (SELECT_WIDTH - blockSize * w) / 2;
          const dy = yMargin + (shapeHeight - blockSize * h) / 2;
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
          text.dataset.ja = `${steps}手`;
          text.dataset.en = `${steps} step${steps === 1 ? '' : 's'}`; // 0 steps, 1 step, 2 steps, ......
          common.applyLang(text, app.savedata.getLang());
          text.setAttribute('font-size', '14px');
          g.appendChild(text);
        }

        if (replay === undefined) {
          const note = app.svg.createText(1, { x: SELECT_WIDTH / 2, y: SELECT_HEIGHT - 6, text: '', fill: '#555555' });
          note.setAttribute('font-size', '13px');
          note.classList.add('translatable-toggle');
          note.dataset.ja = '手順なし';
          note.dataset.en = 'No replay';
          common.applyLang(note, app.savedata.getLang());
          g.appendChild(note);
        } else {
          g.classList.add('shape-select', 'button', 'active-hover');
          g.addEventListener('click', () => selectShape(replay));
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
    close(false);
  }

  function getSizeOfShapeStr(shapeStr) {
    const shapeStrLines = shapeStr.split('-');
    const w = Math.max(...shapeStrLines.map((x) => x.length));
    const h = shapeStrLines.length;
    return { w, h };
  }

  function createSilhouette(shapeStr, w, h, blockSize) {
    const level = new app.Level({ levelObj: { w, h, s: shapeStr }, checkMode: common.checkMode });
    return level.createSvgG({ blockSize, drawBackground: false, x0: 1, y0: 1, width: w, height: h });
  }

  function finishDiscovery() {
    settleDiscovery?.();
    elems.shapes.buttonNumerator.classList.remove('shape-count-bounce');
  }

  function animateDiscovery(shapeStr, blockSize, boardPoint, delay, onArrival) {
    finishDiscovery();
    if (elems.shapes.dialog.open) {
      update();
      return false;
    }
    const button = elems.shapes.button.getBoundingClientRect();
    if (!button.width || !blockSize || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

    const boardMatrix = elems.main.svg.getScreenCTM();
    if (!boardMatrix) return false;
    const start = boardPoint.matrixTransform(boardMatrix);
    const { w, h } = getSizeOfShapeStr(shapeStr);
    const width = w * blockSize;
    const height = h * blockSize;
    const widget = elems.controller.widget.getBoundingClientRect();
    const svg = app.svg.createSvg();
    svg.classList.add('shape-discovery');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.left = `${start.x - widget.left - width / 2}px`;
    svg.style.top = `${start.y - widget.top - height / 2}px`;
    svg.appendChild(createSilhouette(shapeStr, w, h, blockSize));
    elems.controller.widget.appendChild(svg);

    const dx = button.left + button.width / 2 - start.x;
    const dy = button.top + button.height / 2 - start.y;
    const endScale = Math.min(0.26, (button.width * 0.36) / Math.max(width, height));
    const flight = svg.animate(
      [
        { transform: 'none', opacity: 0 },
        { transform: 'translateY(-16px) scale(0.82)', opacity: 1, offset: 0.25, easing: 'ease-in' },
        { transform: `translate(${dx}px, ${dy}px) scale(${endScale})`, opacity: 0.8 },
      ],
      { delay, duration: 650, fill: 'both' }
    );
    settleDiscovery = () => {
      settleDiscovery = null;
      flight.onfinish = null;
      flight.cancel();
      svg.remove();
      onArrival();
    };
    flight.onfinish = () => {
      finishDiscovery();
      elems.shapes.buttonNumerator.classList.add('shape-count-bounce');
    };
    return true;
  }

  function close(sound = true) {
    if (sound) {
      app.sound.playUiClose();
    }
    elems.shapes.dialog.close();
  }
})();
