(function() {
  'use strict';

  if (typeof window === 'undefined') {
    module.exports = stack;
  } else {
    window.app = window.app || {};
    window.app.Stack = stack;
  }

  function stack() {
    return new Stack();
  }

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
})();
