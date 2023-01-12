(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsReflectionEx = {
    NaN: { w: 3, h: 7, s: 's-01-01-01--02', r: '12', step: 2 },
  };

  Object.freeze(levelsReflectionEx);
  for (const levelId in levelsReflectionEx) {
    Object.freeze(levelId);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsReflectionEx = levelsReflectionEx;
  } else {
    module.exports = levelsReflectionEx;
  }
})();
