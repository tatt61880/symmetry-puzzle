(function() {
  'use strict';

  if (typeof window !== 'undefined') {
    window.showkoban = window.showkoban || {};
    window.showkoban.analyzeUrl = analyzeUrl;
  }

  function analyzeUrl() {
    const res = {
      levelObj: {
        w: 6,
        h: 6,
        s: '',
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
      case 'w':
        res.levelObj.w = Number(paramVal);
        break;
      case 'h':
        res.levelObj.h = Number(paramVal);
        break;
      case 's':
        res.levelObj.s = paramVal;
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
})();
