(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  if (isBrowser) {
    app = window.app;
    console.assert(app?.colors !== undefined);
    console.assert(app?.svg !== undefined);
  } else {
    app.colors = require('./colors.js');
    app.svg = require('./svg.js');
  }

  let checkMode;
  let levelId;

  let loadLevelById;

  const maxW = 50;
  const maxH = 50;
  const minEditW = 3;
  const minEditH = 3;
  const maxEditW = 10;
  const maxEditH = 10;
  let level;
  let levels;

  const common = {
    // 変数
    maxW,
    maxH,
    minEditW,
    minEditH,
    maxEditW,
    maxEditH,
    level,
    levels,
    levelId,
    checkMode,
    loadLevelById,

    // 関数
    applyLang,
    isTouchDevice,
    isShownElem,
    isHiddenElem,
    showElem,
    hideElem,
    activeElem,
    inactiveElem,
    getStepColor,
    createCrown,
    updateTitleNumModeButton,
  };

  function applyLang(lang) {
    window.getSelection().removeAllRanges();

    document.documentElement.setAttribute('lang', lang);

    for (const elem of document.getElementsByClassName('setting-lang-button')) {
      elem.classList.remove('active');
    }
    const langButton = document.getElementById(`setting-lang-${lang}`);
    langButton.classList.add('active');
    for (const elem of document.getElementsByClassName('translatable')) {
      elem.classList.add('hide-lang');
    }

    for (const elem of document.getElementsByClassName(`translatable ${lang}`)) {
      elem.classList.remove('hide-lang');
    }

    for (const elem of document.getElementsByClassName(`translatable-toggle`)) {
      if (elem.tagName === 'A') {
        elem.setAttribute('href', elem.dataset[lang]);
        elem.setAttribute('title', elem.dataset[lang + 'Title']); // 例: data-ja-title
        elem.setAttribute('area-label', elem.dataset[lang + 'Title']); // 例: data-ja-title
      } else if (elem instanceof SVGTextElement) {
        elem.textContent = elem.dataset[lang];
      } else {
        elem.innerText = elem.dataset[lang];
      }
    }
  }

  function isTouchDevice() {
    return document.ontouchstart !== undefined;
  }

  function isShownElem(elem) {
    if (!elem) return false;
    return !elem.classList.contains('hide');
  }

  function isHiddenElem(elem) {
    if (!elem) return true;
    return elem.classList.contains('hide');
  }

  function showElem(elem) {
    if (!elem) return;
    elem.classList.remove('hide');
  }

  function hideElem(elem) {
    if (!elem) return;
    elem.classList.add('hide');
  }

  function activeElem(elem) {
    if (!elem) return;
    elem.classList.add('active-elem');
  }

  function inactiveElem(elem) {
    if (!elem) return;
    elem.classList.remove('active-elem');
  }

  function getStepColor(yourStep, bestStep) {
    if (yourStep === null) {
      return app.colors.stepUnknown;
    } else if (bestStep === undefined) {
      return app.colors.stepNum;
    } else if (yourStep > bestStep) {
      return app.colors.stepLose;
    } else if (yourStep === bestStep) {
      return app.colors.stepDraw;
    } else {
      return app.colors.stepWin;
    }
  }

  function createCrown(size, x, y, step, bestStep) {
    const color = getStepColor(step, bestStep);
    if (color === app.colors.stepUnknown) {
      const g = app.svg.createG();
      const crown = app.svg.createCrown(size, {
        x,
        y,
        fill: '#ffffff00', // クリックできるようにします。透明です。
        stroke: app.colors.stepUnknown,
        strokeWidth: 0.025,
      });
      g.appendChild(crown);
      g.setAttribute('stroke-dasharray', `${size * 0.02} ${size * 0.05}`);
      return g;
    } else {
      return app.svg.createCrown(size, {
        x,
        y,
        fill: color,
      });
    }
  }

  // タイトル画面の連番モード用のボタンを表示するか否かを判定して更新します。
  function updateTitleNumModeButton() {
    if (common.isShownElem(app.elems.title.buttonNormalsTr)) {
      common.showElem(app.elems.title.buttonToggleToNumDiv);
      common.showElem(app.elems.records.numMode);
      for (const [levelsList, mode] of [
        [app.levelsLine, app.Level.CHECK_MODE.LINE],
        [app.levelsPoint, app.Level.CHECK_MODE.POINT],
        [app.levelsSpecial, app.Level.CHECK_MODE.SPECIAL],
      ]) {
        const levels = new app.Levels({ levelsList, levelsListEx: undefined });
        const levelObj = levels.getLevelObj(1);
        const highestScore = app.savedata.getHighestScore(levelObj, mode);
        if (highestScore === null) {
          common.hideElem(app.elems.title.buttonToggleToNumDiv);
          common.hideElem(app.elems.records.numMode);
        }
      }
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.common = common;
  } else {
    module.exports = common;
  }
})();
