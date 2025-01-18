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
      shapes: 1,
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
    // -----------------------------------------------------------------------

    // Level 11 - 15
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

    // Level 16 - 20
    {
      w: 5,
      h: 5,
      s: '0102-0102-01s2-033',
      r: '122333012100',
      step: 12,
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
      s: '-0s01-0211-0223',
      r: '011123032112223001033032',
      step: 24,
      shapes: 2,
    },
    {
      w: 5,
      h: 5,
      s: '-0s01-0211-0333-003',
      r: '32221030001232111330012',
      step: 23,
      shapes: 4,
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

    // Level 21 - 25
    {
      w: 6,
      h: 5,
      s: '0s0101-000111--222-202',
      axis: 'l1-x6',
      r: '42333',
      step: 5,
      shapes: 2,
    },
    {
      w: 6,
      h: 5,
      s: '111-1s-102033-000303-000333',
      axis: 'p2-x6-y4',
      r: '414003',
      step: 6,
      shapes: 2,
    },
    {
      w: 6,
      h: 5,
      s: '-s12-333-303-333',
      axis: 'p2-x6-y6',
      r: '1011234441100410',
      step: 16,
      shapes: 2,
    },
    {
      w: 6,
      h: 5,
      s: 's0001-000011-233-003-003',
      axis: 'l3-x2',
      r: '22112233012433322212433',
      step: 23,
      shapes: 2,
    },
    {
      w: 6,
      h: 5,
      s: 's0001-000111-00002-33-03',
      axis: 'p2-x6-y4',
      r: '111201141411',
      step: 12,
      shapes: 5,
    },
    // -----------------------------------------------------------------------

    // Level 26 - 30
    {
      w: 6,
      h: 4,
      s: '00111-02s01-0222-0x00x',
      r: '311211033',
      step: 9,
      shapes: 2,
    },
    {
      w: 6,
      h: 4,
      s: 's112-1122-00003-00x',
      r: '2101112033321',
      step: 13,
      shapes: 2,
    },
    {
      w: 6,
      h: 4,
      s: '-01s23-01133-0x00x',
      r: '31221011033',
      step: 11,
      shapes: 2,
    },
    {
      w: 6,
      h: 4,
      s: '-00s11-02311-00330x',
      r: '33221030011111230333321012012',
      step: 29,
      shapes: 2,
    },
    {
      w: 6,
      h: 4,
      s: 's0000x-0111a-0022-0033',
      r: '1111223100333321101233322110330111',
      step: 34,
      shapes: 2,
    },

    // -----------------------------------------------------------------------

    // Level 31 - 35
    {
      w: 5,
      h: 5,
      s: '-012a-sb2aa-0bb3',
      r: '221110302110332230',
      step: 18,
      shapes: 2,
    },
    {
      w: 5,
      h: 5,
      s: '00s-0aa1-0111-0233',
      r: '332213221003011',
      step: 15,
      shapes: 2,
    },
    {
      w: 5,
      h: 5,
      s: '-sa1bb-0111-0233',
      r: '2221111032333021110100323',
      step: 25,
      shapes: 3,
    },
    {
      w: 5,
      h: 5,
      s: '00s-01aa-02a3-0233',
      r: '3201112222301000321230332',
      step: 25,
      shapes: 2,
    },
    {
      w: 5,
      h: 5,
      s: '0s01-0211-03a4-03a4',
      r: '322103012222111002323300',
      step: 24,
      shapes: 3,
    },
    // -----------------------------------------------------------------------

    // Level 36 - 40
    {
      w: 6,
      h: 6,
      s: 's1000x-11022x-00022-03344-03044x-x0000x',
      axis: 'p1-x6-y6',
      r: '1204042322110033433114001400',
      step: 28,
      shapes: 2,
    },
    {
      w: 6,
      h: 6,
      s: '00x-s11aaa-01223-01003-04443',
      r: '22221111100002222333330000012111233032',
      step: 38,
      shapes: 2,
    },
    {
      w: 6,
      h: 6,
      s: 'xxs0xx-x0001-002311-02231-04200x-xx00xx',
      axis: 'p2-x6-y6',
      r: '1440124211210',
      step: 13,
      shapes: 4,
    },
    {
      w: 6,
      h: 6,
      s: 's-0aa11-0aaa1-02033-02233',
      r: '2123222111110003311222300223303301',
      step: 34,
      shapes: 3,
    },
    {
      w: 6,
      h: 6,
      s: 'xs00xx-x0120x-01122-0033-03344-xx00xx',
      axis: 'p2-x6-y6',
      r: '144011003212332341112011402300211103',
      step: 36,
      shapes: 3,
    },

    /*
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
      s: '-0s01-0211-0233',
      r: '32221021110303233210300012321113300122',
      step: 38,
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
    {
      w: 5,
      h: 5,
      s: 'x000x-0sx-01a2-00x-x0x0x',
      r: '2001121233',
      step: 10,
      shapes: 2,
    },
    {
      w: 12,
      h: 7,
      s: 'sssssssss-s01s0000s-s0ss0ss0s-s0000s20s-sssssssss',
      r: '13221110033',
      step: 11,
      shapes: 2,
    },
    /**/
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
