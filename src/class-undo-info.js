(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  class UndoInfo {
    #undoIdx;

    constructor() {
      this.undoArray = [];
      this.#undoIdx = 0;
    }

    pushData(data) {
      this.undoArray[this.#undoIdx++] = data;
    }

    isUndoable() {
      return this.#undoIdx !== 0;
    }

    undo() {
      if (this.isUndoable()) {
        this.#undoIdx--;
        return this.undoArray[this.#undoIdx];
      }
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

  if (isBrowser) {
    window.app = window.app || {};
    window.app.UndoInfo = UndoInfo;
  } else {
    module.exports = UndoInfo;
  }
})();
