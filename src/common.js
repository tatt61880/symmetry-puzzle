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
  const maxEditW = 10;
  const maxEditH = 10;
  let level;
  let levels;

  const common = {
    maxW,
    maxH,
    maxEditW,
    maxEditH,
    level,
    levels,
    levelId,
    checkMode,
    loadLevelById,

    isTouchDevice,
    isShownElem,
    isHiddenElem,
    showElem,
    hideElem,
    activeElem,
    inactiveElem,
    getStepColor,
    createCrown,
  };

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

  function getStepColor(step, bestStep) {
    if (step === null) {
      return app.colors.stepUnknown;
    } else if (bestStep === undefined) {
      return app.colors.stepNum;
    } else if (step > bestStep) {
      return app.colors.stepLose;
    } else if (step === bestStep) {
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

  if (isBrowser) {
    window.app = window.app || {};
    window.app.common = common;
  } else {
    module.exports = common;
  }
})();
