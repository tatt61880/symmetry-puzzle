(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsReflection = [];
  levelsReflection.push(
    {
      w: 5,
      h: 3,
      s: 's-0102',
      r: '21',
      step: 2
    },
    { w: 5, h: 3, s: 's0001-00211', r: '1123211', step: 7, subject: 'はじまり' },
    { w: 5, h: 4, s: '-00111-201-s', r: '1101033', step: 7 },
  );

  Object.freeze(levelsReflection);
  for (const level of levelsReflection) {
    Object.freeze(level);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsReflection = levelsReflection;
  } else {
    module.exports = levelsReflection;
  }
})();
