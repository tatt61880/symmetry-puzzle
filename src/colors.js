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

  // 形状
  colors[app.states.shape] = {
    fill: '#ffbb77',
    stroke: '#ff7700',
    text: '#663300',
    error: '#f80000',
  };

  // 壁
  colors[app.states.wall] = {
    fill: '#222244',
    stroke: '#222244',
    text: '#bbbbbb',
  };

  // None
  colors[app.states.none] = {
    fill: '#ffffff',
    stroke: '#aaaaaa',
    text: '#888888',
  };

  // ターゲットブロック
  for (let i = app.states.targetMin; i <= app.states.targetMax; ++i) {
    colors[i] = {
      fill: '#ffbb77',
      stroke: '#ff7700',
      text: '#663300',
      error: '#f80000',
    };
  }

  // 灰色ブロック
  for (let i = app.states.otherMin; i <= app.states.otherMax; ++i) {
    colors[i] = {
      fill: '#e5e5e5',
      stroke: '#aaaaaa',
      text: '#555555',
      error: '#f80000',
    };
  }

  // 操作キャラ
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

  // フレーム
  colors.frameFill = '#ffeedd';
  colors.frameFillSeqMode = '#ddeeff';
  colors.frameStroke = '#ffbb77';
  colors.frameStrokeSeqMode = '#99ccff';
  colors.frameEditSize = '#ffdd33';

  colors.congratulations = '#ffdd33';
  colors.newRecords = '#ffdd33';

  // 手数
  colors.stepWin = '#ff5555';
  colors.stepDraw = '#ff7700';
  colors.stepLose = '#777777';
  colors.stepUnknown = '#999999';
  colors.stepNormal = '#663300';
  colors.stepNum = '#303080'; // 連番モード用

  // 形状数
  colors.shapeNumPerfect = colors.stepDraw;
  colors.shapeNumNormal = colors.stepNormal;
  colors.shapeNumSeqMode = colors.stepNum;

  colors.editButton = {
    fill: '#ffddff',
    stroke: '#aa33aa',
  };

  colors.levelsDialogCurrentLevel = colors.frameFill;
  colors.levelsDialogCurrentLevelSeqMode = colors.frameFillSeqMode;
  colors.levelsDialogSelect = '#ee0000';

  Object.freeze(colors);

  if (isBrowser) {
    window.app = window.app || {};
    window.app.colors = colors;
  } else {
    module.exports = colors;
  }
})();
