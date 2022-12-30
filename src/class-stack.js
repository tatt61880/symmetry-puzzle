(function () {
  'use strict';

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

  if (typeof window === 'undefined') {
    module.exports = Stack;
  } else {
    window.app = window.app || {};
    window.app.Stack = Stack;
  }
})();
