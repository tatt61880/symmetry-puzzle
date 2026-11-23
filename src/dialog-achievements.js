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
    unlockedAllCrowns,
  };

  const elems = app.elems;
  const levelsPerStar = 10;
  const starsPerMode = 5;

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
    return { solved, crowns, total: levelsList.length - 1 };
  }

  function getModes() {
    const { LINE, POINT, SPECIAL } = app.Level.CHECK_MODE;
    return [
      { checkMode: LINE, levelsList: app.levelsLine, levelsListEx: app.levelsLineEx, ja: '線', en: 'Line:' },
      { checkMode: POINT, levelsList: app.levelsPoint, levelsListEx: app.levelsPointEx, ja: '点', en: 'Point:' },
      { checkMode: SPECIAL, levelsList: app.levelsSpecial, levelsListEx: app.levelsSpecialEx, ja: '線対称＆点', en: 'Line & Point:' },
    ];
  }

  function unlockedAllCrowns(level, previousScore, steps) {
    if (previousScore !== null && previousScore <= steps) return false;
    // 保存キーと同じ初期盤面を照合し、連番・追加面・別盤面の記録は数えません。
    const modes = getModes();
    const mode = modes.find(({ checkMode }) => checkMode === level.getCheckMode());
    const levels = new app.Levels(mode);
    const id = levels.levelObjToId({ ...level.getLevelObj(), r: undefined });
    if (!Number.isInteger(id) || id < 1) return false;
    const target = levels.getLevelObj(id).step;
    if (steps > target || (previousScore !== null && previousScore <= target)) return false;
    return modes.every((entry) => {
      const { crowns, total } = getModeProgress(entry);
      return crowns === total;
    });
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
      characters.push(createCharacterButton(checkMode, progress.crowns === progress.total, lang));

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
        let colors = i < starNum ? app.colors.achievementStar : app.colors.achievementStarEmpty;
        if (i === starNum && remainder > 0) {
          colors = createPartialStarColors(svg, elem.id, remainder / levelsPerStar);
        }
        svg.appendChild(app.svg.createStar(size, { x: 0, y: 0, ...colors }));
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
      const fraction = document.createElement('span');
      fraction.append(`${num}/`, document.createElement('wbr'), String(progress.total));
      count.append('(', silverCrown, fraction, ')');
      starRow.append(stars, count);
      elem.append(starRow, document.createElement('br'));

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

  function createPartialStarColors(svg, rowId, fraction) {
    const colors = {};
    for (const paint of ['fill', 'stroke']) {
      const gradient = document.createElementNS(svg.namespaceURI, 'linearGradient');
      gradient.id = `${rowId}-star-${paint}`;
      // 2色を同じ位置で切り替え、塗りと枠で境界を揃える。
      for (const palette of [app.colors.achievementStar, app.colors.achievementStarEmpty]) {
        const stop = document.createElementNS(svg.namespaceURI, 'stop');
        stop.setAttribute('offset', fraction);
        stop.setAttribute('stop-color', palette[paint]);
        gradient.appendChild(stop);
      }
      svg.appendChild(gradient);
      colors[paint] = `url(#${gradient.id})`;
    }
    return colors;
  }

  function createCharacterButton(checkMode, crowned, lang) {
    const level = new app.Level({ levelObj: { w: 1, h: 1, s: 's' }, checkMode });
    const blockSize = 40;
    const g = level.createSvgG({ blockSize, smallJumpFlag: true, drawBackground: false, x0: 1, y0: 1, width: 1, height: 1 });
    const jumpingCharacter = g.querySelector('.animation-jump-small');
    let marginTop = blockSize / 4; // ジャンプ用の余白
    if (crowned) {
      app.BoardRenderer.addPlayerSmile(g.querySelector('.player-eye'), blockSize);
      const crownSize = 32;
      const crownLeft = (blockSize - crownSize) / 2;
      const crownTop = -crownSize / 2 - 1;
      const crown = app.svg.createCrown(crownSize, {
        x: crownLeft / crownSize,
        y: crownTop / crownSize,
        fill: app.colors.stepDraw,
        withBand: false,
      });
      jumpingCharacter.appendChild(crown);
      marginTop += Math.ceil(-crownTop);
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
