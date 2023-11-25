(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsSpecialEx = {
    NaN: {
      w: 6,
      h: 4,
      s: '-011s2-001',
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
