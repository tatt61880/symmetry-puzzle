(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.Elems !== undefined);

  const elems = new app.Elems({
    viewport: 'viewport',
    header: 'header',
    footer: 'footer',
    top: 'top',
    appTitle: 'app-title',
    iconApp: 'icon-app',
    iconLine: 'icon-line',
    iconPoint: 'icon-point',
    iconSpecial: 'icon-special',
    version: 'version',

    contents: 'contents',

    help: {
      button: 'button-help',
      dialog: 'dialog-help',
      dialogDiv: 'dialog-help-div',

      close: 'dialog-help-close',
      langJa: 'setting-lang-ja',
      langEn: 'setting-lang-en',

      tabApp: 'help-tab-app',
      tabLine: 'help-tab-line',
      tabPoint: 'help-tab-point',
      tabSpecial: 'help-tab-special',
    },

    records: {
      button: 'button-records',
      buttonSvg: 'button-records-svg',
      dialog: 'dialog-records',
      dialogDiv: 'dialog-records-div',
      close: 'dialog-records-close',
      tableDiv: 'records-table-div',
    },

    category: {
      title: 'title',
      game: 'game',
    },

    title: {
      inner1: 'title-inner1',
      buttonPlayLine: 'button-play-line',
      buttonPlayPoint: 'button-play-point',
      buttonPlaySpecial: 'button-play-special',
      // buttonEdit: 'button-edit',
    },

    level: {
      widget: 'level-widget',
      retry: 'button-level-retry',
      prev: 'button-level-prev',
      id: 'level-id',
      next: 'button-level-next',
      edit: 'button-level-edit',
    },

    levels: {
      button: 'button-levels',
      dialog: 'dialog-levels',
      dialogDiv: 'dialog-levels-div',
      close: 'dialog-levels-close',
      crown: {
        shortest: 'crown-shortest-levels',
        cleared: 'crown-cleared-levels',
        notCleared: 'crown-not-cleared-levels',
      },
      checkbox: {
        shortest: 'show-shortest-levels',
        cleared: 'show-cleared-levels',
        notCleared: 'show-not-cleared-levels',
      },
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
      widget: 'edit-widget',
      drawing: 'edit-drawing-shape',
      undo: 'button-undo-edit',
      redo: 'button-redo-edit',
      buttons: {
        axis: 'edit-buttons-axis',
        axisL1: 'edit-buttons-axis-line1',
        axisL2: 'edit-buttons-axis-line2',
        axisL3: 'edit-buttons-axis-line3',
        axisL4: 'edit-buttons-axis-line4',
        axisP1: 'edit-buttons-axis-point1',
        axisP2: 'edit-buttons-axis-point2',
      },

      switchMode: 'edit-switch-mode',
      mirror: 'edit-mirror',
      rotate: 'edit-rotate',
      normalize: 'edit-normalize',
    },

    url: {
      div: 'url-div',
      a: 'url',
    },

    controller: {
      widget: 'controller-widget',
      undo: 'button-undo',
      redo: 'button-redo',
      nextLevel: 'next-level',
      menu: 'controller-menu',

      buttons: {
        root: 'controller-buttons-root',
        base: 'controller-buttons-base',

        up: 'controller-buttons-up',
        right: 'controller-buttons-right',
        down: 'controller-buttons-down',
        left: 'controller-buttons-left',
        axis: 'controller-buttons-axis',

        axisL1: 'controller-buttons-axis-line1',
        axisL2: 'controller-buttons-axis-line2',
        axisL3: 'controller-buttons-axis-line3',
        axisL4: 'controller-buttons-axis-line4',
        axisP1: 'controller-buttons-axis-point1',
        axisP2: 'controller-buttons-axis-point2',

        menu: 'controller-buttons-menu',
        title: 'controller-buttons-title',
        retry: 'controller-buttons-retry',
      },
    },

    console: {
      widget: 'console-widget',
      image: 'console-image',
      log: 'console-log',
    },
  });

  window.app.elems = elems;
})();
