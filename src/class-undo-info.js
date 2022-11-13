(function() {
  'use strict';

  if (typeof window !== 'undefined') {
    window.showkoban = window.showkoban || {};
    window.showkoban.UndoInfo = undoinfo;
  }

  function undoinfo() {
    return new UndoInfo();
  }

  class UndoInfo {
    constructor() {
      this.undoArray = [];
      this.undoIdx = 0;
    }
    pushData(data) {
      this.undoArray[this.undoIdx++] = data;
    }
    isUndoable() {
      return this.undoIdx !== 0;
    }
    undo() {
      return this.undoArray[--this.undoIdx];
    }
    getIndex() {
      return this.undoIdx;
    }
    getReplayStr() {
      let replayStr = '';
      for (let i = 0; i < this.undoIdx; ++i) {
        if (this.undoArray[i].dir !== null) {
          replayStr += this.undoArray[i].dir;
        }
      }
      return replayStr;
    }
  }
})();
