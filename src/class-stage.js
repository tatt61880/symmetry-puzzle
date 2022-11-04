(function() {
  'use strict';
  window.showkoban = window.showkoban || {};

  window.showkoban.Stage = () => {
    return new Stage();
  };

  class Stage {
    #states;
    #width;
    #height;

    constructor() {
      this.#states = [];
      this.#width = null;
      this.#height = null;
      this.upEnd = 2;
      this.leftEnd = 2;
      this.downEnd = null;
      this.rightEnd = null;
    }

    getW() {
      return this.#width - 4;
    }

    getH() {
      return this.#height - 4;
    }

    getWidth() {
      return this.#width;
    }

    getHeight() {
      return this.#height;
    }

    getState(x, y) {
      return this.#states[y][x];
    }

    setState(x, y, state) {
      this.#states[y][x] = state;
    }

    copyStates() {
      const res = new Array(this.getHeight());
      for (let y = 0; y < this.getHeight(); ++y) {
        res[y] = this.#states[y].slice();
      }
      return res;
    }

    applyObj(obj) {
      this.#width = obj.w + 4;
      this.#height = obj.h + 4;
      this.rightEnd = this.#width - 3;
      this.downEnd = this.#height - 3;

      for (let y = 0; y < this.#height; ++y) {
        this.#states[y] = [];
        for (let x = 0; x < this.#width; ++x) {
          this.#states[y][x] = showkoban.states.none;
        }
      }

      // 枠(外周2マス分)
      {
        for (let y = 0; y < this.#height; ++y) {
          this.#states[y][0] = showkoban.states.wall;
          this.#states[y][1] = showkoban.states.wall;
          this.#states[y][this.#width - 2] = showkoban.states.wall;
          this.#states[y][this.#width - 1] = showkoban.states.wall;
        }
        for (let x = 2; x < this.#width - 2; ++x) {
          this.#states[0][x] = showkoban.states.wall;
          this.#states[1][x] = showkoban.states.wall;
          this.#states[this.#height - 2][x] = showkoban.states.wall;
          this.#states[this.#height - 1][x] = showkoban.states.wall;
        }
      }

      let y = this.upEnd;
      let x = this.leftEnd;
      for (const c of obj.s) {
        if (c == '-') {
          y++;
          if (y > this.downEnd) break;
          x = this.leftEnd;
        } else {
          if (x > this.rightEnd) continue;
          this.#states[y][x] = showkoban.states.charToState[c];
          x++;
        }
      }
    }

    count(isX) {
      let cnt = 0;
      for (let y = this.upEnd; y <= this.downEnd; ++y) {
        for (let x = this.leftEnd; x <= this.rightEnd; ++x) {
          if (isX(this.#states[y][x])) cnt++;
        }
      }
      return cnt;
    }

    getStateStr() {
      return this.getStateStrSub(this.#states, this.upEnd, this.rightEnd, this.downEnd, this.leftEnd);
    }

    getStateStrSub(states, upEnd, rightEnd, downEnd, leftEnd) {
      let res = '';
      for (let y = upEnd; y <= downEnd; ++y) {
        let line = '';
        for (let x = leftEnd; x <= rightEnd; ++x) {
          line += showkoban.states.stateToChar[states[y][x]];
        }
        res += line.replace(/0+$/, '');
        res += '-';
      }
      return res.replace(/-+$/, '');
    }

    isInside(x, y) {
      if (x < this.leftEnd) return false;
      if (this.rightEnd < x) return false;
      if (y < this.upEnd) return false;
      if (this.downEnd < y) return false;
      return true;
    }

    isOk(isX) {
      if (this.count(isX) == 0) return false;
      if (!this.#isConnected(isX)) return false;
      if (!this.#isPointSymmetry(isX)) return false;
      return true;
    }

    // 図形が連結か否か。
    #isConnected(isX) {
      const dys = [-1, 0, 1, 0];
      const dxs = [0, 1, 0, -1];
      const statesTemp = new Array(this.getHeight());
      for (let y = 0; y < this.getHeight(); ++y) {
        statesTemp[y] = this.#states[y].slice();
      }
      let x0;
      let y0;
      loop:
      for (let y = this.upEnd; y <= this.downEnd; ++y) {
        for (let x = this.leftEnd; x <= this.rightEnd; ++x) {
          if (isX(statesTemp[y][x])) {
            x0 = x;
            y0 = y;
            break loop;
          }
        }
      }

      const st = showkoban.Stack();
      st.push([x0, y0]);
      statesTemp[y0][x0] = showkoban.states.none;
      while (!st.empty()) {
        const xy = st.pop();
        for (let i = 0; i < 4; i++) {
          const xx = xy[0] + dxs[i];
          const yy = xy[1] + dys[i];
          if (isX(statesTemp[yy][xx])) {
            statesTemp[yy][xx] = showkoban.states.none;
            st.push([xx, yy]);
          }
        }
      }

      for (let y = 0; y < this.getHeight(); ++y) {
        for (let x = 0; x < this.getWidth(); ++x) {
          if (isX(statesTemp[y][x])) return false;
        }
      }
      return true;
    }

    // 図形が点対称か否か。
    #isPointSymmetry(isX) {
      let minX = this.getWidth();
      let maxX = 0;
      let minY = this.getHeight();
      let maxY = 0;
      for (let y = this.upEnd; y <= this.downEnd; ++y) {
        for (let x = this.leftEnd; x <= this.rightEnd; ++x) {
          if (isX(this.#states[y][x])) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (isX(this.#states[y][x]) && !isX(this.#states[minY + maxY - y][minX + maxX - x])) {
            return false;
          }
        }
      }
      return true;
    }
  }
})();
