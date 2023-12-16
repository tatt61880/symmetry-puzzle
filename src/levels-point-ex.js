(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const levelsPointEx = {
    NaN: {
      w: 6,
      h: 4,
      s: '-011-001s2',
      r: '01123',
      step: 5,
      shapes: 3,
      subject: 'NaN',
    },
    /*
    2022: {
      w: 17,
      h: 7,
      s: 's-0123045607890(10)(11)(12)-000(13)0(14)0(15)000(16)000(17)-0(18)(19)(20)0(21)0(22)0(23)(24)(25)0(26)(27)(28)-0(29)000(30)0(31)0(32)000(33)-0(34)(35)(36)0(37)(38)(39)0(40)(41)(42)0(43)(44)(45)',
      r: '11112113321212112211110331003',
      step: 29,
      subject: '2022',
    },
    2023: {
      w: 17,
      h: 7,
      s: 's-0123045607890(10)(11)(12)-000(13)0(14)0(15)000(16)000(17)-0(18)(19)(20)0(21)0(22)0(23)(24)(25)0(26)(27)(28)-0(29)000(30)0(31)0(32)00000(33)-0(34)(35)(36)0(37)(38)(39)0(40)(41)(42)0(43)(44)(45)',
      r: '111121133233111212112211110331003',
      step: 33,
      subject: '2023',
    },
    */
  };

  Object.freeze(levelsPointEx);
  for (const levelId in levelsPointEx) {
    Object.freeze(levelId);
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.levelsPointEx = levelsPointEx;
  } else {
    module.exports = levelsPointEx;
  }
})();
