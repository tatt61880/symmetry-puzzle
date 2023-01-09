(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsReflection = [];
  levelsReflection.push(
    {
      w: 33,
      h: 33,
      s: 's----00001111111023000040506666666-000010000010700089(10)0006000006-000010(11)(11)(11)0100(12)000(13)(14)(15)(16)060(17)(17)(17)06-000010(11)(11)(11)0100(18)(19)(20)(21)(22)(23)0(24)060(17)(17)(17)06-000010(11)(11)(11)010(25)(26)00(27)(28)(29)0(30)060(17)(17)(17)06-000010000010(31)(32)00(33)(34)(35)0006000006-000011111110(36)0(37)0(38)0(39)0(40)06666666-000000000000(41)00(42)(43)0(44)-0000(45)(46)(47)00(48)(49)0(50)(51)(52)0(53)0000(54)(55)(56)(57)00(58)(59)-0000(60)(61)0(62)(63)00(64)(65)(66)0(67)0(68)0(69)00(70)(71)0(72)0(73)(74)-0000(75)00(76)(77)(78)(79)(80)000(81)0(82)(83)(84)(85)(86)(87)(88)(89)(90)(91)0(92)-0000(93)(94)(95)0(96)(97)00(98)(99)0(100)(101)0(102)00(103)0(104)0(105)-0000000000(106)(107)0(108)00(109)00000(110)00000(111)-00000(112)(113)(114)(115)(116)00000(117)(118)0(119)(120)0(121)(122)(123)000(124)(125)-0000(126)(127)(128)(129)(130)0(131)0(132)0(133)(134)0(135)0(136)00(137)00(138)(139)0(140)-00000000(141)(142)00(143)0(144)00000000(145)(146)(147)-0000(148)(149)(150)(151)00(152)(153)0(154)(155)0(156)00(157)(158)(158)(158)(158)(158)00(159)-000000000000(160)00(161)(162)(163)0(164)(158)000(158)000(165)-0000(166)(166)(166)(166)(166)(166)(166)0000(167)(168)(169)(170)0(158)0(171)0(158)000(172)-0000(166)00000(166)0(173)0(174)(175)(176)000(158)000(158)00(177)(178)-0000(166)0(179)(179)(179)0(166)00000(180)00(181)(158)(158)(158)(158)(158)-0000(166)0(179)(179)(179)0(166)000(182)(183)00(184)0(185)(186)00(187)0(188)(189)-0000(166)0(179)(179)(179)0(166)0(190)(191)(192)(193)(194)(195)00(196)00(197)(198)(199)0(200)(201)-0000(166)00000(166)0(202)00(203)00(204)(205)(206)(207)0(208)(209)-0000(166)(166)(166)(166)(166)(166)(166)0(210)00(211)(212)00(213)(214)(215)(216)00(217)00(218)',
      r: '2222111101233222222221133211332113321132213321133221133221222222211111111000000022222100000222221000002222222100000002222222100000002222210000022222210000002222222100000000002222221101111031000010333311111033333111122110030121003333333111111100333333311111110103323333331111110333333300000000123032200332123303320112303203200322003220111111111111111112222222222333033322123301001112303330111111212333032200322003220032211111122222323000010333332222211122121002211000331122230103230110333331111222222300001032301103333333331111111221222222330000000121122332301032222300000100100331122223301001033333333111111123331112333112222223300022233333233302111030321232300000002222223000000221111111122223332300000001111222111122111123032112333330331122333021110303212323000000000000333021222221122223212323000000000001032222211111111033300000000011111000000000033333333333321012',
      step: 868,
      subject: 'QR'
    },
    { w: 5, h: 3, s: 's0001-00211', r: '1123211', step: 7, subject: 'はじまり' },
    { w: 5, h: 5, s: '001-001-0011--0s2', r: '110100322', step: 9, subject: '両端' },
    { w: 6, h: 4, s: '-0s122-0012', r: '012', step: 3 },
    { w: 6, h: 5, s: '-s11222-01122', r: '011120333222103011222111033', step: 27 },
    { w: 6, h: 5, s: 's--00001-002211-00211', r: '1111122312230023333000111322332111', step: 34 },
    { w: 6, h: 6, s: 's---01022-0112-1102', r: '1111122223000223303321011211033331112223000', step: 43 },
    { w: 5, h: 4, s: '-0s001--02003', r: '23211000112', step: 11 },
    { w: 7, h: 6, s: 's-011022-001002-000033-000033', r: '1111112223303001222', step: 19 },
    { w: 6, h: 6, s: '-00s1-0021-02211-0033', r: '01123', step: 5 },
    { w: 6, h: 6, s: '-0s001-02001-02211-0033', r: '11122232300330111003203222321', step: 29 },
    { w: 7, h: 7, s: 's-010222-0102-00304-003044-033004', r: '12232221121110003033323211', step: 26 },
    { w: 7, h: 7, s: 's-010222-0102-00304-033044-030004', r: '2122113300011220033211110122', step: 28 },
    { w: 7, h: 7, s: 's-011102-010022-00302-003004-033004', r: '21221220113033000111121230032233321', step: 35 },
    { w: 7, h: 7, s: 's-011102-010022-00302-003004-033044', r: '11111122233032222333012103012100111223230', step: 41 },
    { w: 9, h: 8, s: '1111101-1234101-101s101-1011101-1000001-1111111', r: '12012003203321323212102121000110300332101222221230333230003', step: 59, subject: '蚊取り線香' },
    { w: 6, h: 6, s: 's-0100x-012-002-0x222', r: '212212210033000122321', step: 21 },
    { w: 7, h: 7, s: '-011102-001022-03xsx2-03304-030444', r: '010033332101232322221103002122111103', step: 36, subject: '4つのT' },
    { w: 7, h: 7, s: 's-001x2-011022-000x-033044-00304', r: '11221100122333323221', step: 20 },
    { w: 9, h: 7, s: 's-0x0x0x1x-0220301-0x0x3x0x-0040055-0x0x0x0x', r: '1111112033333322221111002213333300111', step: 37, subject: '格子' },
    { w: 9, h: 7, s: 's-0x1x0x0x-02203-0x0x3x0x-0044305-0x0x0x5x', r: '11112200333322111100332033221133222211110022110233333300111', step: 59, subject: '格子2' },
    { w: 7, h: 7, s: '-011x22-011x22-0a0s0b-033044-033x44', r: '21013332330113300012232100011122', step: 32, subject: '4つの四角' },
    { w: 9, h: 9, s: 'ssssssss-s000000s-s01ttt0s-s010ut0s-s0t02t0s-s0tttt0s-s0000003-sssssss3', r: '10333031210233012200322221321111', step: 32, subject: 'マトリョーシカ' },
    { w: 9, h: 9, s: '011220333-1s12t23u3-111222333-444555-4v45w5-04455-000000xxx-000000x0x-000000xxx', r: '1112223300033232210110333222', step: 28, subject: '五つ子' },
  );

  Object.freeze(levelsReflection);
  for (const level of levelsReflection) {
    Object.freeze(level);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsReflection = levelsReflection;
  } else {
    module.exports = levelsReflection;
  }
})();
