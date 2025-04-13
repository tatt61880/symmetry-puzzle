(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);
  console.assert(app?.common !== undefined);

  window.app = window.app || {};
  window.app.dialog = window.app.dialog || {};
  window.app.dialog.achievements = {
    show,
    close,
  };

  const elems = app.elems;

  function show() {
    updateTable();
    elems.achievements.dialog.showModal();
  }

  function updateTable() {
    let numLineSolved = 0;

    {
      const levelsList = app.levelsLine;
      const levelsListEx = app.levelsLineEx;
      const levels = new app.Levels({ levelsList, levelsListEx });
      const allLevels = levels.getAllLevels();
      for (const { levelId, levelObj } of allLevels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;

        const level = new app.Level({
          levelObj,
          checkMode: app.Level.CHECK_MODE.LINE,
        });
        const playerScore = app.savedata.getHighestScore(level);
        if (playerScore !== null) {
          ++numLineSolved;
        }
      }
    }

    let numPointSolved = 0;

    {
      const levelsList = app.levelsPoint;
      const levelsListEx = app.levelsPointEx;
      const levels = new app.Levels({ levelsList, levelsListEx });
      const allLevels = levels.getAllLevels();
      for (const { levelId, levelObj } of allLevels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;

        const level = new app.Level({
          levelObj,
          checkMode: app.Level.CHECK_MODE.POINT,
        });
        const playerScore = app.savedata.getHighestScore(level);
        if (playerScore !== null) {
          ++numPointSolved;
        }
      }
    }

    let numSpecialSolved = 0;

    {
      const levelsList = app.levelsSpecial;
      const levelsListEx = app.levelsSpecialEx;
      const levels = new app.Levels({ levelsList, levelsListEx });
      const allLevels = levels.getAllLevels();
      for (const { levelId, levelObj } of allLevels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;

        const level = new app.Level({
          levelObj,
          checkMode: app.Level.CHECK_MODE.SPECIAL,
        });
        const playerScore = app.savedata.getHighestScore(level);
        if (playerScore !== null) {
          ++numSpecialSolved;
        }
      }
    }

    const lang = app.savedata.getLang();
    const array = [
      {
        elem: elems.achievements.line.solved,
        ja: '線',
        en: 'Line',
        num: numLineSolved,
      },
      {
        elem: elems.achievements.point.solved,
        ja: '点',
        en: 'Point',
        num: numPointSolved,
      },
      {
        elem: elems.achievements.special.solved,
        ja: '線&点',
        en: 'Line & Point',
        num: numSpecialSolved,
      },
    ];

    array.forEach((data) => {
      const elem = data.elem;
      const ja = data.ja;
      const en = data.en;
      const num = data.num;
      console.log(data);
      if (num < 10) {
        elem.dataset.ja = `${ja}対称の初心者`;
        elem.dataset.en = `${en} Symmetry Beginner`;
      } else if (num < 20) {
        elem.dataset.ja = `${ja}対称の挑戦者`;
        elem.dataset.en = `${en} Symmetry Challenger`;
      } else if (num < 30) {
        elem.dataset.ja = `${ja}対称の探究者`;
        elem.dataset.en = `${en} Symmetry Seeker`;
      } else if (num < 40) {
        elem.dataset.ja = `${ja}対称の熟練者`;
        elem.dataset.en = `${en} Symmetry Adept`;
      } else if (num < 50) {
        elem.dataset.ja = `${ja}対称の名手`;
        elem.dataset.en = `${en} Symmetry Expert`;
      } else {
        elem.dataset.ja = `${ja}対称の達人`;
        elem.dataset.en = `${en} Symmetry Master`;
      }
      app.common.applyLang(elem, lang);
    });
  }

  function close() {
    elems.achievements.dialog.close();
  }
})();
