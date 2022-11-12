(function() {
  'use strict';
  window.showkoban = window.showkoban || {};

  if (showkoban.states === undefined) {
    console.error('showkoban.states === undefined');
    return;
  }

  const colors = {};
  colors[showkoban.states.none] = {fill: '#ffffff', stroke: '#aaaaaa', text: '#888888', error: 'red'};
  colors[showkoban.states.wall] = {fill: '#222222', stroke: '#666666', text: '#bbbbbb', error: 'red'};
  for (let i = showkoban.states.targetMin; i <= showkoban.states.targetMax; ++i) {
    colors[i] = {fill: 'pink', stroke: 'red', text: '#773333', error: 'red'};
  }
  for (let i = showkoban.states.otherMin; i <= showkoban.states.otherMax; ++i) {
    colors[i] = {fill: '#e5e5e5', stroke: '#aaa', text: '#555555', error: 'red'};
  }
  for (let i = showkoban.states.userMin; i <= showkoban.states.userMax; ++i) {
    colors[i] = {fill: 'aqua', stroke: 'blue', text: '#333399', error: 'red'};
  }

  colors.line = '#888';

  colors.stepWin = 'white';
  colors.stepDraw = 'orange';
  colors.stepLose = 'black';
  colors.stepUnknown = 'gray';

  Object.freeze(colors);
  showkoban.colors = colors;
})();
