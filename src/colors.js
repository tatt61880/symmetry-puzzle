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

  colors[app.states.none] = { fill: '#ffffff', stroke: '#aaaaaa', text: '#888888', error: 'red' };
  colors[app.states.wall] = { fill: '#222222', stroke: '#666666', text: '#bbbbbb', error: 'red' };
  for (let i = app.states.targetMin; i <= app.states.targetMax; ++i) {
    colors[i] = { fill: 'pink', stroke: 'red', text: '#773333', error: 'red' };
  }
  for (let i = app.states.otherMin; i <= app.states.otherMax; ++i) {
    colors[i] = { fill: '#e5e5e5', stroke: '#aaa', text: '#555555', error: 'red' };
  }
  for (let i = app.states.userMin; i <= app.states.userMax; ++i) {
    colors[i] = { fill: 'aqua', stroke: 'blue', text: '#333399', error: 'red' };
  }

  colors.line = '#888';

  colors.frame = '#fff8dd';
  colors.frameBorder = '#ffdd33';

  colors.stepWin = '#ff5555';
  colors.stepDraw = '#ff8800';
  colors.stepLose = '#222222';
  colors.stepUnknown = 'gray';

  Object.freeze(colors);

  if (isBrowser) {
    window.app = window.app || {};
    window.app.colors = colors;
  } else {
    module.exports = colors;
  }
})();
