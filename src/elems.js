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
    iconReflection: 'icon-reflection',
    version: 'version',

    help: {
      button: 'button-help',
      dialog: 'dialog-help',
      close: 'dialog-help-close',
      dialogDiv: 'dialog-help-div',
      langEn: 'setting-lang-en',
      langJa: 'setting-lang-ja',
    },

    category: {
      title: 'title',
      game: 'game',
    },

    title: {
      buttonPlayPoint: 'button-play-point',
      buttonPlayReflection: 'button-play-reflection',
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
      hideCompletedLevels: 'hide-completed-levels',
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
      buttonSpeedDown: 'button-speed-down',
      buttonSpeedUp: 'button-speed-up',
    },

    edit: {
      editbox: 'editbox',
      editShape: 'edit-drawing-shape',
      editState: 'edit-drawing-state',
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
      stickThickness: 'stick-thickness',
      stickOuter: 'stick-outer',
      stickOuter2: 'stick-outer2',
      stickMiddle: 'stick-middle',
      stickMiddle2: 'stick-middle2',
      stickInner: 'stick-inner',
      stickInner2: 'stick-inner2',
      stickBase: 'stick-base',
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
