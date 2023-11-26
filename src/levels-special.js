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
    // -----------------------------------------------------------------------

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
      s: '00s01-00211',
      r: '1203321',
      step: 7,
      subject: '⠐⠚',
    },
    {
      w: 5,
      h: 3,
      s: '00s11-02311',
      r: '20323211',
      step: 8,
    },
    {
      w: 5,
      h: 3,
      s: '01s22-01122',
      r: '203321',
      step: 6,
      subject: '⠓⠛',
    },
    {
      w: 5,
      h: 3,
      s: '0s-0011-022',
      r: '2321',
      step: 4,
    },
    // -----------------------------------------------------------------------

    {
      w: 6,
      h: 4,
      s: 's11022-11022',
      r: '1232210301',
      step: 10,
    },
    {
      w: 6,
      h: 4,
      s: '00111-02s01-0222',
      r: '311211033',
      step: 9,
    },
    {
      w: 6,
      h: 4,
      s: '00s1-02111-0011',
      r: '2033212101011231223330',
      step: 22,
    },
    {
      w: 6,
      h: 4,
      s: '-0s111-0022-0033',
      r: '21300111123303211122330110333',
      step: 29,
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
