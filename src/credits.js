(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const app = window.app;
  const elems = app.elems.credits;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer;

  app.dialog.credits = { init };

  function init() {
    elems.button.addEventListener('click', (event) => {
      app.sound.playUiOpen();
      elems.button.focus({ preventScroll: true });
      elems.dialog.showModal();
      play(event.detail > 0);
    });
    elems.replay.addEventListener('click', (event) => {
      app.sound.playButton();
      play(event.detail > 0);
    });
    elems.dialog.addEventListener('click', (event) => {
      if (event.target !== elems.dialog && event.target !== elems.close) return;
      if (event.target === elems.close && event.detail === 0) return;
      event.preventDefault();
      elems.dialog.close();
      if (event.detail > 0) app.elems.help.dialog.focus({ preventScroll: true });
    });
    elems.dialog.addEventListener('close', () => {
      if (elems.dialog.open) return;
      clearTimeout(timer);
      elems.board.replaceChildren();
      app.sound.playUiClose();
    });
    reducedMotion.addEventListener('change', () => {
      if (elems.dialog.open) play();
    });
  }

  function play(fromPointer = false) {
    clearTimeout(timer);
    elems.board.replaceChildren();
    showCaption();
    if (fromPointer) {
      elems.dialog.focus({ preventScroll: true });
    } else if (document.activeElement === elems.replay) {
      elems.close.focus();
    }
    elems.replay.hidden = true;
    elems.byline.hidden = !reducedMotion.matches;
    if (reducedMotion.matches) return;

    const sequence = choreography();
    function advance() {
      if (!elems.dialog.open) return;
      const { value: delay, done } = sequence.next();
      if (!done) timer = setTimeout(advance, delay);
    }
    advance();
  }

  function showCaption(modeName = null) {
    for (const label of elems.caption.children) {
      label.hidden = label.dataset.mode !== modeName;
    }
  }

  function* choreography() {
    const board = elems.board;
    const blockSize = 32;
    const level = new app.Level({ levelObj: { w: 6, h: 5, s: '-s1102-001' } });
    const { LINE, POINT, SPECIAL } = app.Level.CHECK_MODE;
    const scenes = [
      { mode: LINE, moves: '1' },
      { mode: POINT, moves: '01112' },
      { mode: SPECIAL, moves: '21233230' },
    ];
    const dxs = [0, 1, 0, -1];
    const dys = [-1, 0, 1, 0];

    board.setAttribute('viewBox', `0 ${-blockSize} ${level.getW() * blockSize} ${level.getH() * blockSize}`);
    draw();
    yield 450;
    for (const { mode, moves } of scenes) {
      showCaption();
      level.setCheckMode(mode);
      yield* walk(moves);
      showCaption(app.Level.getCheckModeStr(mode));
      yield 900;
    }

    yield* walk('110');
    draw();
    app.BoardRenderer.addPlayerSmile(board.querySelector('.player-eye'), blockSize);
    elems.byline.hidden = false;
    elems.replay.hidden = false;

    function draw() {
      board.replaceChildren(
        level.createSvgG({ blockSize, x0: 1, y0: 1, width: level.getW(), height: level.getH(), drawBackground: false })
      );
    }

    function* walk(moves) {
      for (const dir of moves) {
        const dx = dxs[dir];
        const dy = dys[dir];
        level.move(dx, dy);
        board.style.setProperty('--animation-move-transform', `translate(${-dx * blockSize}px, ${-dy * blockSize}px)`);
        draw();
        yield app.common.MOVE_INTERVAL_MSEC * 2;
      }
    }
  }
})();
