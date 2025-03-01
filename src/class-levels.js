(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  class Levels {
    #levelsList;
    #levelsListEx;

    constructor({ levelsList = null, levelsListEx = null }) {
      this.#levelsList = levelsList;
      this.#levelsListEx = levelsListEx;
    }

    levelObjToId(queryObj) {
      for (let id = 0; id < this.#levelsList.length; ++id) {
        const levelObj = this.#levelsList[id];
        if (
          levelObj.w === queryObj.w &&
          levelObj.h === queryObj.h &&
          levelObj.s === queryObj.s &&
          (queryObj.r === undefined || levelObj.r === queryObj.r) &&
          levelObj.axis === queryObj.axis
        ) {
          return id;
        }
      }
      for (const id of Object.keys(this.#levelsListEx).sort()) {
        if (String(id) === 'NaN') continue;
        const levelObj = this.#levelsListEx[id];
        if (
          levelObj.w === queryObj.w &&
          levelObj.h === queryObj.h &&
          levelObj.s === queryObj.s &&
          (queryObj.r === undefined || levelObj.r === queryObj.r) &&
          levelObj.axis === queryObj.axis
        ) {
          return id;
        }
      }
      return null;
    }

    getLevelObj(levelId) {
      if (this.#levelsList[levelId] !== undefined) {
        return this.#levelsList[levelId];
      } else if (this.#levelsListEx[levelId] !== undefined) {
        return this.#levelsListEx[levelId];
      }
      return null;
    }

    getAllLevels() {
      const res = [];
      for (let levelId = 0; levelId < this.#levelsList.length; ++levelId) {
        const levelObj = this.#levelsList[levelId];
        res.push({ levelId, levelObj });
      }
      for (const levelId of Object.keys(this.#levelsListEx).sort()) {
        const levelObj = this.#levelsListEx[levelId];
        res.push({ levelId, levelObj });
      }
      return res;
    }

    prevable(levelId) {
      if (levelId === null) return false;
      if (levelId === 0) return false;
      if (levelId === 1) return false;
      if (isNaN(levelId)) return false;
      if (this.#levelsList[levelId] !== undefined) return this.#levelsList[levelId - 1] !== undefined;
      if (this.#levelsListEx[levelId] !== undefined) return this.#levelsListEx[levelId - 1] !== undefined;
      return this.#levelsList[levelId - 1] === undefined && this.#levelsListEx[levelId - 1] === undefined;
    }

    nextable(levelId) {
      if (levelId === null) return false;
      if (levelId === -1) return false;
      if (levelId === 0) return false;
      if (isNaN(levelId)) return false;
      if (this.#levelsList[levelId] !== undefined) return this.#levelsList[levelId + 1] !== undefined;
      if (this.#levelsListEx[levelId] !== undefined) return this.#levelsListEx[levelId + 1] !== undefined;
      return this.#levelsList[levelId + 1] === undefined && this.#levelsListEx[levelId + 1] === undefined;
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Levels = Levels;
  } else {
    module.exports = Levels;
  }
})();
