(function() {
  'use strict';

  if (typeof window !== 'undefined') {
    window.showkoban = window.showkoban || {};
    window.showkoban.savedata = savedata;
  }

  const LOCAL_STORAGE_KEY = 'tatt61880-showkoban';

  function savedata() {
    return new Savedata();
  }

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
      let lang = this.data.lang;
      if (lang === undefined) {
        lang = 'ja';
        this.saveLang(lang);
      }
      return lang;
    }

    saveSteps(levelObj, r) {
      const maxStep = 999;
      const step = r.length;
      if (step > maxStep) {
        r = r.substring(0, maxStep);
      }
      const key = this.#getLevelKey(levelObj);
      const highestScoreR = this.data.steps[key];
      if (highestScoreR === undefined || step < highestScoreR.length) {
        this.data.steps[key] = r;
        this.#save();
      }
    }

    getHighestScore(levelObj) {
      const key = this.#getLevelKey(levelObj);
      const r = this.data.steps[key];
      return r === undefined ? null : r.length;
    }

    #getLevelKey(levelObj) {
      return `w=${levelObj.w}&h=${levelObj.h}&s=${levelObj.s}`;
    }
  }
})();
