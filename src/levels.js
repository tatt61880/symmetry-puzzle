(function() {
  'use strict';

  const levels = [];
  if (typeof window === 'undefined') {
    module.exports = levels;
  } else {
    window.showkoban = window.showkoban || {};
    window.showkoban.levels = levels;
  }

  levels.push(
    {w: 5, h: 3, s: 's001-00211', r: '22110'},
    {w: 5, h: 4, s: 's-10022-0002', r: '2122111033'},
    {w: 5, h: 3, s: '001-0222-00s', r: '11003331112230'},
    {w: 6, h: 5, s: 's--012111-0111', r: '212123011101220333321'},
    {w: 8, h: 5, s: 's--01111111-0111111-02', r: '2222101123303000122'},
    {w: 6, h: 4, s: '-0s122-0012', r: '0111123032033322210301111223023301'},
    {w: 6, h: 5, s: '-011222-s1122', r: '001112033322210301122211103330'},
    {w: 6, h: 5, s: '-01122-s122', r: '001111221233000333211012'},
    {w: 6, h: 6, s: 's-00122-01112-001', r: '122210001112333032211112223003'},
    {w: 6, h: 6, s: 's---00001-002211-00211', r: '111112223122302333001233001110012'},
    {w: 6, h: 6, s: '00000s--111-201-222-02', r: '2222233302330111211033301110003333210122232330111'},
    {w: 6, h: 4, s: '-01112-0s333', r: '1033011'},
    {w: 5, h: 5, s: 's-011-012-03', r: '2222101103'},
    {w: 5, h: 5, s: 's-0111-012-032', r: '22211031100322'},
    {w: 6, h: 5, s: '-001222-0s332', r: '0012322130012321'},
    {w: 6, h: 5, s: 's-01222-01332-011', r: '2222111032301110103'},
    {w: 8, h: 6, s: '-001111-002s01-001331-001111', r: '323030111110122230033333211'},
    {w: 6, h: 6, s: 's01111-000001-001231-401111', r: '211112323230'},
    {w: 6, h: 6, s: 's01111-000001-001231-401111-001001', r: '222001111233311022311030323030113222300221223001011233'},
    {w: 9, h: 8, s: 's-011111-012301-011001-014011-011111', r: '211011111123032123222223033333011'},
    {w: 8, h: 7, s: 's-0000012-3444412-3455012-3400222-333666', r: '22011101111222223311000003332122221003300110332333222211210000023332101222'},
    {w: 5, h: 5, s: '-01s2-0303-0333-00x', r: '0332213001222000111232330101222003321'},
    {w: 6, h: 6, s: 's-0122x-0332-0033-0x', r: '1201233210112033211130011222'},
    {w: 6, h: 6, s: 'xx000x-s0012-00011-x1113', r: '1101121223212300010303323211300122'},
    {w: 6, h: 6, s: 's0000x-0112-00122-00344-0334-x0000x', r: '21011123223223011000033321012220033211'},
    {w: 6, h: 5, s: 's--012a3-xx0xxx-xx0xxx', r: '11111223033201123'},
    {w: 5, h: 5, s: 's0aa-011b-010b-0x-0c002', r: '21012233221'},
    {w: 5, h: 5, s: 'saaa-0110b-c100b-c-00d02', r: '12112223100033321012321'},
    {w: 5, h: 5, s: 'sa-000bb-cc001-c220x-c2', r: '12121223023301210301'},
    {w: 5, h: 5, s: 'saa-0a-10b-xc22-002', r: '12220110331112232300'},
    {w: 5, h: 5, s: 's10a-20b-c000d-0e33-003', r: '122110311223230011003'},
    {w: 5, h: 5, s: 's01-002ax-033-0b304-000c', r: '22221110003122233300130012120332111333221100'},
    {w: 5, h: 5, s: 's00a-b1ca-0d-2222-e0f3', r: '111223311003321211223'},
    {w: 5, h: 5, s: 's00a-0b0a-0bb-1111-0002', r: '112312112230332110100322'},
    {w: 6, h: 5, s: '001sa-00111x-2201-02bc', r: '3112222333301211110033112230002323233012110112333303001232111210'},
    {w: 6, h: 6, s: '001sa-xb111x-c001-22-0200d-000xd', r: '203321222233011300010311123311223022323301110'},
    {w: 6, h: 6, s: '0aa-012-01222b-022cde-0sfff', r: '3000011211123303013332222210301300012232221100110332223301210'},
    {w: 6, h: 6, s: 'x-000111-0021aa-s221a--x0000x', r: '2111030032321132211100103100312222332303301210'},
    {w: 6, h: 6, s: '001s0a-b011-bc12de-00220e-f022', r: '1212230222333000022212103010310032212223330100012321'},
    {w: 6, h: 6, s: '000aa-0x0sa-0011a-02103-00113-00bb', r: '1223001223212330330111100322210033321'},
    {w: 6, h: 6, s: '0000a-0x0sa-0011a-021b3-00113-00cc', r: '033322123221100301332211'},
    {w: 6, h: 5, s: 's-t-0001-02211-0211', r: '22101111230122230012223302300130'},
  );

  Object.freeze(levels);
  for (const level of levels) {
    Object.freeze(level);
  }
})();
