(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsReflectionEx = {
    NaN: { w: 3, h: 7, s: 's-01-01-01--02', r: '12', step: 2 },
    2023: {
      w: 17,
      h: 7,
      s: 's-0123045607890(10)(11)(12)-000(13)0(14)0(15)000(16)000(17)-0(18)(19)(20)0(21)0(22)0(23)(24)(25)0(26)(27)(28)-0(29)000(30)0(31)0(32)00000(33)-0(34)(35)(36)0(37)(38)(39)0(40)(41)(42)0(43)(44)(45)',
      r: '211332211113333211332110000011111111112233',
      step: 42,
    },
  };

  Object.freeze(levelsReflectionEx);
  for (const levelId in levelsReflectionEx) {
    Object.freeze(levelId);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsReflectionEx = levelsReflectionEx;
  } else {
    module.exports = levelsReflectionEx;
  }
})();
