(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  if (isBrowser) {
    app = window.app;
    console.assert(app?.Elems !== undefined);
  }

  const elems = new app.Elems({
    viewport: 'viewport',
    header: 'header',
    footer: 'footer',
    top: 'top',
    iconApp: 'icon-app',
    iconPoint: 'icon-point',
    iconLine: 'icon-line',
    version: 'version',

    contents: 'contents',

    help: {
      button: 'button-help',
      dialog: 'dialog-help',
      close: 'dialog-help-close',
      dialogDiv: 'dialog-help-div',
      langEn: 'setting-lang-en',
      langJa: 'setting-lang-ja',
      tabSymmetry: 'help-tab-symmetry',
      tabPoint: 'help-tab-point',
      tabLine: 'help-tab-line',
    },

    records: {
      button: 'button-records',
      buttonSvg: 'button-records-svg',
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
      inner1: 'title-inner1',
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
      close: 'dialog-levels-close',
      toggleCrown: 'levels-toggle-crown',
      hideShortestLevels: 'hide-shortest-levels',
      dialogDiv: 'dialog-levels-div',
      dialogSvg: 'dialog-levels-svg',
      buttonSvg: 'button-levels-svg',
      prev: 'button-levels-prev',
      next: 'button-levels-next',
    },

    main: {
      div: 'main-div',
      svg: 'main-svg',
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
      normalize: 'edit-normalize',
      rotate: 'edit-rotate',
      mirror: 'edit-mirror',
      switchMode: 'edit-switch-mode',
    },

    url: {
      div: 'url-div',
      a: 'url',
    },

    controller: {
      widget: 'controller-widget',
      undo: 'button-undo',
      nextLevel: 'next-level',

      buttons: {
        base: 'controller-buttons-base',
        up: 'controller-buttons-up',
        right: 'controller-buttons-right',
        down: 'controller-buttons-down',
        left: 'controller-buttons-left',
      },

      stick: {
        base: 'controller-stick-base',
        thickness: 'controller-stick-thickness',
        outer: 'controller-stick-outer',
        outer2: 'controller-stick-outer2',
        middle: 'controller-stick-middle',
        middle2: 'controller-stick-middle2',
        inner: 'controller-stick-inner',
        inner2: 'controller-stick-inner2',
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
