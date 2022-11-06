(function() {
  'use strict';
  window.showkoban = window.showkoban || {};
  showkoban.states = {};

  showkoban.states.wall = -1; // 壁
  showkoban.states.none = 0;
  showkoban.states.targetMin = 1;
  showkoban.states.targetMax = 9;
  showkoban.states.otherMin = 10;
  showkoban.states.otherMax = 15;
  showkoban.states.userMin = 100; // 自機
  showkoban.states.userMax = 102; // 自機

  const stateToChar = {};
  const charToState = {};

  stateToChar[showkoban.states.wall] = 'x';
  stateToChar[showkoban.states.none] = '0';
  for (let i = showkoban.states.targetMin; i <= showkoban.states.targetMax; ++i) {
    stateToChar[i] = `${i}`; // '1' ～
  }
  for (let i = showkoban.states.otherMin; i <= showkoban.states.otherMax; ++i) {
    stateToChar[i] = `${String.fromCharCode('a'.charCodeAt(0) + i - showkoban.states.otherMin)}`;
  }
  for (let i = showkoban.states.userMin; i <= showkoban.states.userMax; ++i) {
    stateToChar[i] = `${String.fromCharCode('s'.charCodeAt(0) + i - showkoban.states.userMin)}`;
  }

  for (const key in stateToChar) {
    const val = stateToChar[key];
    charToState[val] = Number(key);
  }

  Object.freeze(stateToChar);
  Object.freeze(charToState);
  showkoban.states.stateToChar = stateToChar;
  showkoban.states.charToState = charToState;

  showkoban.states.isTarget = (state) => {
    return showkoban.states.targetMin <= state && state <= showkoban.states.targetMax;
  };

  Object.freeze(showkoban.states);
})();
