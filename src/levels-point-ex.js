(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsEx = {
    NaN: { w: 3, h: 7, s: 's-01-01-01--02', r: '12', step: 2 },
    2022: { w: 17, h: 7, s: 's-0123045607890(10)(11)(12)-000(13)0(14)0(15)000(16)000(17)-0(18)(19)(20)0(21)0(22)0(23)(24)(25)0(26)(27)(28)-0(29)000(30)0(31)0(32)000(33)-0(34)(35)(36)0(37)(38)(39)0(40)(41)(42)0(43)(44)(45)', r: '2111121212112211111111033330303', step: 31, subject: '2022' },
    2023: { w: 17, h: 7, s: 's-0123045607890(10)(11)(12)-000(13)0(14)0(15)000(16)000(17)-0(18)(19)(20)0(21)0(22)0(23)(24)(25)0(26)(27)(28)-0(29)000(30)0(31)0(32)00000(33)-0(34)(35)(36)0(37)(38)(39)0(40)(41)(42)0(43)(44)(45)', r: '21111233111212112211111111033330303', step: 35, subject: '2023' },
  };

  Object.freeze(levelsEx);
  for (const levelId in levelsEx) {
    Object.freeze(levelId);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsEx = levelsEx;
  } else {
    module.exports = levelsEx;
  }
})();
