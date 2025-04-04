(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  class UndoInfo {
    #undoIdx;
    #undoMaxIdx;

    constructor() {
      this.undoArray = [];
      this.#undoIdx = -1;
      this.#undoMaxIdx = -1;
    }

    pushData(data) {
      this.undoArray[++this.#undoIdx] = data;
      this.#undoMaxIdx = this.#undoIdx;
    }

    isUndoable() {
      return this.#undoIdx > 0;
    }

    isRedoable() {
      return this.#undoIdx < this.#undoMaxIdx;
    }

    undoAll() {
      this.#undoIdx = 0;
      return this.undoArray[this.#undoIdx];
    }

    undo() {
      if (this.isUndoable()) {
        return this.undoArray[--this.#undoIdx];
      }
    }

    redo() {
      if (this.isRedoable()) {
        return this.undoArray[++this.#undoIdx];
      }
    }

    getIndex() {
      return this.#undoIdx;
    }

    getTopData() {
      return this.undoArray[this.getIndex()];
    }

    getReplayStr() {
      let replayStr = '';
      for (let i = 1; i <= this.#undoIdx; ++i) {
        if (this.undoArray[i].dir === null) return null;
        replayStr += this.undoArray[i].dir;
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
