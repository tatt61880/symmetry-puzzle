(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);
  console.assert(app?.common !== undefined);

  const help = app.elems.help;
  const tabs = [
    { input: help.tabApp, key: '+', mode: null },
    { input: help.tabLine, key: 't', mode: app.Level.CHECK_MODE.LINE },
    { input: help.tabPoint, key: 'z', mode: app.Level.CHECK_MODE.POINT },
    { input: help.tabSpecial, key: 'o', mode: app.Level.CHECK_MODE.SPECIAL },
  ];
  const redrawBlocks = [];

  window.app = window.app || {};
  window.app.dialog = window.app.dialog || {};
  window.app.dialog.help = {
    init,
    handleKey,
    toggle,
    show,
    close,
  };

  function init() {
    help.button.addEventListener('click', () => show());
    help.dialog.addEventListener('click', close);
    help.close.addEventListener('click', close);
    help.dialogDiv.addEventListener('click', (e) => e.stopPropagation());
    help.sound.addEventListener('pointerup', toggleSound);
    help.langEn.addEventListener('click', () => selectLang('en'));
    help.langJa.addEventListener('click', () => selectLang('ja'));

    for (const { input } of tabs) {
      input.addEventListener('change', () => app.sound.playButton());
    }

    for (const button of help.dialog.querySelectorAll('.help-mode-animation')) {
      const icon = button.querySelector('svg');
      button.addEventListener('click', () => {
        icon.style.animationName = 'none';
        // 停止をスタイルに反映してから、表示時と同じCSSアニメーションを先頭から再生します。
        icon.getAnimations();
        icon.style.removeProperty('animation-name');
      });
    }

    initBlockExamples('.user-block-line', 's', app.Level.CHECK_MODE.LINE);
    initBlockExamples('.user-block-point', 's', app.Level.CHECK_MODE.POINT);
    initBlockExamples('.user-block-special', 's', app.Level.CHECK_MODE.SPECIAL);
    initBlockExamples('.target-block', '1');
  }

  function initBlockExamples(selector, char, checkMode) {
    for (const svg of help.dialog.querySelectorAll(selector)) {
      const redraw = () => drawBlock(svg, char, checkMode);
      redrawBlocks.push(redraw);
      if (char === 's') {
        // スワイプ操作を妨げないよう、指を離したときにもう一度跳ねます。
        svg.addEventListener('pointerup', redraw);
      }
    }
  }

  function drawBlock(svg, char, checkMode) {
    const level = new app.Level({ levelObj: { w: 1, h: 1, s: char }, checkMode });
    const blockSize = 32;
    const g = level.createSvgG({ blockSize, smallJumpFlag: true, drawBackground: false, x0: 1, y0: 1, width: 1, height: 1 });
    const marginTop = blockSize / 4;
    g.setAttribute('transform', `translate(0, ${marginTop})`);
    svg.setAttribute('width', blockSize);
    svg.setAttribute('height', blockSize + marginTop);
    svg.replaceChildren(g);
  }

  function selectLang(lang) {
    const langPrev = app.savedata.getLang();
    if (langPrev !== lang) {
      app.sound.playButton();
      app.common.applyLangAll(lang);
      app.savedata.saveLang(lang);
    }
  }

  async function toggleSound(e) {
    e.preventDefault();
    if (app.sound.isEnabled()) {
      app.sound.disable();
      app.sound.stopBgm();
    } else {
      await app.sound.enable();
      await app.sound.resumeIfNeeded();
      app.sound.playStart();
      app.sound.startBgm();
    }

    const enabled = app.sound.isEnabled();
    help.sound.classList.toggle('active', enabled);
    help.sound.setAttribute('aria-pressed', String(enabled));
  }

  function handleKey(key) {
    if (key === '?') {
      close();
      return;
    }
    const tab = tabs.find((tab) => tab.key === key);
    tab?.input.click();
  }

  function toggle() {
    if (!help.dialog.open) {
      show();
    } else {
      close();
    }
  }

  function show(sound = true) {
    for (const redraw of redrawBlocks) redraw();

    const input = tabs.find((tab) => tab.mode === app.common.checkMode)?.input ?? help.tabApp;
    input.checked = true;

    if (sound) {
      app.sound.playUiOpen();
    }
    help.dialog.showModal();
  }

  function close() {
    app.sound.playUiClose();
    help.dialog.close();
  }
})();
