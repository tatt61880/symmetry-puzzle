(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsLine = [];
  levelsLine.push(
    {
      w: 33,
      h: 33,
      s: 's----00001111111023000040506666666-000010000010700089(10)0006000006-000010(11)(11)(11)0100(12)000(13)(14)(15)(16)060(17)(17)(17)06-000010(11)(11)(11)0100(18)(19)(20)(21)(22)(23)0(24)060(17)(17)(17)06-000010(11)(11)(11)010(25)(26)00(27)(28)(29)0(30)060(17)(17)(17)06-000010000010(31)(32)00(33)(34)(35)0006000006-000011111110(36)0(37)0(38)0(39)0(40)06666666-000000000000(41)00(42)(43)0(44)-0000(45)(46)(47)00(48)(49)0(50)(51)(52)0(53)0000(54)(55)(56)(57)00(58)(59)-0000(60)(61)0(62)(63)00(64)(65)(66)0(67)0(68)0(69)00(70)(71)0(72)0(73)(74)-0000(75)00(76)(77)(78)(79)(80)000(81)0(82)(83)(84)(85)(86)(87)(88)(89)(90)(91)0(92)-0000(93)(94)(95)0(96)(97)00(98)(99)0(100)(101)0(102)00(103)0(104)0(105)-0000000000(106)(107)0(108)00(109)00000(110)00000(111)-00000(112)(113)(114)(115)(116)00000(117)(118)0(119)(120)0(121)(122)(123)000(124)(125)-0000(126)(127)(128)(129)(130)0(131)0(132)0(133)(134)0(135)0(136)00(137)00(138)(139)0(140)-00000000(141)(142)00(143)0(144)00000000(145)(146)(147)-0000(148)(149)(150)(151)00(152)(153)0(154)(155)0(156)00(157)(158)(158)(158)(158)(158)00(159)-000000000000(160)00(161)(162)(163)0(164)(158)000(158)000(165)-0000(166)(166)(166)(166)(166)(166)(166)0000(167)(168)(169)(170)0(158)0(171)0(158)000(172)-0000(166)00000(166)0(173)0(174)(175)(176)000(158)000(158)00(177)(178)-0000(166)0(179)(179)(179)0(166)00000(180)00(181)(158)(158)(158)(158)(158)-0000(166)0(179)(179)(179)0(166)000(182)(183)00(184)0(185)(186)00(187)0(188)(189)-0000(166)0(179)(179)(179)0(166)0(190)(191)(192)(193)(194)(195)00(196)00(197)(198)(199)0(200)(201)-0000(166)00000(166)0(202)00(203)00(204)(205)(206)(207)0(208)(209)-0000(166)(166)(166)(166)(166)(166)(166)0(210)00(211)(212)00(213)(214)(215)(216)00(217)00(218)',
      r: '2222111101233222222221133211332113321132213321133221133221222222211111111000000022222100000222221000002222222100000002222222100000002222210000022222210000002222222100000000002222221101111031000010333311111033333111122110030121003333333111111100333333311111110103323333331111110333333300000000123032200332123303320112303203200322003220111111111111111112222222222333033322123301001112300111212333032200322003220032211111122222323000010333332222211122121002211000331122230103230110333331111222222300001032301103333333331111111221222222330000000121122332301032222300000100100331122223301001033333333111111123331112333112222223300022233333233302111030321232300000002222223000000221111111122223332300000001111222111122111123032112333330331122333021110303212323000000000000333021222221122223212323000000000001032222211111111033300000000011111000000000033333333333321012',
      step: 862,
      subject: 'QR',
    },
    {
      w: 5,
      h: 3,
      s: '00001-s0011-0002',
      r: '1121',
      step: 4,
      subject: 'はじまり',
    },
    {
      w: 5,
      h: 3,
      s: '00001-s0211',
      r: '1210301',
      step: 7,
      subject: '⠐⠚',
    },
    {
      w: 5,
      h: 3,
      s: '0s-0102-01',
      r: '321',
      step: 3,
      subject: '⠰⠐',
    },
    {
      w: 5,
      h: 3,
      s: '-01102-0010s',
      r: '30033321',
      step: 8,
      subject: '⠲⠐',
    },
    {
      w: 5,
      h: 3,
      s: '00111-002s',
      r: '3230',
      step: 4,
      subject: '⠘⠉',
    },
    {
      w: 5,
      h: 3,
      s: 's0011-00211-00001',
      r: '12210',
      step: 5,
      subject: '⠐⠻',
    },
    {
      w: 5,
      h: 3,
      s: 's-1122-1',
      r: '11112230103',
      step: 11,
      subject: '⠖⠒',
    },
    {
      w: 5,
      h: 3,
      s: '-01002-0s222',
      r: '301',
      step: 3,
      subject: '⠢⠴',
    },
    {
      w: 6,
      h: 3,
      s: '000s11-022',
      r: '3332111',
      step: 7,
      subject: '⠒⠉',
    },
    {
      w: 6,
      h: 3,
      s: '-01102-01s22',
      r: '0233011',
      step: 7,
      subject: '⠖⠴',
    },
    {
      w: 5,
      h: 5,
      s: 's01--0022-002-002',
      r: '1112122300',
      step: 10,
      subject: '⡗',
    },
    {
      w: 5,
      h: 5,
      s: '-111-s21',
      r: '021',
      step: 3,
      subject: '⠲⠆',
    },
    {
      w: 5,
      h: 5,
      s: '-111-s01-022',
      r: '2112100',
      step: 7,
      subject: '⢒⡆',
    },
    {
      w: 5,
      h: 5,
      s: 's-1112-0102',
      r: '1112123',
      step: 7,
    },
    {
      w: 5,
      h: 5,
      s: '-0s1-0011-0211',
      r: '012',
      step: 3,
      subject: '⠠⠷',
    },
    {
      w: 5,
      h: 4,
      s: '-0111-0s12',
      r: '01',
      step: 2,
      subject: 'T.',
    },
    {
      w: 6,
      h: 4,
      s: '010022-011s02-011',
      r: '22333011',
      step: 8,
    },
    {
      w: 6,
      h: 4,
      s: '-0012-0s122',
      r: '210',
      step: 3,
      subject: 'iv',
    },
    {
      w: 6,
      h: 5,
      s: 's0011-222-022',
      r: '1112223330111',
      step: 13,
      subject: '⠐⠶⠉',
    },
    {
      w: 6,
      h: 5,
      s: '--11s222-010002',
      r: '223003011',
      step: 9,
    }
    /*
    {
      w: 6,
      h: 5,
      s: '--s11222-001002',
      r: '21001',
      step: 5,
    },
    {
      w: 8,
      h: 4,
      s: 's-0110112-0011102',
      r: '1111112323011123333',
      step: 19,
    },
    {
      w: 6,
      h: 5,
      s: '-00s11-22201-002',
      r: '011122323022330111',
      step: 18,
    },
    {
      w: 6,
      h: 5,
      s: '-s11222-0012',
      r: '0122321110103312221000',
      step: 22,
    },
    {
      w: 6,
      h: 5,
      s: 's01-0011-2211-22',
      r: '1122223011110003223',
      step: 19,
    },
    {
      w: 7,
      h: 5,
      s: 's-001102-000102-0111',
      r: '1111112232302233330011211100',
      step: 28,
    },
    {
      w: 8,
      h: 5,
      s: '-00011-0000102-0s11122',
      r: '01101201',
      step: 8,
    },
    {
      w: 6,
      h: 5,
      s: 's--00001-002211-00211',
      r: '1111122312230023333000111322332111',
      step: 34,
    },
    {
      w: 6,
      h: 6,
      s: 's---01022-0112-1102',
      r: '1111122223000223303321011211033331112223000',
      step: 43,
    },
    {
      w: 5,
      h: 4,
      s: '-0s001--02003',
      r: '23211000112',
      step: 11,
      subject: '...',
    },
    {
      w: 7,
      h: 5,
      s: 's--0111-00002-033333',
      r: '221123321',
      step: 9,
      subject: '... . .....',
    },
    {
      w: 7,
      h: 5,
      s: '000000s--0111-00022-033333',
      r: '222230033032',
      step: 12,
      subject: '... .. .....',
    },
    {
      w: 7,
      h: 5,
      s: '0s--0011-0022-033333',
      r: '221110123233',
      step: 12,
      subject: '.. .. .....',
    },
    {
      w: 7,
      h: 5,
      s: 's-010023-011223',
      r: '1111201123',
      step: 10,
      subject: 'vvi',
    },
    {
      w: 7,
      h: 5,
      s: 's-011223-001203',
      r: '12232111210',
      step: 11,
      subject: 'vvi',
    },
    {
      w: 7,
      h: 6,
      s: 's-011022-001002-00003-000033',
      r: '1111112223330001222',
      step: 19,
      subject: 'vvv',
    },
    {
      w: 6,
      h: 6,
      s: '-00s1-0021-02211-0033',
      r: '01123',
      step: 5,
      subject: 'vLi',
    },
    {
      w: 6,
      h: 6,
      s: '-0s001-02001-02211-0033',
      r: '11122232300330111003203222321',
      step: 29,
      subject: 'vJi',
    },
    {
      w: 6,
      h: 6,
      s: '11111-120s1-10001-10001-01111',
      r: '1233301',
      step: 7,
      subject: '封印された部屋の中1',
    },
    {
      w: 6,
      h: 6,
      s: '11111-12s31-10001-10001-01111',
      r: '12220303',
      step: 8,
      subject: '封印された部屋の中2',
    },
    {
      w: 6,
      h: 6,
      s: '1111-12311-10s01-10001-01111',
      r: '112203303',
      step: 9,
      subject: '封印された部屋の中3',
    },
    {
      w: 6,
      h: 6,
      s: '11111-120s1-12301-10001-11111',
      r: '222',
      step: 3,
      subject: '封印された部屋の中4',
    },
    {
      w: 6,
      h: 6,
      s: '11111-120s1-12231-10001-11111',
      r: '322',
      step: 3,
      subject: '封印された部屋の中5',
    },
    {
      w: 7,
      h: 6,
      s: '00111-011s11-010001-012311-00011',
      r: '22010',
      step: 5,
    },
    {
      w: 7,
      h: 6,
      s: '011111-011s11-011201-013411-00011',
      r: '2032123',
      step: 7,
    },
    {
      w: 7,
      h: 6,
      s: '011111-010s11-011231-010411-01011',
      r: '122300132',
      step: 9,
    },
    {
      w: 7,
      h: 6,
      s: '001111-011s11-011231-014511-00011',
      r: '201220033122',
      step: 12,
    },
    {
      w: 8,
      h: 8,
      s: 's-011111-012301-010001-011001-011111',
      r: '123222222100',
      step: 12,
      subject: '封印された部屋1',
    },
    {
      w: 8,
      h: 8,
      s: 's-011111-011231-014001-010011-011111',
      r: '210111111233',
      step: 12,
      subject: '封印された部屋2',
    },
    {
      w: 8,
      h: 7,
      s: 's-011111-011201-013401-011001-011111',
      r: '2101111112303233333211',
      step: 22,
      subject: '封印された部屋3',
    },
    {
      w: 8,
      h: 8,
      s: 's-011111-012341-010001-011001-011111',
      r: '1111121222222300103',
      step: 19,
      subject: '封印された部屋α',
    },
    {
      w: 8,
      h: 8,
      s: 's-011111-012341-010001-011001-001111',
      r: '122322222100211111000003032',
      step: 27,
      subject: '封印された部屋β',
    },
    {
      w: 6,
      h: 6,
      s: 's-01111-00201-03041-03301',
      r: '222112211103230',
      step: 15,
      subject: '<:>',
    },
    {
      w: 7,
      h: 7,
      s: 's-010222-0102-00304-003044-033004',
      r: '12232221121110003033323211',
      step: 26,
      subject: 'iLJS',
    },
    {
      w: 7,
      h: 7,
      s: 's-010222-0102-00304-033044-030004',
      r: '2122113300011220033211110122',
      step: 28,
      subject: 'iLZS',
    },
    {
      w: 7,
      h: 7,
      s: 's-010222-0102-003044-033004-030004',
      r: '11111123323222233003001122102122110333230',
      step: 41,
      subject: 'iLZL',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00302-003004-033004',
      r: '21221220113033000111121230032233321',
      step: 35,
      subject: 'LZJi',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00302-003004-033044',
      r: '11111122233032222333012103012100111223230',
      step: 41,
      subject: 'LZJv',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00302-033004-030044',
      r: '222103011212222111033230330',
      step: 27,
      subject: 'LZZv',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00302-033004-030444',
      r: '21221300012',
      step: 11,
      subject: 'LZZL',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00342-033005-030555',
      r: '210111121223212333101000032',
      step: 27,
      subject: 'LZ.ZL',
    },
    {
      w: 12,
      h: 8,
      s: 's-011222333444-000002003004-000222003004-000000003004-000000333004-000000000004-000000000444',
      r: '123210123211010121',
      step: 18,
      subject: '-コココ',
    },
    {
      w: 7,
      h: 6,
      s: '000000s-001-00022-0333-004444-055555',
      r: '22223003303',
      step: 11,
      subject: '12345',
    },
    {
      w: 9,
      h: 8,
      s: '1111101-1234101-101s101-1011101-1000001-1111111',
      r: '12012003203321323212102121000110300332101222221230333230003',
      step: 59,
      subject: '蚊取り線香',
    },
    {
      w: 6,
      h: 6,
      s: 's-0100x-012-002-0x222',
      r: '212212210033000122321',
      step: 21,
    },
    {
      w: 7,
      h: 7,
      s: '-011102-001022-03xsx2-03304-030444',
      r: '010033332101232322221103002122111103',
      step: 36,
      subject: '4つのT',
    },
    {
      w: 7,
      h: 7,
      s: 's-001x2-011x22-000x-033044-00304',
      r: '1122001111222230323300001122',
      step: 28,
      subject: '4つのv',
    },
    {
      w: 6,
      h: 6,
      s: 's0000x-00122-01102-03044-03304-x0000x',
      r: '222112210303300122211',
      step: 21,
      subject: '4つのv',
    },
    {
      w: 6,
      h: 6,
      s: 's0000x-0112-01022-03344-00304-x0000x',
      r: '123222121021101000331122230010322223301033',
      step: 42,
      subject: '4つのv',
    },
    {
      w: 6,
      h: 6,
      s: 's0000x-0112-01022-03344-03004-x0000x',
      r: '11120333222122103030001111212312233',
      step: 35,
      subject: '4つのv',
    },
    {
      w: 5,
      h: 5,
      s: 's0a-0111-01bb-0bb2',
      r: '11133322221030121211033230',
      step: 26,
    },
    {
      w: 11,
      h: 5,
      s: 'saaaaa1-0bbbbb22-0ccccc33-0ddddd44-0eeeee55',
      r: '2213211332111',
      step: 13,
    },
    {
      w: 8,
      h: 5,
      s: 'saa1-0bb22-0cc3-0dd44-0ee555',
      r: '222211330000123221011110032111223010333',
      step: 39,
    },
    {
      w: 6,
      h: 6,
      s: 's-01a22-011b2-03c44-033d4',
      r: '11201112222233303030001122001112232033',
      step: 38,
    },
    {
      w: 7,
      h: 7,
      s: 's-0x0x1x-00222-0x0x3x-00443-0x5x0x',
      r: '1111112233220011003322003333221133221133221102330011',
      step: 52,
      subject: '格子1',
    },
    {
      w: 9,
      h: 7,
      s: 's-0x0x0x1x-0220301-0x0x3x0x-0040055-0x0x0x0x',
      r: '1111112033333322221111002213333300111',
      step: 37,
      subject: '格子2',
    },
    {
      w: 9,
      h: 7,
      s: 's-0x1x0x0x-02203-0x0x3x0x-0044305-0x0x0x5x',
      r: '11112200333322111100332033221133222211110022110233333300111',
      step: 59,
      subject: '格子3',
    },
    {
      w: 7,
      h: 5,
      s: 'x00a00x-000s1-022x11-0022-000b',
      r: '3011211222333311001103303323',
      step: 28,
      subject: 'zv',
    },
    {
      w: 7,
      h: 5,
      s: 'x00a00x-00bs1-022x11-0022c-000d',
      r: '311012123122333301333211111300011232333311100332',
      step: 48,
      subject: 'zv',
    },
    {
      w: 7,
      h: 7,
      s: '-011x22-011x22-0a0s0b-033044-033x44',
      r: '21013332330113300012232100011122',
      step: 32,
      subject: '4つの四角',
    },
    {
      w: 6,
      h: 5,
      s: 'x-s-t001-x2211-x211',
      r: '1011123312321200333',
      step: 19,
      subject: '双子と旧ロゴマーク',
    },
    {
      w: 9,
      h: 6,
      s: '011222333-1s12t23u3-111022333-000000xxx-000000x0x-000000xxx',
      r: '2223000333222111000333221210',
      subject: '三つ子',
      step: 28,
    },
    {
      w: 9,
      h: 9,
      s: '111xxx022-1s1x0x2t2-011xxx222-000000333-0000003u3-000000333-000000xxx-000000x0x-000000xxx',
      r: '333222333221210',
      step: 15,
      subject: '三つ子2',
    },
    {
      w: 9,
      h: 9,
      s: '011220333-1s12t23u3-111222333-444000xxx-4v4000x0x-044000xxx',
      r: '1112222223333300030111122',
      step: 25,
      subject: '四つ子',
    },
    {
      w: 9,
      h: 9,
      s: '011000222-1s10002t2-11100022-333aaa44-3u3ava4w4-033aaa444-000xxx-000x0x-000xxx',
      r: '11100033321221011',
      step: 17,
      subject: '五つ子？',
    },
    {
      w: 9,
      h: 9,
      s: '011000222-1s10002t2-11100022-33344455-3u34v45w5-033444555-000xxx-000x0x-000xxx',
      r: '113212330',
      step: 9,
      subject: '五つ子',
    },
    {
      w: 9,
      h: 9,
      s: '011220333-1s12t23u3-111222333-444555-4v45w5-04455-000000xxx-000000x0x-000000xxx',
      r: '1112223300033232210110333222',
      step: 28,
      subject: '五つ子',
    },
    {
      w: 9,
      h: 9,
      s: '011220333-1s12t23u3-111222333-444555666-4v45a56w6-44405566-000xxx-000x0x-000xxx',
      r: '2221000111000333123223033',
      step: 25,
      subject: '六つ子',
    },
    {
      w: 10,
      h: 9,
      s: '-0sssssss-0s01022s-0s11000s-0s30000s-0s30040s-0s00040s-0sssssss',
      r: '01123323',
      step: 8,
      subject: '空洞1',
    },
    {
      w: 10,
      h: 10,
      s: '0sssssss-0s00001s-0s22000s-0s30444s-0s30000s-0s00050s-0sssssss',
      r: '311123312010',
      step: 12,
      subject: '空洞2',
    },
    {
      w: 10,
      h: 10,
      s: '0sssssss-0s10002s-0s33000s-0s00044s-0s55000s-0s00006s-0sssssss',
      r: '223111200330',
      step: 12,
      subject: '空洞3',
    },
    {
      w: 11,
      h: 11,
      s: 'sssssss-s11223ss-s112200s-s000000s-s00000ss-s00000s-s00ssss-ssss',
      r: '1222003012231113300',
      step: 19,
      subject: 'いびつな空洞',
    },
    {
      w: 11,
      h: 11,
      s: '0000000sss-000000ss1s-00000ss23s-0000ss00ss-000ss00ss-00ss00ss-0ss00ss-ss00ss-s44ss-ssss',
      r: '20120312031203120312031',
      step: 23,
      subject: 'ジグザグ空洞',
    },
    {
      w: 10,
      h: 10,
      s: '0000s-00sssss-0ssts1ss-0s02s00s-ss0sss0ss-0s00s00s-0ss000ss-00sssss-0000s',
      r: '12203312232011322011230',
      step: 23,
      subject: 'グルグル空洞1',
    },
    {
      w: 14,
      h: 14,
      s: '0000sssss-00sssts0sss-0ss001s000ss-0s00sss0s00s-ss0ss2s0ss0ss-s00s00s00s00s-s0ss0sss0ss0s-s00s00s00s00s-ss0ss000ss0ss-0s00sssss00s-0ss000s000ss-00sss000sss-0000sssss',
      r: '12233031220332212033122320112232011232110123201121030112103012100301210031023300102330102330312223201122312033122033210',
      step: 119,
      subject: 'グルグル空洞2',
    },
    {
      w: 10,
      h: 10,
      s: 'sss000sss-s1ss0ss2s-s00sss00s-ss00s00ss-0ss030ss-ss00s00ss-s00sss00s-s4ss0ss5s-sss000sss',
      r: '12302102302102301231032012032013',
      step: 32,
      subject: 'X形の空洞1',
    },
    {
      w: 10,
      h: 10,
      s: 'sss000sss-s1ss0ss2s-s10sss0as-ss00s00ss-0ss000ss-ss00s00ss-s00sss00s-s3ss0ss4s-sss000sss',
      r: '210312310312310312302130210321023012310312',
      step: 42,
      subject: 'X形の空洞2',
    },
    {
      w: 10,
      h: 10,
      s: 'sss000sss-s1ss0ss2s-s10sss0as-ss00s00ss-0ss000ss-ss00s00ss-sb0sss0cs-s3ss0ss4s-sss000sss',
      r: '13213021302130120312031203210312302102310312310312',
      step: 50,
      subject: 'X形の空洞3',
    },
    {
      w: 9,
      h: 9,
      s: 'ssssssss-s000000s-s01ttt0s-s0100t0s-s0tu2t0s-s0tttt0s-s0000003-sssssss3',
      r: '10033031210233012200322221321111',
      step: 32,
      subject: 'マトリョーシカ',
    },
    {
      w: 8,
      h: 7,
      s: 'sssss0s-s1t2s0s-s0sus0s-s0sss0s-s00000s-sssssss',
      r: '20312220032320322110132221110000121300030',
      step: 41,
      subject: '蚊取り線香2-1',
    },
    {
      w: 8,
      h: 8,
      s: 'x-sssss0s-st1us0s-s0s2s0s-s0sss0s-s00000s-sssssss',
      r: '2223031221123201011001213000312333330001222223120333323001',
      step: 58,
      subject: '蚊取り線香2-2',
    },
    {
      w: 8,
      h: 7,
      s: 'sssss0s-s1t2s0s-susvs0s-s3sss0s-s00000s-sssssss',
      r: '122033221101322211100001213030130321223201001121103301301',
      step: 57,
      subject: '蚊取り線香3-1',
    },
    {
      w: 8,
      h: 8,
      s: 'x-sssss0s-st1us0s-s2s3s0s-svsss0s-s00000s-sssssss',
      r: '122112320101101332221232010102100012130312333330001123300111101120322221231233032101022',
      step: 87,
      subject: '蚊取り線香3-2',
    },
    {
      w: 10,
      h: 7,
      s: '000000000s-000000000s-000000000s-11ttaaa22s-u11ttav22-ubbb33vvv-uub33cccc',
      r: '022101210021301320301201',
      step: 24,
      subject: '4列消し',
    },
    {
      w: 7,
      h: 6,
      s: 's-0001122-0003112-0403332-044-004',
      r: '1112323322210002122111100233030300112122122333333000111321012033332221003012111112303332210',
      step: 91,
    },
    {
      w: 8,
      h: 7,
      s: 's-0001122-0003112-0403332-0445555-004',
      r: '222221000212211111000030333212122330023211111031222301033223330',
      step: 63,
    },
    {
      w: 8,
      h: 7,
      s: 's-01122333-0114223-050444-0556666-005',
      r: '11123221232230301100222211111003331112230103311000331223',
      step: 56,
    },
    {
      w: 8,
      h: 6,
      s: 's-01122-011322-040333-0445555-004',
      r: '2123222102110323001211111033110003221223333010130033321011220011123333',
      step: 70,
    },
    {
      w: 8,
      h: 7,
      s: 's-0112233-0114223-0504443-0556666-005',
      r: '111120111222233022333213330111030330001222321000011112',
      step: 54,
    }
    */
  );

  Object.freeze(levelsLine);
  for (const level of levelsLine) {
    Object.freeze(level);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsLine = levelsLine;
  } else {
    module.exports = levelsLine;
  }
})();
