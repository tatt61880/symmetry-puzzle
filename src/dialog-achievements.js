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
    smileCompleteCharacter,
  };

  const elems = app.elems;
  const levelsPerStar = 10;
  const starsPerMode = 5;
  let smileTimeout;

  function show() {
    updateTable();
    app.sound.playUiOpen();
    elems.achievements.dialog.showModal();
    elems.achievements.dialog.scrollTop = 0;
  }

  function countSolvedLevels(checkMode, levelsList, levelsListEx) {
    const levels = new app.Levels({ levelsList, levelsListEx });
    let count = 0;
    for (const { levelObj } of levels.getListedLevels()) {
      const level = new app.Level({ levelObj, checkMode });
      if (app.savedata.getHighestScore(level) !== null) count++;
    }
    return count;
  }

  function updateTable() {
    const { LINE, POINT, SPECIAL } = app.Level.CHECK_MODE;
    const lang = app.savedata.getLang();
    const array = [
      {
        elem: elems.achievements.line.solved,
        ja: '線',
        en: 'Line:',
        num: countSolvedLevels(LINE, app.levelsLine, app.levelsLineEx),
      },
      {
        elem: elems.achievements.point.solved,
        ja: '点',
        en: 'Point:',
        num: countSolvedLevels(POINT, app.levelsPoint, app.levelsPointEx),
      },
      {
        elem: elems.achievements.special.solved,
        ja: '線対称＆点',
        en: 'Line & Point:',
        num: countSolvedLevels(SPECIAL, app.levelsSpecial, app.levelsSpecialEx),
      },
    ];

    let allStarsLit = true;
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
      const starNum = Math.floor(num / levelsPerStar);
      if (starNum < starsPerMode) allStarsLit = false;
      for (let i = 0; i < starsPerMode; i++) {
        const size = 30;
        const svg = app.svg.createSvg();
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        const colors = i < starNum ? app.colors.achievementStar : app.colors.achievementStarEmpty;
        svg.appendChild(app.svg.createStar(size, { x: 0, y: 0, ...colors }));
        elem.appendChild(svg);
      }
      elem.appendChild(document.createElement('br'));

      // テキスト
      const div = document.createElement('div');

      if (num < 10) {
        div.dataset.ja = `${ja}対称の初心者`;
        div.dataset.en = `${en} Beginner`;
      } else if (num < 20) {
        div.dataset.ja = `${ja}対称の挑戦者`;
        div.dataset.en = `${en} Challenger`;
      } else if (num < 30) {
        div.dataset.ja = `${ja}対称の探究者`;
        div.dataset.en = `${en} Seeker`;
      } else if (num < 40) {
        div.dataset.ja = `${ja}対称の熟練者`;
        div.dataset.en = `${en} Adept`;
      } else if (num < 50) {
        div.dataset.ja = `${ja}対称の名手`;
        div.dataset.en = `${en} Expert`;
      } else {
        div.dataset.ja = `${ja}対称の達人`;
        div.dataset.en = `${en} Master`;
      }

      app.common.applyLang(div, lang);

      div.setAttribute('style', 'margin: 10px 0');
      elem.appendChild(div);
    });

    (allStarsLit ? app.common.showElem : app.common.hideElem)(elems.achievements.complete);
    if (allStarsLit) drawCompleteCharacter();
  }

  function drawCompleteCharacter() {
    const level = new app.Level({ levelObj: { w: 1, h: 1, s: 's' }, checkMode: app.Level.CHECK_MODE.SPECIAL });
    const blockSize = 40;
    const g = level.createSvgG({ blockSize, smallJumpFlag: true, drawBackground: false, x0: 1, y0: 1, width: 1, height: 1 });
    app.BoardRenderer.addPlayerSmile(g.querySelector('.player-eye'), blockSize);
    // ヘルプと同じく上側だけにジャンプ用の余白を設け、CSSで位置を合わせます。
    const marginTop = blockSize / 4;
    const height = blockSize + marginTop;
    g.setAttribute('transform', `translate(0, ${marginTop})`);
    const svg = app.svg.createSvg();
    svg.setAttribute('width', blockSize);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${blockSize} ${height}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.appendChild(g);
    const button = elems.achievements.completeCharacter;
    clearTimeout(smileTimeout);
    button.classList.remove('smiling');
    button.setAttribute('aria-label', app.savedata.getLang() === 'ja' ? '青キャラを笑顔にする' : 'Make the blue character smile');
    button.replaceChildren(svg);
  }

  function smileCompleteCharacter() {
    const button = elems.achievements.completeCharacter;
    clearTimeout(smileTimeout);
    button.classList.add('smiling');
    smileTimeout = setTimeout(() => button.classList.remove('smiling'), 500);
  }

  function close() {
    app.sound.playUiClose();
    elems.achievements.dialog.close();
  }
})();
