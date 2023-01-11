(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  class Elems {
    #elems;
    constructor(elems) {
      this.#elems = elems;
      return this;
    }

    init() {
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
          obj[key] = document.getElementById(value);
          if (obj[key] === null) {
            console.error(`Elem not exist. [id=${value}]`);
          }
        }
      }
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Elems = Elems;
  }
})();
