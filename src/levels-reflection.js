(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsReflection = [];
  levelsReflection.push(
    {
      w: 5,
      h: 3,
      s: 's-0102',
      r: '21',
      step: 2
    },
    { w: 5, h: 3, s: 's0001-00211', r: '1123211', step: 7, subject: 'はじまり' },
    { w: 5, h: 5, s: '001-001-0011--0s2', r: '110100322', step: 9, subject: '両端' },
    { w: 6, h: 5, s: '-s11222-01122', r: '011120333222103011222111033', step: 27 },
    { w: 6, h: 5, s: 's--00001-002211-00211', r: '1111122312230023333000111322332111', step: 34 },
    { w: 6, h: 6, s: 's---01022-0112-1102', r: '1111122223000223303321011211033331112223000', step: 43 },
    { w: 6, h: 6, s: '-00s1-0021-02211-0033', r: '01123', step: 5 },
    { w: 6, h: 6, s: '-0s001-02001-02211-0033', r: '11122232300330111003203222321', step: 29 },
    { w: 9, h: 8, s: '1111101-1234101-101s101-1011101-1000001-1111111', r: '12012003203321323212102121000110300332101222221230333230003', step: 59, subject: '蚊取り線香' },
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
