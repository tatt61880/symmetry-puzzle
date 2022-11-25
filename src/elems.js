(function() {
  'use strict';

  if (typeof window !== 'undefined') {
    window.showkoban = window.showkoban || {};
    window.showkoban.elems = {};
    window.showkoban.initElems = initElems;
  }

  const elemIds = {
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

    buttonsAuto: 'buttons-auto',
    buttonStop: 'button-stop',
    buttonStart: 'button-start',
    buttonPause: 'button-pause',
    buttonSpeedDown: 'button-speed-down',
    buttonSpeedUp: 'button-speed-up',

    undo: 'button-undo',
    stick: 'stick',
    stickBase: 'stick-base',
  };

  function initElems() {
    for (const elemName in elemIds) {
      const elem = document.getElementById(elemIds[elemName]);
      if (elem === null) {
        console.error(`Elem not exist. [id=${elemIds[elemName]}]`);
      }
      window.showkoban.elems[elemName] = elem;
    }
    Object.freeze(window.showkoban.elems);
  }
})();
