(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);
  console.assert(app?.common !== undefined);

  window.app = window.app || {};
  window.app.dialog = window.app.dialog || {};
  window.app.dialog.help = {
    toggle,
    show,
    close,
  };

  const elems = app.elems;

  function toggle() {
    if (!elems.help.dialog.open) {
      show();
    } else {
      close();
    }
  }

  function show() {
    {
      const setBlock = (elem, char, w, checkMode) => {
        elem.textContent = '';

        const level = new app.Level({
          levelObj: { w, h: 1, s: char.repeat(w) },
          checkMode,
        });

        const blockSize = 30;
        const g = level.createSvgG({
          blockSize,
          drawBackground: false,
          x0: 1,
          y0: 1,
          width: w,
          height: 1,
        });
        elem.setAttribute('width', blockSize * w);
        elem.setAttribute('height', blockSize);
        elem.appendChild(g);
      };

      for (const elem of document.getElementsByClassName('user-block-line')) {
        setBlock(elem, 's', 1, app.Level.CHECK_MODE.LINE);
      }
      for (const elem of document.getElementsByClassName('user-block-point')) {
        setBlock(elem, 's', 1, app.Level.CHECK_MODE.POINT);
      }
      for (const elem of document.getElementsByClassName(
        'user-block-special'
      )) {
        setBlock(elem, 's', 1, app.Level.CHECK_MODE.SPECIAL);
      }
      for (const elem of document.getElementsByClassName('target-block')) {
        setBlock(elem, '1', 1);
      }
    }

    switch (app.common.checkMode) {
      case app.Level.CHECK_MODE.LINE:
        elems.help.tabLine.checked = true;
        break;
      case app.Level.CHECK_MODE.POINT:
        elems.help.tabPoint.checked = true;
        break;
      case app.Level.CHECK_MODE.SPECIAL:
        elems.help.tabSpecial.checked = true;
        break;
      default:
        elems.help.tabApp.checked = true;
    }

    elems.help.dialog.showModal();
  }

  function close() {
    elems.help.dialog.close();
  }
})();
