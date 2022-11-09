(function() {
  'use strict';
  window.showkoban = window.showkoban || {};

  const LOCAL_STORAGE_KEY = 'tatt61880-showkoban';

  window.showkoban.savedata = () => {
    return new Savedata();
  };

  class Savedata {
    constructor() {
      this.data = null;
      this.#load();
    }

    #load() {
      this.data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
      if (this.data === null) {
        this.data = {};
      }
    }

    save(w, h, s, r) {
      const maxStep = 999;
      const step = r.length;
      if (step > maxStep) {
        r = r.substring(0, maxStep);
      }
      const key = this.#getLevelKey(w, h, s);
      const highestScoreR = this.data[key];
      if (highestScoreR === undefined || step < highestScoreR.length) {
        this.data[key] = r;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.data));
      }
    }

    getHighestScore(w, h, s) {
      const key = this.#getLevelKey(w, h, s);
      const r = this.data[key];
      return r === undefined ? null : r.length;
    }

    #getLevelKey(w, h, s) {
      return `w=${w}&h=${h}&s=${s}`;
    }
  }
})();
