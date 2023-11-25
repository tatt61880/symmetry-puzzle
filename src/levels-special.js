(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsSpecial = [];
  levelsSpecial.push(
    {},
    {
      w: 5,
      h: 3,
      s: 's001-00111-002',
      r: '1221',
      step: 4,
      subject: 'はじまり',
    }
  );

  Object.freeze(levelsSpecial);
  for (const level of levelsSpecial) {
    Object.freeze(level);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsSpecial = levelsSpecial;
  } else {
    module.exports = levelsSpecial;
  }
})();
