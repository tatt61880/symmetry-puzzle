(function() {
  'use strict';

  if (typeof window !== 'undefined') {
    window.showkoban = window.showkoban || {};
    window.showkoban.elems = {};
    window.showkoban.elems.init = init;
  }

  const elems = {
    version: 'version',

    help: 'button-help',
    helpDialog: 'dialog-help',
    helpDialogDiv: 'dialog-help-div',
    langEn: 'setting-lang-en',
    langJa: 'setting-lang-ja',

    levelReset: 'button-level-reset',

    levelPrev: 'button-level-prev',
    levelId: 'level-id',
    levelNext: 'button-level-next',

    levelEdit: 'button-level-edit',

    levels: 'button-levels',
    levelsDialog: 'dialog-levels',
    levelsDialogDiv: 'dialog-levels-div',
    levelsDialogSvg: 'dialog-levels-svg',

    svg: 'svg-main',
    editbox: 'editbox',
    editShape: 'edit-drawing-shape',
    editState: 'edit-drawing-state',
    wInc: 'w-inc',
    wDec: 'w-dec',
    hInc: 'h-inc',
    hDec: 'h-dec',

    url: 'url',

    auto: {
      buttons: 'buttons-auto',
      buttonStop: 'button-stop',
      buttonStart: 'button-start',
      buttonPause: 'button-pause',
      buttonSpeedDown: 'button-speed-down',
      buttonSpeedUp: 'button-speed-up',
    },

    undo: 'button-undo',
    stick: 'stick',
    stickBase: 'stick-base',
  };

  function init() {
    initElems(window.showkoban.elems, elems);
    Object.freeze(window.showkoban.elems);

    function initElems(obj, elems) {
      for (const key in elems) {
        const value = elems[key];
        initElem(obj, key, value);
      }

      function initElem(obj, key, value) {
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
