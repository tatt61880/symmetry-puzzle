(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsSpecial = [];
  levelsSpecial.push(
    {
      w: 4,
      h: 3,
      s: 's01-0111-02',
      r: '221',
      step: 3,
      subject: 'temp',
    },
    {
      w: 5,
      h: 3,
      s: 's-00011-00201',
      r: '1221',
      step: 4,
      subject: 'はじまり',
    },
    {
      w: 5,
      h: 3,
      s: '000s1-00211',
      r: '203321',
      step: 6,
    },
    {
      w: 5,
      h: 3,
      s: 's001-02111',
      r: '123211',
      step: 6,
    },
    {
      w: 5,
      h: 3,
      s: '01s22-01122',
      r: '203321',
      step: 6,
    },
    {
      w: 5,
      h: 3,
      s: '011-00s22',
      r: '210',
      step: 3,
    },
    {
      w: 6,
      h: 4,
      s: 's11022-11022',
      r: '1232210301',
      step: 10,
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
