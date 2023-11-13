(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;

  class Stick {
    #buttons;
    #stick;
    #pointerInputFlag;
    #enable;

    static DIRS = {
      NEUTRAL: 'N',
      UP: '0',
      RIGHT: '1',
      DOWN: '2',
      LEFT: '3',
    };

    constructor(stick, buttons) {
      this.#stick = stick;
      this.#buttons = buttons;
      this.#enable = true;
      this.#pointerInputFlag = false;

      this.inputDir = Stick.DIRS.NEUTRAL;

      this.#init();
      return this;
    }

    #init() {
      const touchDevice = document.ontouchstart !== undefined;
      const pointerdownEventName = touchDevice ? 'touchstart' : 'mousedown';
      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      const pointerupEventName = touchDevice ? 'touchend' : 'mouseup';

      this.#stick.base.addEventListener(pointerdownEventName, (e) => {
        this.#pointerdown(e);
      });
      this.#stick.base.addEventListener(pointermoveEventName, (e) => {
        this.#pointermove(e);
      });
      this.#stick.base.addEventListener(pointerupEventName, (e) => {
        this.#pointerup(e);
      });
      document.addEventListener(pointerupEventName, (e) => {
        this.#pointerup(e);
      });
    }

    #pointerdown(e) {
      e.preventDefault();
      if (!this.#enable) return;

      this.#pointerInputFlag = true;
      this.#pointermove(e);
    }

    #pointermove(e) {
      e.preventDefault();
      if (!this.#enable) return;
      if (!this.#pointerInputFlag) return;

      const cursorPos = getCursorPos(this.#stick.base, e);
      const bcRect = this.#stick.base.getBoundingClientRect();
      const x = cursorPos.x - bcRect.width / 2;
      const y = cursorPos.y - bcRect.height / 2;
      const minDist = 48;

      if (x ** 2 + y ** 2 < minDist ** 2) {
        const dir = Stick.DIRS.NEUTRAL;
        this.update(dir);
      } else if (Math.abs(x) > Math.abs(y)) {
        const dir = x < 0 ? Stick.DIRS.LEFT : Stick.DIRS.RIGHT;
        this.update(dir);
      } else {
        const dir = y < 0 ? Stick.DIRS.UP : Stick.DIRS.DOWN;
        this.update(dir);
      }

      function getCursorPos(elem, e) {
        const bcRect = elem.getBoundingClientRect();
        if (e.touches !== undefined) {
          const x = e.touches[0].clientX - bcRect.left;
          const y = e.touches[0].clientY - bcRect.top;
          return { x, y };
        } else {
          const x = e.clientX - bcRect.left;
          const y = e.clientY - bcRect.top;
          return { x, y };
        }
      }
    }

    #pointerup() {
      if (!this.#enable) return;

      this.#pointerInputFlag = false;
      this.update(Stick.DIRS.NEUTRAL);
    }

    enable() {
      this.#enable = true;
    }

    disable() {
      this.#enable = false;
    }

    update(dir) {
      this.inputDir = dir;
      const transforms = {
        [Stick.DIRS.NEUTRAL]: () =>
          'rotateX(0deg) rotateY(0deg) translate(0, 0)',
        [Stick.DIRS.UP]: (dist) =>
          `rotateX(45deg) rotateY(0deg) translate(0, -${dist}px)`,
        [Stick.DIRS.RIGHT]: (dist) =>
          `rotateX(0deg) rotateY(45deg) translate(${dist}px, 0)`,
        [Stick.DIRS.DOWN]: (dist) =>
          `rotateX(-45deg) rotateY(0deg) translate(0, ${dist}px)`,
        [Stick.DIRS.LEFT]: (dist) =>
          `rotateX(0deg) rotateY(-45deg) translate(-${dist}px, 0)`,
      };

      this.#stick.thickness.style.setProperty('transform', transforms[dir](28));

      this.#stick.outer.style.setProperty('transform', transforms[dir](32.1));
      this.#stick.outer2.style.setProperty('transform', transforms[dir](33.3));

      this.#stick.middle.style.setProperty('transform', transforms[dir](32.9));
      this.#stick.middle2.style.setProperty('transform', transforms[dir](34.1));

      this.#stick.inner.style.setProperty('transform', transforms[dir](33.7));
      this.#stick.inner2.style.setProperty('transform', transforms[dir](34.9));

      app.common.inactiveElem(this.#buttons.up);
      app.common.inactiveElem(this.#buttons.right);
      app.common.inactiveElem(this.#buttons.down);
      app.common.inactiveElem(this.#buttons.left);
      switch (String(dir)) {
        case Stick.DIRS.UP:
          app.common.activeElem(this.#buttons.up);
          break;
        case Stick.DIRS.RIGHT:
          app.common.activeElem(this.#buttons.right);
          break;
        case Stick.DIRS.DOWN:
          app.common.activeElem(this.#buttons.down);
          break;
        case Stick.DIRS.LEFT:
          app.common.activeElem(this.#buttons.left);
          break;
      }
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Stick = Stick;
  } else {
    module.exports = Stick;
  }
})();
