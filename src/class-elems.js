(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  if (window.app?.Elems) return;

  class Elems {
    #elems;

    constructor(elems) {
      this.#elems = elems;
      this.#initElems(this, this.#elems);
      Object.freeze(this.#elems);
    }

    #initElems(obj, elems) {
      for (const key in elems) {
        const value = elems[key];
        if (typeof value === 'object') {
          obj[key] = {};
          this.#initElems(obj[key], value);
        } else {
          Object.defineProperty(obj, key, {
            get() {
              delete this[key];
              const elem = document.getElementById(value);
              if (elem === null) {
                console.error(`Elem not exist. (#${value})`);
              }
              return (this[key] = elem);
            },
            configurable: true,
          });
        }
      }
    }
  }

  window.app = window.app || {};
  window.app.Elems = Elems;
})();
