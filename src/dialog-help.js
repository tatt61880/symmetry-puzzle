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
      const addBlock = (elem, char, w) => {
        const levelForEditChar = new app.Level(
          { w, h: 1, s: char.repeat(w) },
          app.Level.CHECK_MODE.POINT,
          {}
        );
        const blockSize = 30;

        const g = levelForEditChar.createSvgG({
          blockSize,
          x0: 1,
          y0: 1,
          width: w,
          height: 1,
        });
        elem.appendChild(g);
        elem.setAttribute('width', blockSize * w);
        elem.setAttribute('height', blockSize);
      };

      for (const elem of document.getElementsByClassName('blue-block')) {
        addBlock(elem, 's', 1);
      }
      for (const elem of document.getElementsByClassName('orange-block')) {
        addBlock(elem, '1', 2);
      }
    }

    if (app.common.checkMode === app.Level.CHECK_MODE.POINT) {
      elems.help.tabPoint.checked = true;
    } else if (app.common.checkMode === app.Level.CHECK_MODE.LINE) {
      elems.help.tabLine.checked = true;
    } else {
      elems.help.tabSymmetry.checked = true;
    }

    elems.help.dialog.showModal();
  }

  function close() {
    elems.help.dialog.close();
  }
})();
