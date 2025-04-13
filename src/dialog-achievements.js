(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);
  console.assert(app?.common !== undefined);

  window.app = window.app || {};
  window.app.dialog = window.app.dialog || {};
  window.app.dialog.achievements = {
    show,
    close,
  };

  const elems = app.elems;

  function show() {
    updateTable();
    elems.achievements.dialog.showModal();
  }

  function updateTable() {}

  function close() {
    elems.achievements.dialog.close();
  }
})();
