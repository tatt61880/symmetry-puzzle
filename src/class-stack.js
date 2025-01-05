(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  class Stack {
    constructor() {
      this.data = [];
    }

    push(val) {
      this.data.push(val);
      return val;
    }

    pop() {
      return this.data.pop();
    }

    top() {
      return this.data[this.data.length - 1];
    }

    size() {
      return this.data.length;
    }

    empty() {
      return this.data.length === 0;
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Stack = Stack;
  } else {
    module.exports = Stack;
  }
})();
