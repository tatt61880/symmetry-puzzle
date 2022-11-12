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

    saveSteps(w, h, s, r) {
      const maxStep = 999;
      const step = r.length;
      if (step > maxStep) {
        r = r.substring(0, maxStep);
      }
      const key = this.#getLevelKey(w, h, s);
      const highestScoreR = this.data.steps[key];
      if (highestScoreR === undefined || step < highestScoreR.length) {
        this.data.steps[key] = r;
        this.#save();
      }
    }

    getHighestScore(w, h, s) {
      const key = this.#getLevelKey(w, h, s);
      const r = this.data.steps[key];
      return r === undefined ? null : r.length;
    }

    #getLevelKey(w, h, s) {
      return `w=${w}&h=${h}&s=${s}`;
    }
  }
})();
