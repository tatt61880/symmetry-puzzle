(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;

  class Input {
    #buttons;
    #enable;

    static DIRS = {
      NEUTRAL: 'N',
      UP: '0',
      RIGHT: '1',
      DOWN: '2',
      LEFT: '3',
    };

    constructor(buttons) {
      this.#buttons = buttons;
      this.inputDir = Input.DIRS.NEUTRAL;
      this.#init();
      return this;
    }

    #init() {
      const touchDevice = document.ontouchstart !== undefined;
      const pointerupEventName = touchDevice ? 'touchend' : 'mouseup';
      document.addEventListener(pointerupEventName, (e) => {
        this.#pointerup(e);
      });
    }

    #pointerup() {
      if (!this.#enable) return;
      this.update(Input.DIRS.NEUTRAL);
    }
    enable() {
      this.#enable = true;
    }
    disable() {
      this.#enable = false;
    }

    update(dir) {
      this.inputDir = dir;
      app.common.inactiveElem(this.#buttons.up);
      app.common.inactiveElem(this.#buttons.right);
      app.common.inactiveElem(this.#buttons.down);
      app.common.inactiveElem(this.#buttons.left);
      switch (String(dir)) {
        case Input.DIRS.UP:
          app.common.activeElem(this.#buttons.up);
          break;
        case Input.DIRS.RIGHT:
          app.common.activeElem(this.#buttons.right);
          break;
        case Input.DIRS.DOWN:
          app.common.activeElem(this.#buttons.down);
          break;
        case Input.DIRS.LEFT:
          app.common.activeElem(this.#buttons.left);
          break;
      }
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Input = Input;
  } else {
    module.exports = Input;
  }
})();
