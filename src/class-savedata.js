(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  if (isBrowser) {
    app = window.app;
    if (app?.savedata) return;
  } else {
    app.Level = require('./class-level.js');
  }

  console.assert(app?.Level !== undefined);

  const LOCAL_STORAGE_KEY = 'tatt61880-symmetry-puzzle';

  const maxStep = 9999;

  class Savedata {
    constructor() {
      this.data = null;
      this.#load();
    }

    getBackupData() {
      return this.data;
    }

    restoreBackupData(data) {
      this.data = data;
      this.#save();
    }

    #load() {
      if (isBrowser) {
        this.data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
      }

      if (this.data === null) {
        this.data = {};
      }
      if (this.data.version === undefined) {
        this.data.version = 1;
      }
      if (this.data.steps === undefined) {
        this.data.steps = {};
      }
      if (this.data.shapes === undefined) {
        this.data.shapes = {};
      }
    }

    #save() {
      if (!isBrowser) return;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.data));
    }

    saveLang(lang) {
      this.data.lang = lang;
      this.#save();
    }

    getLang() {
      return this.data.lang;
    }

    saveSteps(level, r_) {
      let r = r_;
      const step = r.length;
      if (step > maxStep) {
        r = r.substring(0, maxStep);
      }

      const key = this.#getLevelKey(level);
      const highestScoreR = this.data.steps[key];
      if (highestScoreR === undefined || step < highestScoreR.length) {
        this.data.steps[key] = r;
        this.#save();
      }
    }

    saveShape(level, targetShape, r_) {
      let r = r_;
      const step = r.length;
      if (step > maxStep) {
        r = r.substring(0, maxStep);
      }

      const key = this.#getLevelKey(level);
      if (this.data.shapes[key] === undefined) {
        this.data.shapes[key] = {};
      }

      const highestScoreR = this.data.shapes[key][targetShape];
      if (highestScoreR === undefined || step < highestScoreR.length) {
        this.data.shapes[key][targetShape] = r;
        this.#save();
        return true;
      } else {
        return false;
      }
    }

    getShapesObj(level) {
      const key = this.#getLevelKey(level);
      return this.data.shapes[key];
    }

    getHighestScore(level) {
      const key = this.#getLevelKey(level);
      const r = this.data.steps[key];
      if (r) {
        return r.length;
      }

      return this.#getMinStepsinShapes(key);
    }

    getHighestScoreForSeqMode(num, checkMode) {
      const key = this.#getSeqModeKey(num, checkMode);
      return this.#getMinStepsinShapes(key);
    }

    getUnsolvedMinNum(checkMode) {
      let num = 1;
      const mode = app.Level.getCheckModeStr(checkMode);
      while (this.data.shapes[`mode=${mode}&num=${num}`] !== undefined) {
        num++;
      }
      return num;
    }

    #getLevelKey(level) {
      if (!isBrowser || app.common.levelNum === null || app.common.level === null) {
        return level.getUrlQuery();
      } else {
        const mode = app.Level.getCheckModeStr(app.common.level.getCheckMode());
        return this.#getSeqModeKey(app.common.levelNum, mode);
      }
    }

    #getSeqModeKey(num, checkMode) {
      return `mode=${checkMode}&num=${num}`;
    }

    #getMinStepsinShapes(key) {
      const shapeInfos = this.data.shapes[key];
      if (shapeInfos) {
        let score = maxStep + 1;
        for (const shapeStr in shapeInfos) {
          score = Math.min(score, shapeInfos[shapeStr].length);
        }
        return score;
      }

      return null;
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    const savedata = new Savedata();
    window.app.savedata = savedata;
  } else {
    module.exports = Savedata;
  }
})();
