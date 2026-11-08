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

  const maxReplaySteps = 9999;

  // 上限以内の記録は従来どおり手順の文字列、上限を超えた記録は手数のみ保存します。
  function getRecordSteps(record) {
    return typeof record === 'string' ? record.length : record;
  }

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

    #saveBest(records, key, replay) {
      const steps = replay.length;
      const previous = records[key];
      if (previous !== undefined && steps >= getRecordSteps(previous)) return false;

      if (steps > maxReplaySteps) {
        records[key] = steps;
        this.data.version = Math.max(this.data.version ?? 1, 2);
      } else {
        records[key] = replay;
      }
      this.#save();
      return true;
    }

    saveSteps(level, replay) {
      this.#saveBest(this.data.steps, this.#getLevelKey(level), replay);
    }

    saveShape(level, targetShape, replay) {
      const key = this.#getLevelKey(level);
      this.data.shapes[key] ??= {};
      return this.#saveBest(this.data.shapes[key], targetShape, replay);
    }

    getShapesObj(level) {
      const key = this.#getLevelKey(level);
      return this.data.shapes[key];
    }

    getShapeRecords(level) {
      return Object.entries(this.getShapesObj(level) ?? {}).map(([shapeStr, record]) => ({
        shapeStr,
        steps: getRecordSteps(record),
        replay: typeof record === 'string' ? record : undefined,
      }));
    }

    getHighestScore(level) {
      const key = this.#getLevelKey(level);
      return getRecordSteps(this.data.steps[key]) ?? this.#getMinStepsinShapes(key);
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
      let best = null;
      for (const record of Object.values(this.data.shapes[key] ?? {})) {
        const steps = getRecordSteps(record);
        if (best === null || steps < best) best = steps;
      }
      return best;
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
