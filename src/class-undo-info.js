(function () {
  'use strict';

  class UndoInfo {
    #elemUndoButton;
    #undoIdx;

    constructor(elemUndoButton) {
      this.#elemUndoButton = elemUndoButton;
      this.undoArray = [];
      this.#undoIdx = 0;
      hideElem(this.#elemUndoButton);
    }

    pushData(data) {
      showElem(this.#elemUndoButton);
      this.undoArray[this.#undoIdx++] = data;
    }

    isUndoable() {
      return this.#undoIdx !== 0;
    }

    undo() {
      this.#undoIdx--;
      if (this.#undoIdx === 0) {
        hideElem(this.#elemUndoButton);
      }
      return this.undoArray[this.#undoIdx];
    }

    getIndex() {
      return this.#undoIdx;
    }

    getReplayStr() {
      let replayStr = '';
      for (let i = 0; i < this.#undoIdx; ++i) {
        if (this.undoArray[i].dir !== null) {
          replayStr += this.undoArray[i].dir;
        }
      }
      return replayStr;
    }
  }

  function showElem(elem) {
    if (elem === undefined) return;
    elem.classList.remove('hide');
  }

  function hideElem(elem) {
    if (elem === undefined) return;
    elem.classList.add('hide');
  }

  if (typeof window !== 'undefined') {
    window.app = window.app || {};
    window.app.UndoInfo = UndoInfo;
  } else {
    module.exports = UndoInfo;
  }
})();
