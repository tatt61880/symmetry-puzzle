(function () {
  'use strict';

  if (typeof window !== 'undefined') {
    window.app = window.app || {};
    window.app.elems = {
      init: init,
    };
  }

  const elems = {
    top: 'top',
    icon: 'icon',
    version: 'version',

    help: {
      button: 'button-help',
      dialog: 'dialog-help',
      dialogDiv: 'dialog-help-div',
      langEn: 'setting-lang-en',
      langJa: 'setting-lang-ja',
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
      hideClearedLevels: 'hide-cleared-levels',
      dialogDiv: 'dialog-levels-div',
      dialogSvg: 'dialog-levels-svg',
    },

    main: {
      div: 'main',
      title: 'title',
      buttonPlay: 'button-play',
      buttonEdit: 'button-edit',
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
    },

    url: 'url',

    controller: {
      widget: 'controller-widget',
      undo: 'button-undo',
      stick: 'stick',
      stickBase: 'stick-base',
    },

    consoleLog: 'console-log',
  };

  function init() {
    initElems(window.app.elems, elems);
    Object.freeze(window.app.elems);

    function initElems(obj, elems) {
      for (const key in elems) {
        const value = elems[key];
        if (typeof value === 'object') {
          obj[key] = {};
          initElems(obj[key], value);
        } else {
          obj[key] = document.getElementById(value);
          if (obj[key] === null) {
            console.error(`Elem not exist. [id=${value}]`);
          }
        }
      }
    }
  }
})();
