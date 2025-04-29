(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);
  console.assert(app?.common !== undefined);

  window.app = window.app || {};
  window.app.dialog = window.app.dialog || {};
  window.app.dialog.menu = {
    show,
    close,
  };

  const elems = app.elems;

  function show() {
    elems.menu.dialog.showModal();
  }

  function close() {
    elems.menu.dialog.close();
  }
})();
