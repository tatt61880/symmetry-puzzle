(function() {
  'use strict';
  window.showkoban = window.showkoban || {};

  if (showkoban.states === undefined) {
    console.error('showkoban.states === undefined');
    return;
  }

  const colors = {};
  colors[showkoban.states.none] = {fill: 'white', stroke: '#aaa', text: '#ccc'};
  colors[showkoban.states.wall] = {fill: '#222', stroke: '#666', text: 'white'};
  for (let i = showkoban.states.targetMin; i <= showkoban.states.targetMax; ++i) {
    colors[i] = {fill: 'pink', stroke: 'red', text: 'black'};
  }
  for (let i = showkoban.states.otherMin; i <= showkoban.states.otherMax; ++i) {
    colors[i] = {fill: '#e5e5e5', stroke: '#aaa', text: 'black'};
  }
  for (let i = showkoban.states.userMin; i <= showkoban.states.userMax; ++i) {
    colors[i] = {fill: 'aqua', stroke: 'blue', text: 'black'};
  }

  showkoban.colors = colors;
})();
