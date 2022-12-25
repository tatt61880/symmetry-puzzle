(function () {
  'use strict';

  if (typeof window !== 'undefined') {
    window.app = window.app || {};
    window.app.Elems = elems;
  }

  function elems(param) {
    return new Elems(param);
  }

  class Elems {
    #elems;
    constructor(elems) {
      this.#elems = elems;
      return this;
    }

    init() {
      initElems(this, this.#elems);
      Object.freeze(window.app.elems);

      function initElems(obj, elems) {
        for (const key in elems) {
          const value = elems[key];
          if (typeof value === 'object') {
            obj[key] = {};
            initElems(obj[key], value);
          } else {
            obj[key] = document.getElementById(value);
            if (obj[key] === null) {
              console.error(`Elem not exist. [id=${value}]`);
            }
          }
        }
      }
    }
  }
})();
