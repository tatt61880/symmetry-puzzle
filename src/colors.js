(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  const colors = {};
  if (isBrowser) {
    app = window.app;
    if (app?.states === undefined) console.error('app.states is undefined.');
  } else {
    app.states = require('./states.js');
  }

  colors[app.states.none] = {
    fill: '#ffffff',
    stroke: '#aaaaaa',
    text: '#888888',
  };
  colors[app.states.wall] = {
    fill: '#222222',
    stroke: '#666666',
    text: '#bbbbbb',
  };
  for (let i = app.states.targetMin; i <= app.states.targetMax; ++i) {
    colors[i] = {
      fill: '#ffc0cb',
      stroke: '#f80000',
      text: '#773333',
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
      fill: '#00f8f8',
      stroke: '#0000f8',
      text: '#333399',
      error: '#f80000',
    };
  }

  colors.line = '#888888';
  colors.symmetryPoint = '#ff8800';
  colors.symmetryLine = colors.symmetryPoint;

  colors.frame = '#fff8dd';
  colors.frameBorder = '#ffdd33';

  colors.congratulations = '#fff8dd';
  colors.newRecords = '#fff8dd';

  colors.stepWin = '#ff5555';
  colors.stepDraw = '#ff8800';
  colors.stepLose = '#666666';
  colors.stepUnknown = '#a0a0a0';

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
