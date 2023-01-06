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
    { w: 6, h: 5, s: '-011222-s1122', r: '0011120333222103011222111033', step: 28 },
    { w: 9, h: 8, s: '1111101-1234101-101s101-1011101-1000001-1111111', r: '12012003203321323212102121000110300332101222221230333230003', step: 59, subject: '蚊取り線香' },
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
