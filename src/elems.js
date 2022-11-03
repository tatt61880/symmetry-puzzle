(function() {
  'use strict';
  window.showkoban = window.showkoban || {};
  window.showkoban.elems = {};

  const elemIds = {
    versionInfo: 'version-info',

    resetLevel: 'button-reset-level',
    levelPrev: 'level-prev',
    levelId: 'level-id',
    levelNext: 'level-next',
    editLevel: 'button-edit-level',

    svg: 'svg-main',
    editbox: 'editbox',
    editShape: 'edit-drawing-shape',
    editState: 'edit-drawing-state',
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
