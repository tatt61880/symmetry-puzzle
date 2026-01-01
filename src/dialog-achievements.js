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
    window.sound.playUiOpen();
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

      elem.innerText = '';

      // 背景
      {
        const percent = (num % 10) * 10;
        elem.setAttribute(
          'style',
          `padding: 5px 10px; background: linear-gradient(to right, rgb(250, 250, 150) ${percent}%, transparent ${percent}%);`
        );
      }

      // ★
      const starNum = Math.floor(num / 10);
      for (let i = 0; i < starNum; i++) {
        const size = 30;
        const svg = app.svg.createSvg();
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        const g = app.svg.createStar(size, { x: 0, y: 0, fill: '#FFD54A', stroke: '#C08A00', strokeWidth: size * 0.002 });
        elem.appendChild(svg);
        svg.appendChild(g);

        if (i === starNum - 1) {
          elem.appendChild(document.createElement('br'));
        }
      }

      // テキスト
      const div = document.createElement('div');

      if (num < 10) {
        div.dataset.ja = `${ja}対称の初心者`;
        div.dataset.en = `${en} Symmetry Beginner`;
      } else if (num < 20) {
        div.dataset.ja = `${ja}対称の挑戦者`;
        div.dataset.en = `${en} Symmetry Challenger`;
      } else if (num < 30) {
        div.dataset.ja = `${ja}対称の探究者`;
        div.dataset.en = `${en} Symmetry Seeker`;
      } else if (num < 40) {
        div.dataset.ja = `${ja}対称の熟練者`;
        div.dataset.en = `${en} Symmetry Adept`;
      } else if (num < 50) {
        div.dataset.ja = `${ja}対称の名手`;
        div.dataset.en = `${en} Symmetry Expert`;
      } else {
        div.dataset.ja = `${ja}対称の達人`;
        div.dataset.en = `${en} Symmetry Master`;
      }

      app.common.applyLang(div, lang);

      div.setAttribute('style', 'margin: 10px 0');
      elem.appendChild(div);
    });
  }

  function close() {
    window.sound.playUiClose();
    elems.achievements.dialog.close();
  }
})();
