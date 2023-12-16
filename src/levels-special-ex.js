(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsSpecialEx = {
    NaN: {
      w: 5,
      h: 4,
      s: '-0011-02s1',
      r: '21103',
      step: 5,
      shapes: 1,
      subject: 'NaN',
    },
  };

  Object.freeze(levelsSpecialEx);
  for (const levelId in levelsSpecialEx) {
    Object.freeze(levelId);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsSpecialEx = levelsSpecialEx;
  } else {
    module.exports = levelsSpecialEx;
  }
})();
