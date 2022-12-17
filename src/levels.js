(function() {
  'use strict';

  const levels = [];
  if (typeof window === 'undefined') {
    module.exports = levels;
  } else {
    window.app = window.app || {};
    window.app.levels = levels;
  }

  levels.push(
    {
      w: 33,
      h: 33,
      s: 's----00001111111023000040506666666-000010000010700089(10)0006000006-000010(11)(11)(11)0100(12)000(13)(14)(15)(16)060(17)(17)(17)06-000010(11)(11)(11)0100(18)(19)(20)(21)(22)(23)0(24)060(17)(17)(17)06-000010(11)(11)(11)010(25)(26)00(27)(28)(29)0(30)060(17)(17)(17)06-000010000010(31)(32)00(33)(34)(35)0006000006-000011111110(36)0(37)0(38)0(39)0(40)06666666-000000000000(41)00(42)(43)0(44)-0000(45)(46)(47)00(48)(49)0(50)(51)(52)0(53)0000(54)(55)(56)(57)00(58)(59)-0000(60)(61)0(62)(63)00(64)(65)(66)0(67)0(68)0(69)00(70)(71)0(72)0(73)(74)-0000(75)00(76)(77)(78)(79)(80)000(81)0(82)(83)(84)(85)(86)(87)(88)(89)(90)(91)0(92)-0000(93)(94)(95)0(96)(97)00(98)(99)0(100)(101)0(102)00(103)0(104)0(105)-0000000000(106)(107)0(108)00(109)00000(110)00000(111)-00000(112)(113)(114)(115)(116)00000(117)(118)0(119)(120)0(121)(122)(123)000(124)(125)-0000(126)(127)(128)(129)(130)0(131)0(132)0(133)(134)0(135)0(136)00(137)00(138)(139)0(140)-00000000(141)(142)00(143)0(144)00000000(145)(146)(147)-0000(148)(149)(150)(151)00(152)(153)0(154)(155)0(156)00(157)(158)(158)(158)(158)(158)00(159)-000000000000(160)00(161)(162)(163)0(164)(158)000(158)000(165)-0000(166)(166)(166)(166)(166)(166)(166)0000(167)(168)(169)(170)0(158)0(171)0(158)000(172)-0000(166)00000(166)0(173)0(174)(175)(176)000(158)000(158)00(177)(178)-0000(166)0(179)(179)(179)0(166)00000(180)00(181)(158)(158)(158)(158)(158)-0000(166)0(179)(179)(179)0(166)000(182)(183)00(184)0(185)(186)00(187)0(188)(189)-0000(166)0(179)(179)(179)0(166)0(190)(191)(192)(193)(194)(195)00(196)00(197)(198)(199)0(200)(201)-0000(166)00000(166)0(202)00(203)00(204)(205)(206)(207)0(208)(209)-0000(166)(166)(166)(166)(166)(166)(166)0(210)00(211)(212)00(213)(214)(215)(216)00(217)00(218)',
      r: '1111222222322222222211211212112212222222223000100000013211323211112110000022222221000000222221000002222211111103330000033333303010331111003331030003323111230030311030330013010012232132132100001232132132100012220122121200122012211233310030000330303222010122220001222203212011122330103300003001222222000000330011101211222200333311103303333222220000011111222222222220000000122222220000000033333103103000122232113222220000001012222222123032122000000000303332222201111111111111122222222222222222121232301032222230010330000002222222223333001132121000000000222222300000022222223303013012221000000022222222233000222333301111133333011111333330223002223000000222233233230000000000210221022223322211100000212321322302303011111111113332111112221000222100022210003333333333303232113221030113222100301111211102333012110233012102111032330211032300',
      step: 832,
      subject: 'QR'
    },
    {w: 5, h: 3, s: 's001-00211', r: '22110', step: 5, subject: 'はじまり'},
    {w: 5, h: 4, s: '-0001-20011-s', r: '0100111233', step: 10, subject: '両端'},
    {w: 5, h: 3, s: '001-0222-00s', r: '11003331112230', step: 14, subject: '麦わら帽子'},
    {w: 6, h: 5, s: 's--012111-0111', r: '212123011101220333321', step: 21, subject: '大さじ1'},
    {w: 8, h: 5, s: 's--01111111-0111111-02', r: '2222101123303000122', step: 19},
    {w: 6, h: 4, s: '-0s122-0012', r: '221021110003212333230', step: 21},
    {w: 6, h: 5, s: '-011222-s1122', r: '001112033322210301122211103330', step: 30},
    {w: 6, h: 6, s: 's-00122-01112-001', r: '122210001112333032211112223003', step: 30},
    {w: 6, h: 5, s: 's--00001-002211-00211', r: '111112231223023330030121210011233312230', step: 39, subject: 'ロゴマーク'},
    {w: 6, h: 6, s: 's---00112-001022-00122', r: '1111122231223000100322230003332222103011121223000', step: 49},
    {w: 6, h: 4, s: '-01112-0s333', r: '1033011', step: 7},
    {w: 5, h: 5, s: 's-0111-012-032', r: '22211031100322', step: 14, subject: 'ツッパリ'},
    {w: 6, h: 5, s: 's-01222-01332-011', r: '2222111032301110103', step: 19},
    {w: 6, h: 6, s: 's-0111-002-0222-0033-0003', r: '222221110211000330321112223001033', step: 33},
    {w: 8, h: 6, s: '-001111-002s01-001331-001111', r: '323030111110122230033333211', step: 27, subject: '狭い部屋'},
    {w: 6, h: 6, s: 's01111-000001-001231-401111', r: '211112323230', step: 12, subject: '蛇と卵'},
    {w: 6, h: 6, s: 's01111-000001-001231-401111-001001', r: '22200111123230211030323030113222300122223001011233', step: 50, subject: '首長竜と卵'},
    {w: 9, h: 8, s: 's-011111-012301-011001-014011-011111', r: '211011111123032123222223033333011', step: 33, subject: '封印された部屋'},
    {w: 7, h: 8, s: '000000s-0011-0011-0023-0023-00233-022333', r: '2233320003332222221210003011101223120033333011100122', step: 52, subject: '大きなタコ星人'},
    {w: 9, h: 6, s: '-0000s-0012223-01112333-00022', r: '33332221112100300333211122111', step: 29},
    {w: 8, h: 8, s: 's-001-001122-003322-033322-03442-0044', r: '1111220033321111012222232233333000111000033321322210301111322222110300111223303322300330000011111222200003233223321', step: 115},
    {w: 8, h: 7, s: 's-0000012-3444412-3455012-3400222-333666', r: '221222110321211110332300012210030100332123233321121000032223321012', step: 66, subject: 'どんな形にすればいい？'},
    {w: 10, h: 9, s: '1111101-1234101-101s101-1011101-1000001-1111111', r: '222010010133323232121212100100101123000332222212123302303230332111001013', step: 72, subject: '蚊取り線香'},
    {w: 5, h: 5, s: '-01s2-0303-0333-00x', r: '0332213001222000111232330101222003321', step: 37, subject: 'U字磁石'},
    {w: 6, h: 5, s: 'x0000x--s1122-0122-x0000x', r: '011111223233300301132221110330', step: 30},
    {w: 5, h: 5, s: 's-0110x-012-x3', r: '121122233021103100032', step: 21},
    {w: 7, h: 6, s: 's000xx1-0223311-02003-04-044', r: '22211330001222321', step: 17, subject: '4つのL'},
    {w: 6, h: 6, s: 's-0122x-033-0033-0x', r: '2213001220011201122333', step: 22},
    {w: 6, h: 6, s: 's-0122x-0332-0033-0x', r: '1123032211012112223301103', step: 25},
    {w: 6, h: 6, s: 'xx000x-s0012-00011-x1113', r: '1101121223212300010303323211300122', step: 34},
    {w: 8, h: 6, s: 's-01222-x1332-011x-0000x', r: '1211012211122233333330121111101033223330', step: 40},
    {w: 6, h: 6, s: 'x0000x-0012-01122-03344-03004-x0000s', r: '30100032332332100111122230103331122300', step: 38, subject: 'お相撲さん'},
    {w: 7, h: 5, s: 's--0120a3-xxx0xxx-xxx0xxx', r: '111111223033201123', step: 18, subject: '落とし穴'},
    {w: 5, h: 5, s: 's0aa-011b-010b-0x-0c002', r: '21012233221', step: 11},
    {w: 5, h: 5, s: 'saaa-0110b-c100b-c-00d02', r: '12112223100033321012321', step: 23},
    {w: 5, h: 5, s: 'sa-000bb-cc001-c220x-c2', r: '12121223023301210301', step: 20},
    {w: 5, h: 5, s: 'saa-0a-10b-xc22-002', r: '12220110331112232300', step: 20},
    {w: 5, h: 5, s: 's10a-20b-c000d-0e33-003', r: '122110311223230011003', step: 21},
    {w: 5, h: 5, s: 's01-002ax-033-0b304-000c', r: '22221110003122233300130012120332111333221100', step: 44},
    {w: 5, h: 5, s: 's00a-b1ca-0d-2222-e0f3', r: '111223311003321211223', step: 21},
    {w: 5, h: 5, s: 's00a-0b0a-0bb-1111-0002', r: '112312112230332110100322', step: 24},
    {w: 6, h: 5, s: '001sa-00111x-2201-02bc', r: '3112222333301211110033112230002323233012110112333303001232111210', step: 64},
    {w: 6, h: 6, s: '001sa-xb111x-c001-22-0200d-000xd', r: '203321222233011300010311123311223022323301110', step: 45},
    {w: 6, h: 6, s: '0aa-012-01222b-022cde-0sfff', r: '3000011211123303013332222210301300012232221100110332223301210', step: 61},
    {w: 6, h: 6, s: 'x-000111-0021aa-s221a--x0000x', r: '2111030032321132211100103100312222332303301210', step: 46},
    {w: 6, h: 6, s: '001s0a-b011-bc12de-00220e-f022', r: '1212230222333000022212103010310032212223330100012321', step: 52},
    {w: 6, h: 6, s: '000aa-0x0sa-0011a-02103-00113-00bb', r: '1223001223212330330111100322210033321', step: 37},
    {w: 6, h: 6, s: '0000a-0x0sa-0011a-021b3-00113-00cc', r: '033322123221100301332211', step: 24},
    {w: 6, h: 5, s: 's-t-0001-02211-0211', r: '22101111230122230012223302300130', step: 32},
    {w: 6, h: 5, s: 'x00x-001222-0s332t-0x00x', r: '001220332221013300112030012', step: 27},
    {w: 9, h: 8, s: '-0ssssss-0s1230s-0s4000s-0s0000s-0s0005s-0ssssss', r: '311133200', step: 9},
  );

  Object.freeze(levels);
  for (const level of levels) {
    Object.freeze(level);
  }
})();
