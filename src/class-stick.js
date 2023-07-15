(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const DIRS = {
    NEUTRAL: 'N',
    UP: '0',
    RIGHT: '1',
    DOWN: '2',
    LEFT: '3',
  };

  class Stick {
    #stick;
    #pointerInputFlag;
    #enable;

    constructor(stick) {
      this.#stick = stick;
      this.#pointerInputFlag = false;
      this.inputDir = DIRS.NEUTRAL;
      this.#enable = true;

      this.#init();
      return this;
    }

    #init() {
      const touchDevice = document.ontouchstart !== undefined;
      const pointerdownEventName = touchDevice ? 'touchstart' : 'mousedown';
      const pointermoveEventName = touchDevice ? 'touchmove' : 'mousemove';
      const pointerupEventName = touchDevice ? 'touchend' : 'mouseup';

      this.#stick.base.addEventListener(
        pointerdownEventName,
        (e) => {
          this.#pointerdown(e);
        },
        false
      );
      this.#stick.base.addEventListener(
        pointermoveEventName,
        (e) => {
          this.#pointermove(e);
        },
        false
      );
      this.#stick.base.addEventListener(
        pointerupEventName,
        (e) => {
          this.#pointerup(e);
        },
        false
      );
      document.addEventListener(
        pointerupEventName,
        (e) => {
          this.#pointerup(e);
        },
        false
      );
    }

    #pointerdown(e) {
      e.preventDefault();
      if (!this.#enable) return;
      this.#pointerInputFlag = true;
      this.#pointermove(e);
    }

    #pointermove(e) {
      e.preventDefault();
      if (!this.#pointerInputFlag || !this.#enable) return;
      const cursorPos = getCursorPos(this.#stick.base, e);
      const bcRect = this.#stick.base.getBoundingClientRect();
      const x = cursorPos.x - bcRect.width / 2;
      const y = cursorPos.y - bcRect.height / 2;
      const minDist = 60;
      if (x ** 2 + y ** 2 < minDist ** 2) {
        const dir = DIRS.NEUTRAL;
        this.update(dir);
      } else if (Math.abs(x) > Math.abs(y)) {
        const dir = x < 0 ? DIRS.LEFT : DIRS.RIGHT;
        this.update(dir);
      } else {
        const dir = y < 0 ? DIRS.UP : DIRS.DOWN;
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
      this.update(DIRS.NEUTRAL);
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
        [DIRS.NEUTRAL]: () => 'rotateX(0deg) rotateY(0deg) translate(0, 0)',
        [DIRS.UP]: (dist) =>
          `rotateX(45deg) rotateY(0deg) translate(0, -${dist}px)`,
        [DIRS.RIGHT]: (dist) =>
          `rotateX(0deg) rotateY(45deg) translate(${dist}px, 0)`,
        [DIRS.DOWN]: (dist) =>
          `rotateX(-45deg) rotateY(0deg) translate(0, ${dist}px)`,
        [DIRS.LEFT]: (dist) =>
          `rotateX(0deg) rotateY(-45deg) translate(-${dist}px, 0)`,
      };

      this.#stick.thickness.style.setProperty('transform', transforms[dir](28));

      this.#stick.outer.style.setProperty('transform', transforms[dir](32.1));
      this.#stick.outer2.style.setProperty('transform', transforms[dir](33.3));

      this.#stick.middle.style.setProperty('transform', transforms[dir](32.9));
      this.#stick.middle2.style.setProperty('transform', transforms[dir](34.1));

      this.#stick.inner.style.setProperty('transform', transforms[dir](33.7));
      this.#stick.inner2.style.setProperty('transform', transforms[dir](34.9));
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Stick = Stick;
  } else {
    module.exports = Stick;
  }
})();
