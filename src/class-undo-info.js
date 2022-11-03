(function() {
  'use strict';
  window.showkoban = window.showkoban || {};

  window.showkoban.UndoInfo = () => {
    return new class {
      constructor() {
        this.undoArray = [];
        this.undoIdx = 0;
      }
      pushData(data) {
        this.undoArray[this.undoIdx++] = data;
      }
      isUndoable() {
        return this.undoIdx != 0;
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
          replayStr += this.undoArray[i].dir;
        }
        return replayStr;
      }
    };
  };
})();
