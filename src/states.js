(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const states = {};

  states.shape = -2;
  states.wall = -1; // 壁
  states.none = 0;
  states.targetMin = 1;
  states.targetMax = 256;
  states.otherMin = 1001;
  states.otherMax = 1008;
  states.userMin = 10000;
  states.userMax = 10004; // 探索時はこの値が小さい方が有利。

  const stateToChar = {};
  const charToState = {};

  stateToChar[states.shape] = '#';
  stateToChar[states.wall] = 'x';
  stateToChar[states.none] = '0';
  for (let i = states.targetMin; i <= states.targetMax; ++i) {
    stateToChar[i] = `${i + 1 - states.targetMin}`; // '1' ～
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
  states.isTarget = (state) => states.targetMin <= state && state <= states.targetMax;
  states.isOther = (state) => states.otherMin <= state && state <= states.otherMax;
  states.isUser = (state) => states.userMin <= state && state <= states.userMax;
  Object.freeze(states);

  if (isBrowser) {
    window.app = window.app || {};
    window.app.states = states;
  } else {
    module.exports = states;
  }
})();
