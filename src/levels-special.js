(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levels = [
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
      s: 's-00112-001',
      r: '11112033321',
      step: 11,
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
      s: '0s-0011-022',
      r: '2321',
      step: 4,
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
      s: '0s102-03452',
      r: '32210301',
      step: 8,
      subject: '⠚⠚',
    },
    // -----------------------------------------------------------------------

    {
      w: 5,
      h: 5,
      s: '-01s2-0132-0112',
      r: '0120332',
      step: 7,
    },
    {
      w: 5,
      h: 5,
      s: '-01s2-0113-0133',
      r: '011232123',
      step: 9,
    },
    {
      w: 5,
      h: 5,
      s: '-01s2-0133-0113',
      r: '1012220003332321',
      step: 16,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0211-0203',
      r: '01112303221123230103',
      step: 20,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0111-0203',
      r: '3213221003012212110332300301',
      step: 28,
    },
    // -----------------------------------------------------------------------

    {
      w: 5,
      h: 5,
      s: '-01s2-0303-0333',
      r: '1012220033210033222321',
      step: 22,
    },
    {
      w: 5,
      h: 5,
      s: '-01s2-0102-0333',
      r: '0112223230110003221233',
      step: 22,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0211-0231',
      r: '1203321',
      step: 7,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0231-0221',
      r: '321221030001201123303222321',
      step: 27,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0211-0233',
      r: '32221021110303233210300012321113300122',
      step: 38,
    },
    // -----------------------------------------------------------------------

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
      s: 's11022-11022',
      r: '1232210301',
      step: 10,
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
    },
    {
      w: 6,
      h: 4,
      s: '0s11-0021-00333',
      r: '2221111003311223333030012322111110033311122333330121002330111',
      step: 61,
    },
    // -----------------------------------------------------------------------

    {
      w: 5,
      h: 3,
      s: 's0x-00112-001',
      axis: 'p2-x5-y3',
      r: '141203441',
      step: 9,
    },
    {
      w: 5,
      h: 3,
      s: '00s01-xx211',
      axis: 'p2-x5-y3',
      r: '14302341',
      step: 8,
    },
    {
      w: 7,
      h: 7,
      s: '0x0x0xx-0xxxxxx-0xsx0x-xxxx0x1-0x0x0x-0x0xxx-0x0x02',
      axis: 'p2-x7-y7',
      r: '444224442240044222',
      step: 18,
    },

    /*
    {
      w: 5,
      h: 5,
      s: '-0s11-0203-0243',
      r: '32122102110332300301',
      step: 20,
    },
    */
  ];

  const levelsSpecial = [];
  levelsSpecial.push(...levels);

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
