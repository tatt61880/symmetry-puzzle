(function() {
  'use strict';

  if (typeof window !== 'undefined') {
    window.app = window.app || {};
    window.app.elems = {
      init: init,
    };
  }

  const elems = {
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
      reset: 'button-level-reset',
      prev: 'button-level-prev',
      id: 'level-id',
      next: 'button-level-next',
      edit: 'button-level-edit',
    },

    levels: {
      button: 'button-levels',
      dialog: 'dialog-levels',
      dialogDiv: 'dialog-levels-div',
      dialogSvg: 'dialog-levels-svg',
    },

    svg: 'svg-main',
    consoleLog: 'console-log',

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

    undo: 'button-undo',
    stick: 'stick',
    stickBase: 'stick-base',
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
