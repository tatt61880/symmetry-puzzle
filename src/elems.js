(function() {
  'use strict';
  window.showkoban = window.showkoban || {};
  window.showkoban.elems = {};

  const elemIds = {
    version: 'version',
    help: 'button-help',
    helpDialog: 'dialog-help',
    langEn: 'setting-lang-en',
    langJa: 'setting-lang-ja',

    levelReset: 'button-level-reset',

    levelPrev: 'button-level-prev',
    levelId: 'level-id',
    levelNext: 'button-level-next',

    levelEdit: 'button-level-edit',

    levels: 'button-levels',
    levelsDialog: 'dialog-levels',
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

    undo: 'button-undo',
    stick: 'stick',
    stickBase: 'stick-base',
  };

  window.showkoban.initElems = () => {
    for (const elemName in elemIds) {
      const elem = document.getElementById(elemIds[elemName]);
      if (elem === null) {
        console.error(`Elem not exist. [id=${elemIds[elemName]}]`);
      }
      window.showkoban.elems[elemName] = elem;
    }
    Object.freeze(window.showkoban.elems);
  };
})();
