(function() {
  'use strict';
  window.showkoban = window.showkoban || {};

  window.showkoban.analyzeUrl = () => {
    const res = {
      levelObj: {
        w: 6,
        h: 6,
        s: '',
      },
      settings: {
        autoMode: false,
        rotateNum: 0,
        mirrorFlag: false,
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
      case 'rotate':
        res.settings.rotateNum = Number(paramVal) % 4;
        break;
      case 'mirror':
        res.settings.mirrorFlag = true;
        break;
      }
    }
    return res;
  };
})();
