(function() {
  'use strict';

  const states = {};
  if (typeof window === 'undefined') {
    module.exports = states;
  } else {
    window.showkoban = window.showkoban || {};
    window.showkoban.states = states;
  }

  states.wall = -1; // 壁
  states.none = 0;
  states.targetMin = 1;
  states.targetMax = 9;
  states.otherMin = 10;
  states.otherMax = 15;
  states.userMin = 100; // 自機
  states.userMax = 102; // 自機

  const stateToChar = {};
  const charToState = {};

  stateToChar[states.wall] = 'x';
  stateToChar[states.none] = '0';
  for (let i = states.targetMin; i <= states.targetMax; ++i) {
    stateToChar[i] = `${i}`; // '1' ～
  }
  for (let i = states.otherMin; i <= states.otherMax; ++i) {
    stateToChar[i] = `${String.fromCharCode('a'.charCodeAt(0) + i - states.otherMin)}`;
  }
  for (let i = states.userMin; i <= states.userMax; ++i) {
    stateToChar[i] = `${String.fromCharCode('s'.charCodeAt(0) + i - states.userMin)}`;
  }

  for (const key in stateToChar) {
    const val = stateToChar[key];
    charToState[val] = Number(key);
  }

  Object.freeze(stateToChar);
  Object.freeze(charToState);
  states.stateToChar = stateToChar;
  states.charToState = charToState;
  states.isTarget = (state) => {
    return states.targetMin <= state && state <= states.targetMax;
  };
  Object.freeze(states);
})();
