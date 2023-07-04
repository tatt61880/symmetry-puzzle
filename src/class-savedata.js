(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const LOCAL_STORAGE_KEY = 'tatt61880-symmetry-puzzle';

  class Savedata {
    constructor() {
      this.data = null;
      this.#load();
    }

    #load() {
      this.data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
      if (this.data?.steps === undefined) {
        this.data = {};
        this.data.steps = {};
      }
    }

    #save() {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.data));
    }

    saveLang(lang) {
      this.data.lang = lang;
      this.#save();
    }

    loadLang() {
      return this.data.lang;
    }

    saveSteps(levelObj, isLineMode, r_) {
      let r = r_;
      const maxStep = 9999;
      const step = r.length;
      if (step > maxStep) {
        r = r.substring(0, maxStep);
      }
      const key = this.#getLevelKey(levelObj, isLineMode);
      const highestScoreR = this.data.steps[key];
      if (highestScoreR === undefined || step < highestScoreR.length) {
        this.data.steps[key] = r;
        this.#save();
      }
    }

    getHighestScore(levelObj, isLineMode) {
      const key = this.#getLevelKey(levelObj, isLineMode);
      const r = this.data.steps[key];
      return r === undefined ? null : r.length;
    }

    #getLevelKey(levelObj, isLineMode) {
      if (isLineMode) {
        return `w=${levelObj.w}&h=${levelObj.h}&s=${levelObj.s}&line`;
      } else {
        return `w=${levelObj.w}&h=${levelObj.h}&s=${levelObj.s}`;
      }
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Savedata = Savedata;
  }
})();
