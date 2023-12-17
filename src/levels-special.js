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

    // Level 1 - 5
    {
      w: 5,
      h: 3,
      s: 's-00112-001',
      r: '11112033321',
      step: 11,
      shapes: 1,
      subject: 'はじまり',
    },
    {
      w: 5,
      h: 3,
      s: '00s-0102-003',
      r: '120332',
      step: 6,
      shapes: 2,
      subject: '⠪⠂',
    },
    {
      w: 5,
      h: 3,
      s: '0s-0011-022',
      r: '2321',
      step: 4,
      shapes: 2,
    },
    {
      w: 5,
      h: 3,
      s: '0s11-0222-0033',
      r: '13321',
      step: 5,
      shapes: 2,
    },
    {
      w: 5,
      h: 3,
      s: '00s11-02311',
      r: '20323211',
      step: 8,
      shapes: 2,
    },
    // -----------------------------------------------------------------------

    // Level 6 - 10
    {
      w: 5,
      h: 5,
      s: '-01s2-0132-0112',
      r: '0120332',
      step: 7,
      shapes: 2,
    },
    {
      w: 5,
      h: 5,
      s: '-01s2-0113-0133',
      r: '011232123',
      step: 9,
      shapes: 2,
    },
    {
      w: 5,
      h: 5,
      s: '-01s2-0133-0113',
      r: '1012220003332321',
      step: 16,
      shapes: 2,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0211-0203',
      r: '01112303221123230103',
      step: 20,
      shapes: 2,
    },
    {
      w: 5,
      h: 5,
      s: '-0s1-01122-0322',
      r: '011220033232221030113300122',
      step: 27,
      shapes: 2,
    },
    // -----------------------------------------------------------------------

    // Level 11 - 15
    {
      w: 5,
      h: 5,
      s: '-01s2-0102-0333',
      r: '0112223230110003221233',
      step: 22,
      shapes: 1,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0211-0231',
      r: '1203321',
      step: 7,
      shapes: 3,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0223-0223',
      r: '32100112',
      step: 8,
      shapes: 2,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0211-0233',
      r: '32221021110303233210300012321113300122',
      step: 38,
      shapes: 1,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0211-0333-003',
      r: '32221030001232111330012',
      step: 23,
      shapes: 4,
    },
    // -----------------------------------------------------------------------

    // Level 16 - 20
    {
      w: 6,
      h: 4,
      s: '00111-02s01-0222',
      r: '311211033',
      step: 9,
      shapes: 2,
    },
    {
      w: 6,
      h: 4,
      s: 's112-1122-00003',
      r: '2011121123',
      step: 10,
      shapes: 2,
    },
    {
      w: 6,
      h: 4,
      s: '-01s23-01133',
      r: '032321',
      step: 6,
      shapes: 2,
    },
    {
      w: 6,
      h: 4,
      s: '-00s11-02311-0033',
      r: '3322103011012012',
      step: 16,
      shapes: 2,
    },
    {
      w: 6,
      h: 4,
      s: '-0s111-0022-0033',
      r: '21300111123303211122330110333',
      step: 29,
      shapes: 2,
    },
    // -----------------------------------------------------------------------

    // Level 21 - 25
    {
      w: 5,
      h: 3,
      s: 's0x-00112-001',
      axis: 'p2-x5-y3',
      r: '141203441',
      step: 9,
      shapes: 1,
    },
    {
      w: 5,
      h: 3,
      s: '0sx-x102-003',
      axis: 'p1-x5-y3',
      r: '20340032',
      step: 8,
      shapes: 2,
    },
    {
      w: 5,
      h: 3,
      s: '00sx-x011-022',
      axis: 'l4-x8',
      r: '34103',
      step: 5,
      shapes: 2,
    },
    {
      w: 5,
      h: 3,
      s: '0s11-x222-0033',
      axis: 'p1-x5-y3',
      r: '343',
      step: 3,
      shapes: 2,
    },
    {
      w: 5,
      h: 3,
      s: '00s11-x2311',
      axis: 'p2-x3-y3',
      r: '4302341',
      step: 7,
      shapes: 2,
    },
    // -----------------------------------------------------------------------

    // Level 26 -
    {
      w: 7,
      h: 7,
      s: '0x0x0xx-0xxxxxx-0xsx0x-xxxx0x1-0x0x0x-0x0xxx-0x0x02',
      axis: 'p2-x7-y7',
      r: '444224442240044222',
      step: 18,
      shapes: 2,
    },

    /*
    {
      w: 5,
      h: 5,
      s: '-01s2-0303-0333',
      r: '1012220033210033222321',
      step: 22,
      shapes: 1,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0231-0221',
      r: '321221030001201123303222321',
      step: 27,
      shapes: 1,
    },
    {
      w: 5,
      h: 5,
      s: '-0s11-0203-0243',
      r: '32122102110332300301',
      step: 20,
      shapes: 3,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0111-0203',
      r: '3213221003012212110332300301',
      step: 28,
    },
    {
      w: 6,
      h: 4,
      s: '00s1-02111-0011',
      r: '2033212101011231223330',
      step: 22,
      shapes: 1,
    },
    {
      w: 6,
      h: 4,
      s: '0s11-0021-00333',
      r: '2221111003311223333030012322111110033311122333330121002330111',
      step: 61,
      shapes: 1,
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
