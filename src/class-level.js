(function() {
  'use strict';

  let showkoban = {};
  if (typeof window === 'undefined') {
    showkoban.states = require('./states.js');
    showkoban.colors = require('./colors.js');
    showkoban.Stack = require('./class-stack.js');
    module.exports = level;
  } else {
    showkoban = window.showkoban;
    if (showkoban?.states === undefined) console.error('showkoban.states is undefined.');
    if (showkoban?.colors === undefined) console.error('showkoban.colors is undefined.');
    if (showkoban?.Stack === undefined) console.error('showkoban.Stack is undefined.');
    window.showkoban.Level = level;
  }

  const dirs = {
    u: 0,
    r: 1,
    d: 2,
    l: 3,
    ur: 4,
    dr: 5,
    dl: 6,
    ul: 7,
  };

  const dys = [-1, 0, 1, 0, -1, 1, 1, -1];
  const dxs = [0, 1, 0, -1, 1, 1, -1, -1];

  const blockBorderWidth = 0.12;
  const blockBorderWidthHalf = blockBorderWidth / 2;

  function level() {
    return new Level();
  }

  class Level {
    #levelObj;
    #states;
    #width;
    #height;
    #moveFlags;
    #moveDx;
    #moveDy;

    constructor() {
      this.#levelObj = null;
      this.#width = null;
      this.#height = null;
      this.#states = [];
      this.#moveFlags = [];
      this.#moveDx = null;
      this.#moveDy = null;
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

    removeR() {
      const obj = {};
      for (const key in this.#levelObj) {
        if (key === 'r') continue;
        obj[key] = this.#levelObj[key];
      }
      this.#levelObj = obj;
      Object.freeze(this.#levelObj);
    }

    getLevelObj() {
      return this.#levelObj;
    }

    getBestStep() {
      return this.#levelObj?.r?.length;
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

    getUrlStr() {
      const w = this.getW();
      const h = this.getH();
      const s = this.getStateStr();
      console.log(`{w: ${w}, h: ${h}, s: '${s}'},`); // コピペ用
      return `${location.href.split('?')[0]}?w=${w}&h=${h}&s=${s}`;
    }

    copyStates() {
      const res = new Array(this.getHeight());
      for (let y = 0; y < this.getHeight(); ++y) {
        res[y] = this.#states[y].slice();
      }
      return res;
    }

    applyObj(obj, isInit = false) {
      if (isInit) {
        this.#levelObj = obj;
        Object.freeze(this.#levelObj);
      }
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
        if (c === '-') {
          y++;
          if (y > this.downEnd) break;
          x = this.leftEnd;
        } else {
          if (x > this.rightEnd) continue;
          this.#states[y][x] = showkoban.states.charToState[c];
          x++;
        }
      }
      this.resetMoveFlags();
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

    // 回転中心を得る。
    // 回転中心がなければnullを返す。
    getRotateCenter(isX) {
      if (this.count(isX) === 0) return null;
      if (!this.#isConnected(isX)) return null;
      return this.#getRotateCenter(isX);
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
    #getRotateCenter(isX) {
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
            return null;
          }
        }
      }
      return {x: (minX + maxX + 1) * 0.5, y: (minY + maxY + 1) * 0.5};
    }

    resetMoveFlags() {
      for (let y = 0; y < this.getHeight(); ++y) {
        this.#moveFlags[y] = [];
        for (let x = 0; x < this.getWidth(); ++x) {
          this.#moveFlags[y][x] = false;
        }
      }
    }

    updateMoveFlags(dx, dy) {
      let moveFlag = false;

      for (let y = 0; y < this.getHeight(); ++y) {
        this.#moveFlags[y] = [];
        for (let x = 0; x < this.getWidth(); ++x) {
          this.#moveFlags[y][x] = false;
        }
      }

      for (let i = showkoban.states.userMin; i <= showkoban.states.userMax; ++i) {
        if (this.count((x)=>{ return x === i; }) === 0) continue;

        const moveState = []; // 移動予定の状態番号
        moveState[i] = true;

        let flag = true;
        const st = showkoban.Stack(); // 移動可能か検証必要な状態番号
        st.push(i);
        while (!st.empty()) {
          const state = st.pop();
          loop:
          for (let y = this.upEnd; y <= this.downEnd; ++y) {
            for (let x = this.leftEnd; x <= this.rightEnd; ++x) {
              if (this.getState(x, y) !== state) continue;
              const neighborState = this.getState(x + dx, y + dy);
              if (neighborState === showkoban.states.none) continue;
              if (neighborState === showkoban.states.wall) {
                flag = false;
                break loop;
              } else if (!moveState[neighborState]) {
                moveState[neighborState] = true;
                st.push(neighborState);
              }
            }
          }
        }

        // 各座標に移動フラグを設定
        if (flag) {
          for (let y = this.upEnd; y <= this.downEnd; ++y) {
            for (let x = this.leftEnd; x <= this.rightEnd; ++x) {
              if (moveState[this.getState(x, y)]) {
                this.#moveFlags[y + dy][x + dx] = true;
              }
            }
          }
          moveFlag = true;
        }
      }
      if (moveFlag) {
        this.#moveDx = dx;
        this.#moveDy = dy;
      }
      return moveFlag;
    }

    move() {
      const statesTemp = this.copyStates();
      const dx = this.#moveDx;
      const dy = this.#moveDy;

      for (let y = this.upEnd; y <= this.downEnd; ++y) {
        for (let x = this.leftEnd; x <= this.rightEnd; ++x) {
          if (this.#moveFlags[y + dy][x + dx]) {
            this.setState(x, y, showkoban.states.none);
          }
        }
      }
      for (let y = this.upEnd; y <= this.downEnd; ++y) {
        for (let x = this.leftEnd; x <= this.rightEnd; ++x) {
          if (this.#moveFlags[y][x]) {
            this.setState(x, y, statesTemp[y - dy][x - dx]);
          }
        }
      }
    }

    createSvg(blockSize, rotateFlag = false, showCharsFlag = false) {
      const g = showkoban.svg.createG();

      // 背景
      {
        const rect = showkoban.svg.createRect(blockSize, {x: 1, y: 1, width: this.getWidth() - 2, height: this.getHeight() - 2});
        rect.setAttribute('fill', 'white');
        g.appendChild(rect);
      }

      const gShadows = showkoban.svg.createG();
      const gElems = showkoban.svg.createG();
      g.appendChild(gShadows);
      g.appendChild(gElems);

      // ターゲット以外を作成し、追加する。（描画順のためにターゲットは後で追加します。）
      for (let y = 1; y < this.getHeight() - 1; ++y) {
        for (let x = 1; x < this.getWidth() - 1; ++x) {
          const state = this.getState(x, y);
          if (state === showkoban.states.none) continue;
          if (showkoban.states.isTarget(state)) continue;
          this.#addOneBlock(x, y, blockSize, false, showCharsFlag, gShadows, gElems);
        }
      }

      // ターゲットを作成し、追加する。
      for (let y = 1; y < this.getHeight() - 1; ++y) {
        for (let x = 1; x < this.getWidth() - 1; ++x) {
          const state = this.getState(x, y);
          if (!showkoban.states.isTarget(state)) continue;
          this.#addOneBlock(x, y, blockSize, rotateFlag, showCharsFlag, gShadows, gElems);
        }
      }
      return g;
    }

    #addOneBlock(x, y, blockSize, rotateFlag, showCharsFlag, gShadows, gElems) {
      const state = this.getState(x, y);
      const gElem = showkoban.svg.createG();
      const color = showkoban.colors[state];
      {
        const eps = 0.01; // サイズを少し大きくすることで、隙間をなくします。
        const rect = showkoban.svg.createRect(blockSize, {x: x - eps, y: y - eps, width: 1 + eps * 2, height: 1 + eps * 2});
        rect.setAttribute('fill', color.fill);
        gElem.appendChild(rect);
      }
      {
        const flags = [];
        for (let dir = 0; dir < 8; ++dir) {
          flags[dir] = this.getState(x + dxs[dir], y + dys[dir]) === state;
        }
        // 上側
        if (!flags[dirs.u]) {
          const line = showkoban.svg.createLine(blockSize, {x1: x, y1: y + blockBorderWidthHalf, x2: x + 1, y2: y + blockBorderWidthHalf});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', blockBorderWidth * blockSize);
          gElem.appendChild(line);
        }
        // 右側
        if (!flags[dirs.r]) {
          const line = showkoban.svg.createLine(blockSize, {x1: x + 1 - blockBorderWidthHalf, y1: y, x2: x + 1 - blockBorderWidthHalf, y2: y + 1});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', blockBorderWidth * blockSize);
          gElem.appendChild(line);
        }
        // 下側
        if (!flags[dirs.d]) {
          const line = showkoban.svg.createLine(blockSize, {x1: x, y1: y + 1 - blockBorderWidthHalf, x2: x + 1, y2: y + 1 - blockBorderWidthHalf});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', blockBorderWidth * blockSize);
          gElem.appendChild(line);
        }
        // 左側
        if (!flags[dirs.l]) {
          const line = showkoban.svg.createLine(blockSize, {x1: x + blockBorderWidthHalf, y1: y, x2: x + blockBorderWidthHalf, y2: y + 1});
          line.setAttribute('stroke', color.stroke);
          line.setAttribute('stroke-width', blockBorderWidth * blockSize);
          gElem.appendChild(line);
        }
        // 右上
        if (flags[dirs.u] && flags[dirs.r] && !flags[dirs.ur]) {
          const rect = showkoban.svg.createRect(blockSize, {x: x + 1 - blockBorderWidth, y: y, width: blockBorderWidth, height: blockBorderWidth});
          rect.setAttribute('fill', color.stroke);
          gElem.appendChild(rect);
        }
        // 右下
        if (flags[dirs.d] && flags[dirs.r] && !flags[dirs.dr]) {
          const rect = showkoban.svg.createRect(blockSize, {x: x + 1 - blockBorderWidth, y: y + 1 - blockBorderWidth, width: blockBorderWidth, height: blockBorderWidth});
          rect.setAttribute('fill', color.stroke);
          gElem.appendChild(rect);
        }
        // 左下
        if (flags[dirs.d] && flags[dirs.l] && !flags[dirs.dl]) {
          const rect = showkoban.svg.createRect(blockSize, {x: x, y: y + 1 - blockBorderWidth, width: blockBorderWidth, height: blockBorderWidth});
          rect.setAttribute('fill', color.stroke);
          gElem.appendChild(rect);
        }
        // 左上
        if (flags[dirs.u] && flags[dirs.l] && !flags[dirs.ul]) {
          const rect = showkoban.svg.createRect(blockSize, {x: x, y: y, width: blockBorderWidth, height: blockBorderWidth});
          rect.setAttribute('fill', color.stroke);
          gElem.appendChild(rect);
        }

        if (showkoban.states.userMin <= state && state <= showkoban.states.userMax) {
          const size = blockBorderWidth * 3;
          // 右上
          if (!flags[dirs.u] && !flags[dirs.r]) {
            const polygon = showkoban.svg.createPolygon(blockSize, {
              points: [
                [x + 1 - size, y],
                [x + 1, y],
                [x + 1, y + size],
              ],
            });
            polygon.setAttribute('fill', color.stroke);
            gElem.appendChild(polygon);
          }
          // 右下
          if (!flags[dirs.d] && !flags[dirs.r]) {
            const polygon = showkoban.svg.createPolygon(blockSize, {
              points: [
                [x + 1, y + 1 - size],
                [x + 1, y + 1],
                [x + 1 - size, y + 1],
              ],
            });
            polygon.setAttribute('fill', color.stroke);
            gElem.appendChild(polygon);
          }
          // 左下
          if (!flags[dirs.d] && !flags[dirs.l]) {
            const polygon = showkoban.svg.createPolygon(blockSize, {
              points: [
                [x, y + 1 - size],
                [x + size, y + 1],
                [x, y + 1],
              ],
            });
            polygon.setAttribute('fill', color.stroke);
            gElem.appendChild(polygon);
          }
          // 左上
          if (!flags[dirs.u] && !flags[dirs.l]) {
            const polygon = showkoban.svg.createPolygon(blockSize, {
              points: [
                [x, y],
                [x + size, y],
                [x, y + size],
              ],
            });
            polygon.setAttribute('fill', color.stroke);
            gElem.appendChild(polygon);
          }
        }
        if (rotateFlag) {
          if (showkoban.states.isTarget(state)) {
            gElem.classList.add('animation-rotation');
          }
        }
        // 移動モーション
        if (this.#moveFlags[y][x]) {
          const dx = this.#moveDx;
          const dy = this.#moveDy;
          gElem.classList.add('animation-block');

          // 移動時のエフェクト（残像）
          if (!this.#moveFlags[y - dy][x - dx]) {
            const gShadow = showkoban.svg.createG();
            {
              const dd = 0.2;
              const ddd = 0.15;
              const rectArg = {x: x - dx, y: y - dy, width: 1, height: 1};
              if (dx === 0) {
                if (!flags[dirs.l]) rectArg.x += dd;
                if (!flags[dirs.l]) rectArg.width -= dd;
                if (!flags[dirs.r]) rectArg.width -= dd;
                rectArg.height -= ddd;
                if (dy === 1) {
                  rectArg.y += ddd;
                }
              } else {
                if (!flags[dirs.u]) rectArg.y += dd;
                if (!flags[dirs.u]) rectArg.height -= dd;
                if (!flags[dirs.d]) rectArg.height -= dd;
                rectArg.width -= ddd;
                if (dx === 1) {
                  rectArg.x += ddd;
                }
              }

              const rect = window.showkoban.svg.createRect(blockSize, rectArg);
              rect.setAttribute('fill', color.fill);
              rect.setAttribute('fill-opacity', 1);
              rect.setAttribute('transform', `translate(${dx},${dy})`);
              gShadow.appendChild(rect);
            }
            gShadow.classList.add('animation-shadow');
            gShadows.appendChild(gShadow);
          }
        }
      }
      if (showCharsFlag) {
        const text = showkoban.svg.createText(blockSize, {x: x + 0.5, y: y, text: showkoban.states.stateToChar[state]});
        gElem.appendChild(text);
        if (state === showkoban.states.wall || this.#isConnected((s) => {return s === state;})) {
          text.setAttribute('fill', showkoban.colors[state].text);
        } else {
          text.setAttribute('fill', showkoban.colors[state].error);
          const rect = showkoban.svg.createRect(blockSize, {x: x, y: y, width: 1, height: 1});
          rect.setAttribute('opacity', 0.3);
          gElem.appendChild(rect);
        }
        text.setAttribute('font-size', `${blockSize * 0.7}px`);
        text.setAttribute('font-weight', 'bold');
      }
      gElems.appendChild(gElem);
    }
  }
})();
