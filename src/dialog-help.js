(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);

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
