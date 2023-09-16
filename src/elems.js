(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  if (isBrowser) {
    app = window.app;
    if (app?.Elems === undefined) console.error('app.Elems is undefined.');
  }

  const elems = new app.Elems({
    viewport: 'viewport',
    top: 'top',
    icon: 'icon',
    iconPoint: 'icon-point',
    iconLine: 'icon-line',
    version: 'version',

    help: {
      button: 'button-help',
      dialog: 'dialog-help',
      close: 'dialog-help-close',
      dialogDiv: 'dialog-help-div',
      langEn: 'setting-lang-en',
      langJa: 'setting-lang-ja',
      tabPoint: 'help-tab-point',
      tabLine: 'help-tab-line',
    },

    records: {
      button: 'button-records',
      dialog: 'dialog-records',
      close: 'dialog-records-close',
      dialogDiv: 'dialog-records-div',
      tableDiv: 'records-table-div',
    },

    category: {
      title: 'title',
      game: 'game',
    },

    title: {
      buttonPlayPoint: 'button-play-point',
      buttonPlayLine: 'button-play-line',
      // buttonEdit: 'button-edit',
    },

    level: {
      widget: 'level-widget',
      reset: 'button-level-reset',
      prev: 'button-level-prev',
      id: 'level-id',
      next: 'button-level-next',
      edit: 'button-level-edit',
    },

    levels: {
      button: 'button-levels',
      dialog: 'dialog-levels',
      // hideClearedLevels: 'hide-cleared-levels',
      hideShortestLevels: 'hide-shortest-levels',
      dialogDiv: 'dialog-levels-div',
      dialogSvg: 'dialog-levels-svg',
    },

    main: {
      div: 'main',
      svg: 'svg-main',
    },

    auto: {
      buttons: 'buttons-auto',
      buttonStop: 'button-stop',
      buttonStart: 'button-start',
      buttonPause: 'button-pause',
      buttonEnd: 'button-end',
      buttonSpeedDown: 'button-speed-down',
      buttonSpeedUp: 'button-speed-up',
    },

    edit: {
      editbox: 'editbox',
      editShape: 'edit-drawing-shape',
      wDec: 'w-dec',
      wInc: 'w-inc',
      hDec: 'h-dec',
      hInc: 'h-inc',
      normalize: 'edit-normalize',
      rotate: 'edit-rotate',
      mirror: 'edit-mirror',
      switchMode: 'edit-switch-mode',
    },

    url: 'url',

    controller: {
      widget: 'controller-widget',
      undo: 'button-undo',
      nextLevel: 'next-level',

      stick: {
        base: 'stick-base',
        thickness: 'stick-thickness',
        outer: 'stick-outer',
        outer2: 'stick-outer2',
        middle: 'stick-middle',
        middle2: 'stick-middle2',
        inner: 'stick-inner',
        inner2: 'stick-inner2',
      },
    },

    console: {
      widget: 'console-widget',
      image: 'console-image',
      log: 'console-log',
    },
  });

  if (isBrowser) {
    window.app = window.app || {};
    window.app.elems = elems;
  }
})();
