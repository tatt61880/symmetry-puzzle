(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsLineEx = {
    NaN: {
      w: 6,
      h: 4,
      s: '-011s2-001',
      r: '01123',
      step: 5,
      shapes: 3,
      subject: 'NaN',
    },
    /*
    2023: {
      w: 17,
      h: 7,
      s: 's-0123045607890(10)(11)(12)-000(13)0(14)0(15)000(16)000(17)-0(18)(19)(20)0(21)0(22)0(23)(24)(25)0(26)(27)(28)-0(29)000(30)0(31)0(32)00000(33)-0(34)(35)(36)0(37)(38)(39)0(40)(41)(42)0(43)(44)(45)',
      r: '21322111133332113321211111110011',
      step: 32,
    },
     */
  };

  Object.freeze(levelsLineEx);
  for (const levelId in levelsLineEx) {
    Object.freeze(levelId);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsLineEx = levelsLineEx;
  } else {
    module.exports = levelsLineEx;
  }
})();
