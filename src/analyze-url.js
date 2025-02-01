(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  if (window.app?.analyzeUrl) return;

  const app = window.app;
  console.assert(app?.Level !== undefined);

  function analyzeUrl() {
    const res = {
      id: null,
      num: null,
      levelObj: {
        w: 6,
        h: 6,
        s: null,
      },
      settings: {
        autoMode: false,
        debugFlag: false,
        mirrorFlag: false,
        rotateNum: 0,
      },
    };

    const queryStrs = location.href.split('?')[1];
    if (queryStrs === undefined) return res;

    for (const queryStr of queryStrs.split('&')) {
      const paramArray = queryStr.split('=');
      const paramName = paramArray[0];
      const paramVal = paramArray[1];
      switch (paramName) {
        case 'num':
          res.num = Number(paramVal);
          break;
        case 'id':
          res.id = Number(paramVal);
          break;
        case 'w':
          res.levelObj.w = Number(paramVal);
          break;
        case 'h':
          res.levelObj.h = Number(paramVal);
          break;
        case 's':
          res.levelObj.s = paramVal;
          break;
        case 'axis':
          res.levelObj.axis = paramVal;
          break;
        case 'mode':
          switch (paramVal) {
            case 'line':
              res.settings.mode = app.Level.CHECK_MODE.LINE;
              break;
            case 'point':
              res.settings.mode = app.Level.CHECK_MODE.POINT;
              break;
            case 'special':
              res.settings.mode = app.Level.CHECK_MODE.SPECIAL;
              break;
          }
          break;
        case 'auto':
          res.settings.autoMode = true;
          break;
        case 'debug':
          res.settings.debugFlag = true;
          break;
        case 'mirror':
          res.settings.mirrorFlag = true;
          break;
        case 'rotate':
          res.settings.rotateNum = Number(paramVal) % 4;
          break;
      }
    }
    return res;
  }

  window.app = window.app || {};
  window.app.analyzeUrl = analyzeUrl;
})();
