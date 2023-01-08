(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsExReflection = {
    NaN: { w: 3, h: 7, s: 's-01-01-01--02', r: '12', step: 2 },
  };

  Object.freeze(levelsExReflection);
  for (const levelId in levelsExReflection) {
    Object.freeze(levelId);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsExReflection = levelsExReflection;
  } else {
    module.exports = levelsExReflection;
  }
})();
