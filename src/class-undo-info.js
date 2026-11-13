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

    // 手動操作で別の経路を通った場合も、解答手順と一致する履歴だけを使います。
    seekReplayPrefix(replay, target) {
      let index = 0;
      const end = Math.min(target, this.#undoMaxIdx);
      // 手動入力の文字列とオート再生の数値を、同じ移動方向として比較します。
      while (index < end && String(this.undoArray[index + 1].dir) === replay[index]) index++;
      this.#undoIdx = index;
      return this.getTopData();
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
