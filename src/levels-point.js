(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsPoint = [];
  levelsPoint.push(
    {
      w: 33,
      h: 33,
      s: 's----00001111111023000040506666666-000010000010700089(10)0006000006-000010(11)(11)(11)0100(12)000(13)(14)(15)(16)060(17)(17)(17)06-000010(11)(11)(11)0100(18)(19)(20)(21)(22)(23)0(24)060(17)(17)(17)06-000010(11)(11)(11)010(25)(26)00(27)(28)(29)0(30)060(17)(17)(17)06-000010000010(31)(32)00(33)(34)(35)0006000006-000011111110(36)0(37)0(38)0(39)0(40)06666666-000000000000(41)00(42)(43)0(44)-0000(45)(46)(47)00(48)(49)0(50)(51)(52)0(53)0000(54)(55)(56)(57)00(58)(59)-0000(60)(61)0(62)(63)00(64)(65)(66)0(67)0(68)0(69)00(70)(71)0(72)0(73)(74)-0000(75)00(76)(77)(78)(79)(80)000(81)0(82)(83)(84)(85)(86)(87)(88)(89)(90)(91)0(92)-0000(93)(94)(95)0(96)(97)00(98)(99)0(100)(101)0(102)00(103)0(104)0(105)-0000000000(106)(107)0(108)00(109)00000(110)00000(111)-00000(112)(113)(114)(115)(116)00000(117)(118)0(119)(120)0(121)(122)(123)000(124)(125)-0000(126)(127)(128)(129)(130)0(131)0(132)0(133)(134)0(135)0(136)00(137)00(138)(139)0(140)-00000000(141)(142)00(143)0(144)00000000(145)(146)(147)-0000(148)(149)(150)(151)00(152)(153)0(154)(155)0(156)00(157)(158)(158)(158)(158)(158)00(159)-000000000000(160)00(161)(162)(163)0(164)(158)000(158)000(165)-0000(166)(166)(166)(166)(166)(166)(166)0000(167)(168)(169)(170)0(158)0(171)0(158)000(172)-0000(166)00000(166)0(173)0(174)(175)(176)000(158)000(158)00(177)(178)-0000(166)0(179)(179)(179)0(166)00000(180)00(181)(158)(158)(158)(158)(158)-0000(166)0(179)(179)(179)0(166)000(182)(183)00(184)0(185)(186)00(187)0(188)(189)-0000(166)0(179)(179)(179)0(166)0(190)(191)(192)(193)(194)(195)00(196)00(197)(198)(199)0(200)(201)-0000(166)00000(166)0(202)00(203)00(204)(205)(206)(207)0(208)(209)-0000(166)(166)(166)(166)(166)(166)(166)0(210)00(211)(212)00(213)(214)(215)(216)00(217)00(218)',
      r: '1111222222322222222211211212112212222222223000100000013211323211112110000022222221000000222221000002222211111103330000033333303010331111003331030003323111230030311030330013010012232132132100001232132132100012220122121200122012211233310030000330303222010122220001222203212011122330103300003001222222000000330011101211222200333311103303333222220000011111222222222220000000122222220000000033333103103000122232113222220000001012222222123032122000000000303332222201111111111111122222222222222222121232301032222230010330000002222222223333001132121000000000222222300000022222223303013012221000000022222222233000222333301111133333011111333330223002223000000222233233230000000000210221022223322211100000212321322302303011111111113332111112221000222100022210003333333333303232113221030113222100301111211102333012110233012102111032330211032300',
      step: 832,
      subject: 'QR',
    },
    {
      w: 5,
      h: 3,
      s: 's001-00011-0002',
      r: '11221',
      step: 5,
      subject: 'はじまり',
    },
    {
      w: 5,
      h: 3,
      s: 's001-00211',
      r: '22110',
      step: 5,
      subject: 'はじまり2',
    },
    {
      w: 5,
      h: 3,
      s: '00s1-0211',
      r: '32321',
      step: 5,
      subject: '⠐⠚',
    },
    {
      w: 5,
      h: 3,
      s: '011-00s22',
      r: '210',
      step: 3,
      subject: '⠉⠒',
    },
    {
      w: 5,
      h: 3,
      s: '001-0222-00s',
      r: '11003331112230',
      step: 14,
      subject: '麦わら帽子',
    },
    {
      w: 5,
      h: 4,
      s: '-0001-20011-s',
      r: '0100111233',
      step: 10,
      subject: '両端',
    },
    {
      w: 5,
      h: 4,
      s: '-0111-0s12',
      r: '21110031223001033',
      step: 17,
      subject: 'T.',
    },
    {
      w: 5,
      h: 4,
      s: '-0111-0s11-0002',
      r: '21133030012',
      step: 11,
    },
    {
      w: 6,
      h: 5,
      s: 's--012111-0111',
      r: '212123011101220333321',
      step: 21,
      subject: '大さじ1',
    },
    {
      w: 8,
      h: 5,
      s: '--01111111-s111111-0002',
      r: '21111101103100322',
      step: 17,
    },
    {
      w: 6,
      h: 4,
      s: '-00122-0s12',
      r: '21021101003212233330',
      step: 20,
    },
    {
      w: 6,
      h: 5,
      s: '-011222-s1122',
      r: '001112033322210301122211103330',
      step: 30,
    },
    {
      w: 6,
      h: 5,
      s: 's-011-021-022-02',
      r: '2112122300121100032212333',
      step: 25,
    },
    {
      w: 6,
      h: 4,
      s: '-01112-0s333',
      r: '1033011',
      step: 7,
    },
    {
      w: 5,
      h: 5,
      s: 's-0111-012-032',
      r: '22211031100322',
      step: 14,
      subject: 'ツッパリ',
    },
    {
      w: 6,
      h: 6,
      s: '011111-0123s1-012301-010001-011111',
      r: '222303',
      step: 6,
    },
    {
      w: 8,
      h: 6,
      s: '-001111-002s01-001331-001111',
      r: '323030111110122230033333211',
      step: 27,
      subject: '狭い部屋',
    },
    {
      w: 6,
      h: 6,
      s: 's-0111-002-0222-0033-0003',
      r: '111122223033300111232332210001',
      step: 30,
    },
    {
      w: 6,
      h: 6,
      s: '-0s001-02001-02211-0033',
      r: '11122232333011210003033211',
      step: 26,
    },
    {
      w: 6,
      h: 6,
      s: '-00s1-0021-02211-0033',
      r: '123032321100011123303223321',
      step: 27,
    }
    /*
    {
      w: 6,
      h: 5,
      s: 's-001-01112-00122',
      r: '2221211011000333203232100111122230103331122230',
      step: 46,
      subject: '+v',
    },
    {
      w: 6,
      h: 5,
      s: 's--00001-002211-00211',
      r: '111112231223023330030121210011233312230',
      step: 39,
      subject: '旧ロゴマーク',
    },
    {
      w: 6,
      h: 6,
      s: 's---00112-001022-00122',
      r: '1111122231223000100322230003332222103011121223000',
      step: 49,
    },
    {
      w: 6,
      h: 5,
      s: 's-01222-01332-011',
      r: '2222111032301110103',
      step: 19,
    },
    {
      w: 7,
      h: 7,
      s: '-000s-012221-012021-011111-0003',
      r: '11122223333033000012122323221003011130001222',
      step: 44,
    },
    {
      w: 6,
      h: 6,
      s: '011111-0123s1-010001-010001-011111',
      r: '2220303032',
      step: 10,
      subject: '動く部屋',
    },
    {
      w: 6,
      h: 6,
      s: 's01111-000001-001231-401111',
      r: '211112323230',
      step: 12,
      subject: '蛇と卵',
    },
    {
      w: 6,
      h: 6,
      s: 's01111-000001-001231-401111-001001',
      r: '1211123032303011322223000121123311033123',
      step: 40,
      subject: '首長竜と卵',
    },
    {
      w: 8,
      h: 8,
      s: 's-011111-012301-011001-014011-011111',
      r: '210111111230323333321011111122222323033333011',
      step: 45,
      subject: '封印された部屋',
    },
    {
      w: 8,
      h: 8,
      s: 's-011111-012341-011001-010001-011111',
      r: '1232122222101111100000303212222223033333000001011111212222232333333012101111103',
      step: 79,
      subject: '封印された部屋2',
    },
    {
      w: 7,
      h: 6,
      s: '001111-011s21-011341-015611-00011',
      r: '203121203123',
      step: 12,
      subject: '窮屈な部屋1',
    },
    {
      w: 8,
      h: 7,
      s: '011111-01s231-011451-016711-00011',
      r: '20312011321231003331123',
      step: 23,
      subject: '窮屈な部屋2',
    },
    {
      w: 8,
      h: 7,
      s: 's-0000001-0000011-0221111-0223333-0000003',
      r: '1122213332221111110103332300030112012332222300033011',
      step: 52,
      subject: '大きなタコ星人',
    },
    {
      w: 9,
      h: 6,
      s: '-0000s-0012223-01112333-00022',
      r: '33323221001133300122121211',
      step: 26,
      subject: '傘',
    },
    {
      w: 7,
      h: 6,
      s: 's-01022-010203-004003-044033',
      r: '2110122001112320330323321',
      step: 25,
      subject: '-vvJ',
    },
    {
      w: 7,
      h: 6,
      s: 's-010222-0102-003044-033004',
      r: '1201122',
      step: 7,
      subject: '-Lvv',
    },
    {
      w: 7,
      h: 6,
      s: 's-010222-0102-00304-033044',
      r: '2122113300011220033211110122',
      step: 28,
      subject: '-Lvv',
    },
    {
      w: 7,
      h: 7,
      s: 's-010222-0102-00304-03304-000044',
      r: '11222110110303221123033233300111101212222230',
      step: 44,
      subject: '-LvL',
    },
    {
      w: 7,
      h: 7,
      s: 's-010222-0102-00304-00304-033044',
      r: '1122212221003303300101222203321111',
      step: 34,
      subject: '-LJL',
    },
    {
      w: 7,
      h: 7,
      s: 's-010222-0102-00304-03304-030044',
      r: '1121232122211103230010032322230233011112100',
      step: 43,
      subject: '-LzL',
    },
    {
      w: 7,
      h: 7,
      s: 's-010222-0102-00304-033044-030004',
      r: '11123223010111123303233301111211222230010003',
      step: 44,
      subject: '-Lzs',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00302-033-030444',
      r: '21123213222111110332300',
      step: 23,
      subject: 'Lzzl',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00302-033004-030004',
      r: '1112200111222222300103',
      step: 22,
      subject: 'Lzz-',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00302-003004-003304',
      r: '212210301',
      step: 9,
      subject: 'LzL-',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00302-003004-033004',
      r: '21011112122332301112333',
      step: 23,
      subject: 'LzJ-',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00302-003004-033044',
      r: '1111232323211000011123303322211122',
      step: 34,
      subject: 'LzJv',
    },
    {
      w: 7,
      h: 7,
      s: 's-011102-010022-00342-003005-033055',
      r: '21122321130000122',
      step: 17,
      subject: 'Lz.Jv',
    },
    {
      w: 8,
      h: 8,
      s: '-0011-02113-022233-002233-004433-004-s',
      r: '000111212230030000122200001111222312223323010001033',
      step: 51,
      subject: '16文字キック',
    },
    {
      w: 9,
      h: 8,
      s: '1111101-1234101-101s101-1011101-1000001-1111111',
      r: '1201200320332132321210212100011030011230321123003323301212221212303230230233100111013',
      step: 85,
      subject: '蚊取り線香',
    },
    {
      w: 8,
      h: 7,
      s: 's-0000012-3444412-3455012-3400222-333666',
      r: '2212221121111033033300111222000123323332112100003332101102222',
      step: 61,
      subject: 'どんな形にすればいい？',
    },
    {
      w: 10,
      h: 9,
      s: '0000s11111-0000222201-0003330201-0044030201-0504030201-0044030201-0003330201-0000222201-0000011111',
      r: '323232321111',
      step: 12,
      subject: '多重の箱',
    },
    {
      w: 11,
      h: 9,
      s: '00000011111-00000022221-00000023331-00000024431-00000524s31-00000024431-00000023331-00000022221-00000011111',
      r: '330330221122233333003001222321112110103223301210003212233333011111',
      step: 66,
      subject: '多重の箱2',
    },
    {
      w: 13,
      h: 11,
      s: '--00111-00101-2222222-2344443-2300043-230s043-2344443-2333333-2222222',
      r: '001111110000233323330111112222233333',
      step: 36,
      subject: 'キャリーケース',
    },
    {
      w: 5,
      h: 5,
      s: '-01s2-0303-0333-00x',
      r: '0332213001222000111232330101222003321',
      step: 37,
      subject: 'U字磁石',
    },
    {
      w: 6,
      h: 5,
      s: 'x0000x--s1122-0122-x0000x',
      r: '011111223233300301132221110330',
      step: 30,
    },
    {
      w: 7,
      h: 6,
      s: 's000xx1-0223311-02003-04-044',
      r: '22211330001222321',
      step: 17,
      subject: '4つのL',
    },
    {
      w: 6,
      h: 6,
      s: 's-0122x-033-0033-0x',
      r: '2212102111000333',
      step: 16,
    },
    {
      w: 6,
      h: 6,
      s: 's-0122x-0332-0033-0x',
      r: '1123032211012112223301103',
      step: 25,
    },
    {
      w: 6,
      h: 6,
      s: 'xx000x-s0012-00011-x1113',
      r: '11012121222303021103',
      step: 20,
    },
    {
      w: 7,
      h: 7,
      s: 's-010222-01020x-003x04-0x3044-03304',
      r: '111111222310033032033322',
      step: 24,
    },
    {
      w: 8,
      h: 6,
      s: 's-01222-x1332-011x-0000x',
      r: '1211012211122233333330121111101033223330',
      step: 40,
    },
    {
      w: 6,
      h: 6,
      s: 'x0000x-0012-01122-03344-03004-x0000s',
      r: '33013001203300323211113222300233011',
      step: 35,
      subject: '紙相撲の力士',
    },
    {
      w: 7,
      h: 7,
      s: '-0111x2-0001x2-033s22-03x4-03x444',
      r: '13303300111201112',
      step: 17,
      subject: '4つのJ（卍）',
    },
    {
      w: 7,
      h: 7,
      s: '-011102-001022-03xsx2-03304-030444',
      r: '013223221111032301000300333321',
      step: 30,
      subject: '4つのT',
    },
    {
      w: 7,
      h: 7,
      s: 's-00102-011022-000x-033044-00304',
      r: '1210111221222332330',
      step: 19,
    },
    {
      w: 7,
      h: 7,
      s: 's-001x2-011x22-000x-033044-00304',
      r: '11220011122122233233',
      step: 20,
    },
    {
      w: 7,
      h: 7,
      s: 's-00102-011x22-000x-033x44-00304',
      r: '11201111222223001003333232322100221121000211000031222230',
      step: 56,
    },
    {
      w: 7,
      h: 7,
      s: 's-0010x-011022-000x-033044-00304',
      r: '222221002112210101000322123311233',
      step: 33,
    },
    {
      w: 7,
      h: 7,
      s: 's-011022-0010x-000x-033044-00304',
      r: '12232221101101010333032223321133221000300111112223330303001222',
      step: 62,
    },
    {
      w: 7,
      h: 5,
      s: '-0x1x2x-03332s-0x4x5x',
      r: '1003320112222331100003322003333221133001122001111223',
      step: 52,
      subject: '格子1',
    },
    {
      w: 9,
      h: 7,
      s: 's-0x0x0x1x-0220301-0x0x3x0x-0044005-0x0x0x0x',
      r: '111111222000332222000033332211332211130011001111222222330',
      step: 57,
      subject: '格子2',
    },
    {
      w: 13,
      h: 7,
      s: 's0000x-0xxx1x0x0xxx2-0x00000x-0x0xxx0x0xxxx-0x0x-0x0x0x0x0x3x-0000000x',
      r: '11112033332222221100001113332222110011110000332220001122222211021100333122330000022233223300111300001122221122330000022233000011132211110',
      step: 137,
      subject: '迷路',
    },
    {
      w: 7,
      h: 6,
      s: 's--0120a3-xxx0xxx-xxx0xxx-xxx0xxx',
      r: '111111223033201123',
      step: 18,
      subject: '落とし穴',
    },
    {
      w: 7,
      h: 5,
      s: '-00111-022a1s-00111',
      r: '003333211203332111',
      step: 18,
      subject: '邪魔者',
    },
    {
      w: 7,
      h: 5,
      s: '-00111-02231s-00111',
      r: '0303333211200111122232302333300211112100103',
      step: 43,
      subject: '必要とされる者',
    },
    {
      w: 5,
      h: 5,
      s: 'sa-011b-010b-0x-0c002',
      r: '1321012233221',
      step: 13,
    },
    {
      w: 5,
      h: 5,
      s: 'saa-0110b-c100b-c-00d02',
      r: '1211221030333211012',
      step: 19,
    },
    {
      w: 5,
      h: 5,
      s: 'sa-000bb-cc001-c220x-c2',
      r: '12121223023301210301',
      step: 20,
    },
    {
      w: 5,
      h: 5,
      s: 'saa-0a-10b-xc22-002',
      r: '12220110331112232300',
      step: 20,
    },
    {
      w: 5,
      h: 5,
      s: 's10a-20b-c000d-0e33-003',
      r: '122110311223230011003',
      step: 21,
    },
    {
      w: 5,
      h: 5,
      s: 's01-002ax-033-0b304-000c',
      r: '22221110003122233300130012120332111333221100',
      step: 44,
    },
    {
      w: 5,
      h: 5,
      s: 's00a-b1ca-0d-2222-e0f3',
      r: '111223311003321211223',
      step: 21,
    },
    {
      w: 5,
      h: 5,
      s: 's00a-0b0a-0bb-1111-0002',
      r: '112312112230332110100322',
      step: 24,
    },
    {
      w: 7,
      h: 7,
      s: '-011x22-011x22-0a0s0b-033044-033x44',
      r: '1133212233330001133222103001300011112',
      step: 37,
      subject: '4つの四角',
    },
    {
      w: 7,
      h: 7,
      s: 's-011x22-010002-x0a0b0x-030c04-033x44',
      r: '12321221133321000012001122',
      step: 26,
    },
    {
      w: 6,
      h: 5,
      s: '001sa-00111x-2201-02bc',
      r: '3112222333301211110033112230002323233012110112333303001232111210',
      step: 64,
    },
    {
      w: 6,
      h: 6,
      s: '001sa-xb111x-c001-22-0200d-000xd',
      r: '203321222233011300010311123311223022323301110',
      step: 45,
    },
    {
      w: 6,
      h: 6,
      s: '0aa-012-01222b-022cde-0sfff',
      r: '21111002233330300001211103323322212103300012232100010112332',
      step: 59,
    },
    {
      w: 6,
      h: 6,
      s: 'x-000111-0021aa-s221a--x0000x',
      r: '21110233300121322111010310033321222303301210',
      step: 44,
    },
    {
      w: 6,
      h: 6,
      s: '001s0a-b011-bc12de-00220e-f022',
      r: '1212230222333000022212103010310032212223330100012321',
      step: 52,
    },
    {
      w: 6,
      h: 6,
      s: '000aa-0x0sa-0011a-x2103-00113-00bb',
      r: '122300122123033212303011100322100320033322111012',
      step: 48,
      subject: '類似A',
    },
    {
      w: 6,
      h: 6,
      s: '0000a-0x0sa-0x11a-021b3-00113-00cc',
      r: '033322221210023301300011222321',
      step: 30,
      subject: '類似B',
    },
    {
      w: 8,
      h: 5,
      s: 'saaa1-0bbb22-0ccc0333-0ddd044-0eee5',
      r: '11332113322211',
      step: 14,
    },
    {
      w: 8,
      h: 5,
      s: 'saaa1-0bbb22-0ccc3-0ddd4-0eee5',
      r: '222211133300112111101003320112232333011333330011',
      step: 48,
    },
    {
      w: 6,
      h: 5,
      s: 's-t-0001-02211-0211',
      r: '22101111230122230012223302300130',
      step: 32,
      subject: '双子と旧ロゴマーク',
    },
    {
      w: 6,
      h: 5,
      s: 'x00x-x01222-0s332t-0x00x',
      r: '00122332121001330010012032',
      step: 26,
      subject: '双子',
    },
    {
      w: 7,
      h: 5,
      s: 'sx0x0xt-0001-0x0x0x-020x03-0x0x0x',
      r: '211121231003233323221300111',
      step: 27,
      subject: '双子',
    },
    {
      w: 9,
      h: 6,
      s: '011222-1s12t2-11122-xxx333-x0x3u3-xxx333',
      r: '111222330300111222330300111222333333000',
      step: 39,
      subject: '三つ子',
    },
    {
      w: 9,
      h: 9,
      s: 'xxx110222-x0x1s12t2-xxx111222-xxx333-x0x3u3-xxx033-000000xxx-000000x0x-000000xxx',
      r: '11122233322233232001132',
      step: 23,
      subject: '三つ子2',
    },
    {
      w: 9,
      h: 9,
      s: '111022xxx-1s12t2x0x-110222xxx-xxx330444-x0x3u34v4-xxx333044-000000xxx-000000x0x-000000xxx',
      r: '2223321112322',
      step: 13,
      subject: '四つ子',
    },
    {
      w: 9,
      h: 9,
      s: '011aa0222-1s1ata2u2-111aaa222-333444-3v34w4-03344-000000xxx-000000x0x-000000xxx',
      r: '111222333322210110000003332221111000332',
      step: 39,
      subject: '四つ子+1',
    },
    {
      w: 9,
      h: 9,
      s: '011220333-1s12t23u3-111222333-444555-4v45w5-04455-000000xxx-000000x0x-000000xxx',
      r: '111222222033300011122323',
      step: 24,
      subject: '五つ子',
    },
    {
      w: 6,
      h: 5,
      s: 'stt-s1u-vvv-222',
      r: '111232301032212',
      step: 15,
      subject: '囲い',
    },
    {
      w: 6,
      h: 6,
      s: 'stt122-s3u1v4-www555',
      r: '2121002330023211030',
      step: 19,
      subject: '囲い囲われ',
    },
    {
      w: 7,
      h: 6,
      s: 'sssss-stuts-sttts--xxx-102',
      r: '112220302331223',
      step: 15,
      subject: '過保護',
    },
    {
      w: 7,
      h: 7,
      s: 'sx01-0x11-001022-001122-000002-000022-00333xx',
      r: '221221110032310123223330121111100000320332',
      step: 42,
    },
    {
      w: 16,
      h: 16,
      s: 'xxxxxxxxxxxxxxxx-xssxx0011000000x-xssxx0011000000x-x00xx1111000000x-x00xx1111000000x-x00xx1100222200x-x00xx1100222200x-x00001111222200x-x00001111222200x-x00000000002200x-x00000000002200x-x00000000222200x-x00000000222200x-x0000333333xxxxx-x0000333333xxxxx-xxxxxxxxxxxxxxxx',
      r: '2222221122111111000032222',
      step: 25,
    },
    {
      w: 9,
      h: 8,
      s: '-0ssssss-0s1120s-0s3000s-0s0000s-0s0004s-0ssssss',
      r: '1133320011',
      step: 10,
      subject: '空洞1',
    },
    {
      w: 10,
      h: 10,
      s: '0sssssss-0s10002s-0s03300s-0s00000s-0s44000s-0s00050s-0sssssss',
      r: '12212000223332',
      step: 14,
      subject: '空洞2',
    },
    {
      w: 10,
      h: 10,
      s: '0sssssss-0s10002s-0s03300s-0s00440s-0s55000s-0s00060s-0sssssss',
      r: '22120001',
      step: 8,
      subject: '空洞3',
    },
    {
      w: 11,
      h: 11,
      s: 'ssssssss-s001000s-s011100s-s00102as-s00bb3as-s000333s-s000030s-ssssssss',
      r: '12112200033312210',
      step: 17,
      subject: '空洞4',
    },
    {
      w: 12,
      h: 7,
      s: 'sssssssss-s01s0000s-s0ss0ss0s-s0000s20s-sssssssss',
      r: '13221110033',
      step: 11,
      subject: 'S字の空洞',
    },
    {
      w: 11,
      h: 11,
      s: 'sss000sss-s1ss0ss2s-s00sss00s-ss00s00ss-0ss000ss-ss00s00ss-s00sss00s-s3ss0ss4s-sss000sss',
      r: '2101231233110303220103121031',
      step: 28,
      subject: 'X形の空洞1',
    },
    {
      w: 9,
      h: 7,
      s: '0000s-0x0xsx0x-tt11-0x0x0x0x-uu23-0x0x0x0x',
      r: '222122102130130',
      step: 15,
      subject: '格子と三つ子',
    },
    {
      w: 9,
      h: 9,
      s: '000000s-0x0x0xsx--0x0x0x0x-tt111-0x0x0x0x-uu2a3-0x0x0xvx-000000v',
      r: '122210210012210',
      step: 15,
      subject: '格子と四つ子',
    },
    {
      w: 10,
      h: 10,
      s: '00s00000x-0xs-ttx0x0x0x-0000000001-00x0x0x0x1-00222345-00x0x0x0x--x0x0x0x0x',
      r: '111222200001122212000133221111111123120000033211033222222223023023333001230011301110000333322111112200332233322111111120000033222222223023333000011111',
      step: 150,
      subject: '格子と双子',
    },
    {
      w: 9,
      h: 9,
      s: 'ssssssss-s000000s-s011tt0s-s01u0t0s-s0t02t0s-s0tttt0s-s0000003-ssssss33',
      r: '0102123010333122200032222321111',
      step: 31,
      subject: 'マトリョーシカ',
    },
    {
      w: 10,
      h: 7,
      s: '000000000s-000000000s-000000000s-11ttuuu22s-v11ttuw22-vaaa33www-vva33bbbb',
      r: '021000122203013332112331030011102033122013012',
      step: 45,
      subject: '4列消し',
    },
    {
      w: 7,
      h: 6,
      s: 's-0001122-0003112-0403332-044-004',
      r: '111122102333332122100011',
      step: 24,
    },
    {
      w: 8,
      h: 7,
      s: 's-0001122-0003112-0403332-0445555-004',
      r: '112121023233122213300301113000123222101',
      step: 39,
    },
    {
      w: 8,
      h: 7,
      s: 's-0102233-0114223-0514443-0556666-005',
      r: '11212201030333211012323322210011300012322212321',
      step: 47,
    },
    {
      w: 8,
      h: 7,
      s: 's-0102233-0114223-0514463-0554666-005',
      r: '1111210122331223022323330111',
      step: 28,
    },
    {
      w: 8,
      h: 7,
      s: 's-0102223-0114233-0514463-0554666-005',
      r: '11111122302212332323030111',
      step: 26,
    }
    */
  );

  Object.freeze(levelsPoint);
  for (const level of levelsPoint) {
    Object.freeze(level);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsPoint = levelsPoint;
  } else {
    module.exports = levelsPoint;
  }
})();
