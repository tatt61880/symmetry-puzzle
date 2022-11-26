(function() {
  'use strict';

  let app = {};
  const colors = {};
  if (typeof window === 'undefined') {
    app.states = require('./states.js');
    module.exports = colors;
  } else {
    app = window.app;
    if (app?.states === undefined) console.error('app.states is undefined.');
    window.app.colors = colors;
  }

  colors[app.states.none] = {fill: '#ffffff', stroke: '#aaaaaa', text: '#888888', error: 'red'};
  colors[app.states.wall] = {fill: '#222222', stroke: '#666666', text: '#bbbbbb', error: 'red'};
  for (let i = app.states.targetMin; i <= app.states.targetMax; ++i) {
    colors[i] = {fill: 'pink', stroke: 'red', text: '#773333', error: 'red'};
  }
  for (let i = app.states.otherMin; i <= app.states.otherMax; ++i) {
    colors[i] = {fill: '#e5e5e5', stroke: '#aaa', text: '#555555', error: 'red'};
  }
  for (let i = app.states.userMin; i <= app.states.userMax; ++i) {
    colors[i] = {fill: 'aqua', stroke: 'blue', text: '#333399', error: 'red'};
  }

  colors.line = '#888';

  colors.stepWin = 'red';
  colors.stepDraw = 'orange';
  colors.stepLose = 'black';
  colors.stepUnknown = 'gray';

  Object.freeze(colors);
})();
