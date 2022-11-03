class Stack { // eslint-disable-line no-unused-vars
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
    return this.data.length == 0;
  }
}
