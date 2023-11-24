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
      const setBlock = (elem, char, w) => {
        const level = new app.Level({
          levelObj: { w, h: 1, s: char.repeat(w) },
        });

        const blockSize = 30;
        const g = level.createSvgG({
          blockSize,
          x0: 1,
          y0: 1,
          width: w,
          height: 1,
        });
        elem.setAttribute('width', blockSize * w);
        elem.setAttribute('height', blockSize);
        elem.appendChild(g);
      };

      for (const elem of document.getElementsByClassName('blue-block')) {
        setBlock(elem, 's', 1);
      }
      for (const elem of document.getElementsByClassName('orange-block')) {
        setBlock(elem, '1', 2);
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
