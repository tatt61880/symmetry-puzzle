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
    getCrownedModes,
  };

  const elems = app.elems;
  const levelsPerStar = 10;
  const starsPerMode = 5;
  const titlesByStarCount = [
    { ja: '初心者', en: 'Beginner' },
    { ja: '挑戦者', en: 'Challenger' },
    { ja: '探究者', en: 'Seeker' },
    { ja: '熟練者', en: 'Adept' },
    { ja: '名手', en: 'Expert' },
    { ja: '達人', en: 'Master' },
  ];

  function show() {
    updateTable();
    app.sound.playUiOpen();
    elems.achievements.dialog.showModal();
    elems.achievements.dialog.focus({ preventScroll: true });
    elems.achievements.dialog.scrollTop = 0;
  }

  function getModeProgress({ checkMode, levelsList, levelsListEx }) {
    const levels = new app.Levels({ levelsList, levelsListEx });
    let solved = 0;
    let crowns = 0;
    for (const { levelId, levelObj } of levels.getListedLevels()) {
      const level = new app.Level({ levelObj, checkMode });
      const score = app.savedata.getHighestScore(level);
      if (score === null) continue;
      solved++;
      if (levelsList[levelId] && score <= levelObj.step) crowns++;
    }
    const total = levelsList.length - 1;
    return { solved, crowns, total, crowned: crowns === total };
  }

  function getModes() {
    const { LINE, POINT, SPECIAL } = app.Level.CHECK_MODE;
    return [
      { checkMode: LINE, levelsList: app.levelsLine, levelsListEx: app.levelsLineEx, ja: '線', en: 'Line:' },
      { checkMode: POINT, levelsList: app.levelsPoint, levelsListEx: app.levelsPointEx, ja: '点', en: 'Point:' },
      { checkMode: SPECIAL, levelsList: app.levelsSpecial, levelsListEx: app.levelsSpecialEx, ja: '線対称＆点', en: 'Line & Point:' },
    ];
  }

  function getCrownedModes() {
    const crowned = getModes().filter((mode) => getModeProgress(mode).crowned);
    return new Set(crowned.map((mode) => mode.checkMode));
  }

  function updateTable() {
    const lang = app.savedata.getLang();
    let allStarsLit = true;
    let crowns = 0;
    let total = 0;
    const modeCounts = [];
    const characters = [];
    getModes().forEach((mode) => {
      const { ja, en, checkMode } = mode;
      const elem = elems.achievements[app.Level.getCheckModeStr(checkMode)].solved;
      const progress = getModeProgress(mode);
      const num = progress.solved;
      crowns += progress.crowns;
      total += progress.total;
      modeCounts.push(`${progress.crowns}/${progress.total}`);
      characters.push(createCharacterButton(checkMode, progress.crowned, lang));

      elem.innerText = '';

      // ★
      const starRow = document.createElement('span');
      starRow.className = 'achievement-star-row';
      const stars = document.createElement('span');
      const starNum = Math.floor(num / levelsPerStar);
      const remainder = num % levelsPerStar;
      if (starNum < starsPerMode) allStarsLit = false;
      for (let i = 0; i < starsPerMode; i++) {
        const size = 30;
        const svg = app.svg.createSvg();
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        const colors = i < starNum ? app.colors.achievementStar : app.colors.achievementStarEmpty;
        svg.appendChild(app.svg.createStar(size, { x: 0, y: 0, ...colors }));
        if (i === starNum && remainder > 0) {
          const fraction = remainder / levelsPerStar;
          svg.appendChild(app.svg.createStar(size, { x: 0, y: 0, ...app.colors.achievementStar, fraction }));
        }
        stars.appendChild(svg);
      }
      const count = document.createElement('span');
      count.className = 'achievement-solved-count';
      count.title = lang === 'ja' ? 'クリア数（最短クリアを含む）' : 'Levels cleared (including shortest clears)';
      const silverCrown = app.svg.createSvg();
      silverCrown.setAttribute('viewBox', '0 0 100 100');
      silverCrown.setAttribute('role', 'img');
      silverCrown.setAttribute('aria-label', count.title);
      silverCrown.appendChild(app.common.createCrown(100, 0, 0, 1, 0));
      count.append('(', silverCrown, `${num}/${progress.total})`);
      starRow.append(stars, count);
      elem.append(starRow, document.createElement('br'));

      // テキスト
      const div = document.createElement('div');
      const title = titlesByStarCount[Math.min(starNum, titlesByStarCount.length - 1)];
      div.dataset.ja = `${ja}対称の${title.ja}`;
      div.dataset.en = `${en} ${title.en}`;
      app.common.applyLang(div, lang);

      elem.appendChild(div);
    });

    elems.achievements.characters.replaceChildren(...characters);
    const breakdown = crowns === total ? '' : ` (${modeCounts.join(', ')})`;
    const crownIcon = app.svg.createSvg();
    crownIcon.setAttribute('viewBox', '0 0 100 100');
    crownIcon.setAttribute('role', 'img');
    crownIcon.setAttribute('aria-label', lang === 'ja' ? '金の王冠' : 'Gold crowns');
    crownIcon.appendChild(app.common.createCrown(100, 0, 0, 1, 1));
    elems.achievements.crownCount.replaceChildren(crownIcon, `${crowns}/${total}${breakdown}`);
    elems.achievements.completeTitle.classList.toggle('hide', !allStarsLit);
    elems.achievements.complete.classList.toggle('hide', !allStarsLit);
  }

  function createCharacterButton(checkMode, crowned, lang) {
    const level = new app.Level({ levelObj: { w: 1, h: 1, s: 's' }, checkMode });
    const blockSize = 40;
    const g = level.createSvgG({ blockSize, smallJumpFlag: true, drawBackground: false, x0: 1, y0: 1, width: 1, height: 1 });
    const jumpingCharacter = g.querySelector('.animation-jump-small');
    let marginTop = blockSize / 4; // ジャンプ用の余白
    if (crowned) {
      app.BoardRenderer.addPlayerSmile(g.querySelector('.player-eye'), blockSize);
      marginTop += Math.ceil(app.BoardRenderer.addPlayerCrown(jumpingCharacter, blockSize));
    }
    const height = blockSize + marginTop;
    g.setAttribute('transform', `translate(0, ${marginTop})`);
    const svg = app.svg.createSvg();
    svg.setAttribute('width', blockSize);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${blockSize} ${height}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.appendChild(g);
    const button = document.createElement('button');
    // 上余白を相殺し、王冠の有無によらず3体の高さを揃えます。
    button.style.marginTop = `-${marginTop}px`;
    button.type = 'button';
    button.tabIndex = -1;
    button.classList.add('achievement-character', 'active-hover', 'button-press');
    button.setAttribute('aria-describedby', `help-${app.Level.getCheckModeStr(checkMode)}-name`);
    button.appendChild(svg);
    if (crowned) {
      button.setAttribute('aria-label', lang === 'ja' ? '青キャラを笑顔にする' : 'Make the blue character smile');
      let smileTimeout;
      button.addEventListener('click', () => {
        clearTimeout(smileTimeout);
        button.classList.add('smiling');
        smileTimeout = setTimeout(() => button.classList.remove('smiling'), 500);
      });
    } else {
      button.setAttribute('aria-label', lang === 'ja' ? '青キャラをジャンプさせる' : 'Make the blue character jump');
      button.addEventListener('click', () => {
        for (const jump of jumpingCharacter.getAnimations()) {
          jump.currentTime = 0;
          jump.play();
        }
      });
    }
    return button;
  }

  function close() {
    app.sound.playUiClose();
    elems.achievements.dialog.close();
  }
})();
