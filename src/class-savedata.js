(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  if (window.app?.savedata) return;

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

    saveSteps(levelObj, checkMode, r_) {
      let r = r_;
      const maxStep = 9999;
      const step = r.length;
      if (step > maxStep) {
        r = r.substring(0, maxStep);
      }
      const key = this.#getLevelKey(levelObj, checkMode);
      const highestScoreR = this.data.steps[key];
      if (highestScoreR === undefined || step < highestScoreR.length) {
        this.data.steps[key] = r;
        this.#save();
      }
    }

    getHighestScore(levelObj, checkMode) {
      const key = this.#getLevelKey(levelObj, checkMode);
      const r = this.data.steps[key];
      return r === undefined ? null : r.length;
    }

    #getLevelKey(levelObj, checkMode) {
      if (checkMode === window.app.Level.CHECK_MODE.LINE) {
        return `w=${levelObj.w}&h=${levelObj.h}&s=${levelObj.s}&line`;
      } else if (checkMode === window.app.Level.CHECK_MODE.SPECIAL) {
        return `w=${levelObj.w}&h=${levelObj.h}&s=${levelObj.s}&special`;
      } else {
        return `w=${levelObj.w}&h=${levelObj.h}&s=${levelObj.s}`;
      }
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    const savedata = new Savedata();
    window.app.savedata = savedata;
  }
})();
