(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.common !== undefined);

  class Input {
    #buttons;
    #onDirectionRelease;
    #enable;

    static DIRS = {
      NEUTRAL: 'N',
      UP: '0',
      RIGHT: '1',
      DOWN: '2',
      LEFT: '3',
      AXIS: '4',
    };

    constructor(buttons, onDirectionRelease) {
      this.#buttons = buttons;
      this.#onDirectionRelease = onDirectionRelease;
      this.#enable = true;
      this.#init();

      this.inputDir = Input.DIRS.NEUTRAL;

      return this;
    }

    #init() {
      const release = () => {
        if (this.#enable) this.update(Input.DIRS.NEUTRAL);
      };
      document.addEventListener('pointerup', release);
      document.addEventListener('pointercancel', release);
    }

    isEnable() {
      return this.#enable;
    }

    enable() {
      this.#enable = true;
    }

    disable() {
      this.#onDirectionRelease?.();
      this.#enable = false;
    }

    update(dir) {
      if (this.inputDir !== Input.DIRS.NEUTRAL && dir !== this.inputDir) this.#onDirectionRelease?.();
      this.inputDir = dir;
      app.common.inactiveElem(this.#buttons.up);
      app.common.inactiveElem(this.#buttons.right);
      app.common.inactiveElem(this.#buttons.down);
      app.common.inactiveElem(this.#buttons.left);
      app.common.inactiveElem(this.#buttons.axis);
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
        case Input.DIRS.AXIS:
          app.common.activeElem(this.#buttons.axis);
          break;
      }
    }
  }

  window.app.Input = Input;
})();
