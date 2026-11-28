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

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isValidBackup(data) {
    if (!isObject(data) || !isObject(data.steps) || !isObject(data.shapes)) return false;
    if (data.version !== undefined && data.version !== 1 && data.version !== 2) return false;
    if (data.lang !== undefined && data.lang !== 'ja' && data.lang !== 'en') return false;

    function isRecord(record) {
      if (typeof record === 'string') return !/[^0-4]/.test(record);
      return Number.isSafeInteger(record) && record >= 0;
    }

    if (!Object.values(data.steps).every(isRecord)) return false;
    for (const shapes of Object.values(data.shapes)) {
      if (!isObject(shapes)) return false;
      for (const [shape, record] of Object.entries(shapes)) {
        if (!shape.includes('#') || !/^[#0]+(?:-[#0]+)*$/.test(shape) || !isRecord(record)) return false;
      }
    }
    return true;
  }

  class Savedata {
    constructor() {
      this.data = null;
      this.#load();
    }

    getBackupData() {
      return this.data;
    }

    createBackup() {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return { yyyymmdd: year + month + day, backupData: this.getBackupData() };
    }

    restoreBackupData(data) {
      if (!isValidBackup(data)) return false;
      const restored = { ...data, version: 1 };
      if (restored.lang === undefined && this.data.lang !== undefined) restored.lang = this.data.lang;
      // 保存に失敗したときは、プレイ中の記録も元のままにします。
      this.#save(restored);
      this.data = restored;
      return true;
    }

    #load() {
      if (isBrowser) {
        this.data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
      }

      if (this.data === null) {
        this.data = {};
      }
      if (this.data.version === undefined || this.data.version === 2) {
        this.data.version = 1;
      }
      if (this.data.steps === undefined) {
        this.data.steps = {};
      }
      if (this.data.shapes === undefined) {
        this.data.shapes = {};
      }
    }

    #save(data = this.data) {
      if (!isBrowser) return;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    }

    saveLang(lang) {
      this.data.lang = lang;
      this.#save();
    }

    getLang() {
      return this.data.lang;
    }

    #saveBest(records, key, level, replay) {
      const steps = replay.length;
      const previous = records[key];
      if (previous !== undefined && steps >= getRecordSteps(previous)) return false;

      records[key] = steps > maxReplaySteps ? steps : level.toSourceReplay(replay);
      this.#save();
      return true;
    }

    saveSteps(level, replay, seqNum = null) {
      this.#saveBest(this.data.steps, this.#getLevelKey(level, seqNum), level, replay);
    }

    saveShape(level, targetShape, replay, seqNum = null) {
      const key = this.#getLevelKey(level, seqNum);
      this.data.shapes[key] ??= {};
      return this.#saveBest(this.data.shapes[key], level.toSourceShape(targetShape), level, replay);
    }

    // 形状と手順は元の盤面の向きで保存し、形状一覧では表示中の向きに戻します。
    getShapesObj(level, seqNum = null) {
      const key = this.#getLevelKey(level, seqNum);
      return this.data.shapes[key];
    }

    getShapeRecords(level, seqNum = null) {
      return Object.entries(this.getShapesObj(level, seqNum) ?? {}).map(([shapeStr, record]) => ({
        shapeStr: level.fromSourceShape(shapeStr),
        steps: getRecordSteps(record),
        replay: typeof record === 'string' ? level.fromSourceReplay(record) : undefined,
      }));
    }

    getHighestScore(level, seqNum = null) {
      const key = this.#getLevelKey(level, seqNum);
      return getRecordSteps(this.data.steps[key]) ?? this.#getMinStepsinShapes(key);
    }

    getHighestScoreForSeqMode(num, mode) {
      const key = this.#getSeqModeKey(num, mode);
      return this.#getMinStepsinShapes(key);
    }

    getUnsolvedMinNum(checkMode) {
      let num = 1n;
      const mode = app.Level.getCheckModeStr(checkMode);
      while (this.data.shapes[this.#getSeqModeKey(num, mode)] !== undefined) {
        num++;
      }
      return num;
    }

    #getLevelKey(level, seqNum) {
      if (seqNum === null) return level.getRecordKey();
      return this.#getSeqModeKey(seqNum, app.Level.getCheckModeStr(level.getCheckMode()));
    }

    #getSeqModeKey(num, mode) {
      return `mode=${mode}&num=${num}`;
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
