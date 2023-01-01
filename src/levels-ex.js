(function () {
  'use strict';

  const levelsEx = {
    NaN: { w: 3, h: 7, s: 's-01-01-01--02', r: '12', step: 2 },
    2022: { w: 17, h: 7, s: 's-0123045607890(10)(11)(12)-000(13)0(14)0(15)000(16)000(17)-0(18)(19)(20)0(21)0(22)0(23)(24)(25)0(26)(27)(28)-0(29)000(30)0(31)0(32)000(33)-0(34)(35)(36)0(37)(38)(39)0(40)(41)(42)0(43)(44)(45)', r: '21133222221111000013211211221111000312221111033', step: 47, subject: '2022' },
    2023: { w: 17, h: 7, s: 's-0123045607890(10)(11)(12)-000(13)0(14)0(15)000(16)000(17)-0(18)(19)(20)0(21)0(22)0(23)(24)(25)0(26)(27)(28)-0(29)000(30)0(31)0(32)00000(33)-0(34)(35)(36)0(37)(38)(39)0(40)(41)(42)0(43)(44)(45)', r: '21113211211211221111111103331110333303', step: 38, subject: '2023' },
  };

  Object.freeze(levelsEx);
  for (const levelId in levelsEx) {
    Object.freeze(levelId);
  }

  if (typeof window === 'undefined') {
    module.exports = levelsEx;
  } else {
    window.app = window.app || {};
    window.app.levelsEx = levelsEx;
  }
})();
