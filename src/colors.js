(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  const colors = {};

  if (isBrowser) {
    app = window.app;
    console.assert(app?.states !== undefined);
  } else {
    app.states = require('./states.js');
  }

  colors[app.states.shape] = {
    fill: '#ffbb77',
    stroke: '#ff7700',
    text: '#884400',
    error: '#f80000',
  };

  colors[app.states.none] = {
    fill: '#ffffff',
    stroke: '#aaaaaa',
    text: '#888888',
  };

  colors[app.states.wall] = {
    fill: '#222244',
    stroke: '#222244',
    text: '#bbbbbb',
  };

  for (let i = app.states.targetMin; i <= app.states.targetMax; ++i) {
    colors[i] = {
      fill: '#ffbb77',
      stroke: '#ff7700',
      text: '#884400',
      error: '#f80000',
    };
  }

  for (let i = app.states.otherMin; i <= app.states.otherMax; ++i) {
    colors[i] = {
      fill: '#e5e5e5',
      stroke: '#aaaaaa',
      text: '#555555',
      error: '#f80000',
    };
  }

  for (let i = app.states.userMin; i <= app.states.userMax; ++i) {
    colors[i] = {
      fill: '#aaccff',
      stroke: '#0000f8',
      text: '#333399',
      error: '#f80000',
    };
  }

  colors.line = '#888888';
  colors.symmetryAxis = '#ffdd33';
  colors.symmetryAxisInvalid = '#f85555';
  colors.levelSymmetryAxis = '#3333f8';
  colors.levelSymmetryAxisCenter = '#5555f8';

  colors.frameFill = '#ffeedd';
  colors.frameStroke = '#ffbb77';
  colors.frameFillNumMode = '#ddeeff';
  colors.frameStrokeNumMode = '#aad0ff';
  colors.frameEditSize = '#ffdd33';

  colors.congratulations = '#ffdd33';
  colors.newRecords = '#ffdd33';

  colors.stepWin = '#ff5555';
  colors.stepDraw = '#ff7700';
  colors.stepLose = '#777777';
  colors.stepUnknown = '#a0a0a0';
  colors.stepNormal = '#884400';
  colors.stepNum = '#303080'; // 連番モード用

  colors.shapeNumPerfect = '#ff7700';
  colors.shapeNumNormal = '#777777';

  colors.editButton = {
    fill: '#e5a0e5',
    stroke: '#aa33aa',
  };

  colors.levelsDialogCurrentLevel = '#cceeff';
  colors.levelsDialogSelect = 'red';

  Object.freeze(colors);

  if (isBrowser) {
    window.app = window.app || {};
    window.app.colors = colors;
  } else {
    module.exports = colors;
  }
})();
