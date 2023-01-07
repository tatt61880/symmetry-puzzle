(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  if (isBrowser) {
    app = window.app;
    if (app?.states === undefined) console.error('app.states is undefined.');
    if (app?.colors === undefined) console.error('app.colors is undefined.');
    if (app?.Stack === undefined) console.error('app.Stack is undefined.');
  } else {
    app.states = require('./states.js');
    app.colors = require('./colors.js');
    app.Stack = require('./class-stack.js');
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

  const dxs = [0, 1, 0, -1, 1, 1, -1, -1];
  const dys = [-1, 0, 1, 0, -1, 1, 1, -1];

  const blockBorderWidth = 0.14;

  function* stateCharGenerator(stateStr) {
    for (let i = 0; i < stateStr.length; ++i) {
      let c = stateStr[i];
      if (c === '(') {
        c = '';
        while (i !== stateStr.length - 1 && stateStr[++i] !== ')') {
          c += stateStr[i];
        }
      }
      yield c;
    }
  }

  class Level {
    static SYMMETRY_TYPE = {
      POINT: 0,
      REFLECTION1: 1,
      REFLECTION2: 2,
      REFLECTION3: 3,
      REFLECTION4: 4,
    };
    #levelObj;
    #states;
    #width;
    #height;
    #moveFlags;
    #moveDx;
    #moveDy;
    #upEnd;
    #leftEnd;
    #downEnd;
    #rightEnd;

    constructor() {
      this.#levelObj = null;
      this.#width = null;
      this.#height = null;
      this.#states = [];
      this.#moveFlags = [];
      this.#moveDx = null;
      this.#moveDy = null;
      this.#upEnd = 2;
      this.#leftEnd = 2;
      this.#downEnd = null;
      this.#rightEnd = null;
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
      console.log(`{ w: ${w}, h: ${h}, s: '${s}' },`); // コピペ用
      return `${location.href.split('?')[0]}?w=${w}&h=${h}&s=${s}`;
    }

    copyStates() {
      const res = new Array(this.getHeight());
      for (let y = 0; y < this.getHeight(); ++y) {
        res[y] = [...this.#states[y]];
      }
      return res;
    }

    // 左右反転する。
    #mirrorLevel(levelObj) {
      const w = levelObj.w;
      const h = levelObj.h;
      const stateStr = levelObj.s;
      const statesTemp = [];
      for (let y = 0; y < h; ++y) {
        statesTemp[y] = [];
        for (let x = 0; x < w; ++x) {
          statesTemp[y][x] = app.states.none;
        }
      }

      let x = w - 1;
      let y = 0;
      for (const c of stateCharGenerator(stateStr)) {
        if (c === '-') {
          y++;
          if (y === h) break;
          x = w - 1;
        } else {
          if (x === -1) continue;
          statesTemp[y][x] = app.states.charToState[c];
          x--;
        }
      }
      let r = levelObj.r;
      if (r !== undefined) {
        let rotatedR = '';
        for (const c of r) {
          rotatedR += (4 - Number(c)) % 4;
        }
        r = rotatedR;
      }
      const s = this.#getStateStrSub(statesTemp, 0, w - 1, h - 1, 0);
      const newLevelObj = { w, h, s, r };
      return newLevelObj;
    }

    // 時計回りに90度×num回 回転する。
    #rotateLevel(levelObj, rotateNum) {
      let newLevelObj = levelObj;
      for (let i = 0; i < rotateNum; ++i) {
        const w = levelObj.h; // 90度回転後
        const h = levelObj.w; // 90度回転後
        const stateStr = levelObj.s;
        const statesTemp = [];
        for (let y = 0; y < h; ++y) {
          statesTemp[y] = [];
          for (let x = 0; x < w; ++x) {
            statesTemp[y][x] = app.states.none;
          }
        }

        let x = w - 1;
        let y = 0;
        for (const c of stateCharGenerator(stateStr)) {
          if (c === '-') {
            x--;
            if (x < 0) break;
            y = 0;
          } else {
            if (y === h) continue;
            statesTemp[y][x] = app.states.charToState[c];
            y++;
          }
        }
        let r = levelObj.r;
        if (r !== undefined) {
          let rotatedR = '';
          for (const c of r) {
            rotatedR += (Number(c) + 1) % 4;
          }
          r = rotatedR;
        }
        const s = this.#getStateStrSub(statesTemp, 0, w - 1, h - 1, 0);
        newLevelObj = { w, h, s, r };
      }
      return newLevelObj;
    }

    applyStateStr(stateStr) {
      for (let y = 2; y < this.#height - 2; ++y) {
        for (let x = 2; x < this.#width - 2; ++x) {
          this.#states[y][x] = app.states.none;
        }
      }
      let y = this.#upEnd;
      let x = this.#leftEnd;
      for (const c of stateCharGenerator(stateStr)) {
        if (c === '-') {
          y++;
          if (y > this.#downEnd) break;
          x = this.#leftEnd;
        } else {
          if (x > this.#rightEnd) continue;
          this.#states[y][x] = app.states.charToState[c];
          x++;
        }
      }
      this.resetMoveFlags();
    }

    applyObj(obj_, { init, mirrorFlag, rotateNum, resize }) {
      let obj = obj_;
      if (init) {
        if (mirrorFlag) obj = this.#mirrorLevel(obj);
        if (rotateNum !== 0) obj = this.#rotateLevel(obj, rotateNum);
        this.#levelObj = obj;
        Object.freeze(this.#levelObj);
      }

      if (init || resize) {
        this.#width = obj.w + 4;
        this.#height = obj.h + 4;
        this.#rightEnd = this.#width - 3;
        this.#downEnd = this.#height - 3;

        // 初期化
        for (let y = 0; y < this.#height; ++y) {
          this.#states[y] = [];
          for (let x = 0; x < this.#width; ++x) {
            this.#states[y][x] = app.states.none;
          }
        }

        // 枠(外周2マス分)
        {
          for (let y = 0; y < this.#height; ++y) {
            this.#states[y][0] = app.states.wall;
            this.#states[y][1] = app.states.wall;
            this.#states[y][this.#width - 2] = app.states.wall;
            this.#states[y][this.#width - 1] = app.states.wall;
          }
          for (let x = 2; x < this.#width - 2; ++x) {
            this.#states[0][x] = app.states.wall;
            this.#states[1][x] = app.states.wall;
            this.#states[this.#height - 2][x] = app.states.wall;
            this.#states[this.#height - 1][x] = app.states.wall;
          }
        }
      }

      this.applyStateStr(obj.s);
    }

    #exist(isX) {
      for (let y = this.#upEnd; y <= this.#downEnd; ++y) {
        for (let x = this.#leftEnd; x <= this.#rightEnd; ++x) {
          if (isX(this.#states[y][x])) return true;
        }
      }
      return false;
    }

    getStateStr() {
      return this.#getStateStrSub(this.#states, this.#upEnd, this.#rightEnd, this.#downEnd, this.#leftEnd);
    }

    #getStateStrSub(states, upEnd, rightEnd, downEnd, leftEnd) {
      let res = '';
      for (let y = upEnd; y <= downEnd; ++y) {
        let line = '';
        for (let x = leftEnd; x <= rightEnd; ++x) {
          let c = app.states.stateToChar[states[y][x]];
          if (c.length > 1) c = `(${c})`;
          line += c;
        }
        res += line.replace(/0+$/, '');
        res += '-';
      }
      return res.replace(/-+$/, '');
    }

    isInside(x, y) {
      if (x < this.#leftEnd) return false;
      if (this.#rightEnd < x) return false;
      if (y < this.#upEnd) return false;
      if (this.#downEnd < y) return false;
      return true;
    }

    normalize() {
      const map = {};
      let nextTarget = app.states.targetMin;
      let nextOther = app.states.otherMin;
      let nextUser = app.states.userMin;
      for (let y = this.#upEnd; y <= this.#downEnd; ++y) {
        for (let x = this.#leftEnd; x <= this.#rightEnd; ++x) {
          const state = this.#states[y][x];
          if (map[state] === undefined) {
            if (app.states.targetMin <= state && state <= app.states.targetMax) {
              map[state] = nextTarget++;
            } else if (app.states.otherMin <= state && state <= app.states.otherMax) {
              map[state] = nextOther++;
            } else if (app.states.userMin <= state && state <= app.states.userMax) {
              map[state] = nextUser++;
            } else if (state === app.states.wall || state === app.states.none) {
              map[state] = this.#states[y][x];
            } else {
              console.error('Unexpected state.');
            }
          }
          this.#states[y][x] = map[state];
        }
      }
    }

    isNormalized() {
      const exists = {};
      for (let y = this.#upEnd; y <= this.#downEnd; ++y) {
        for (let x = this.#leftEnd; x <= this.#rightEnd; ++x) {
          const state = this.#states[y][x];
          exists[state] = true;
          if (app.states.isTarget(state)) {
            if (state !== app.states.targetMin && !exists[state - 1]) {
              return false;
            }
          } else if (app.states.isOther(state)) {
            if (state !== app.states.otherMin && !exists[state - 1]) {
              return false;
            }
          } else if (app.states.isUser(state)) {
            if (state !== app.states.userMin && !exists[state - 1]) {
              return false;
            }
          } else if (state !== app.states.wall && state !== app.states.none) {
            return false;
          }
        }
      }
      return true;
    }

    isConnected(isX) {
      if (!this.#exist(isX)) return null;
      return this.#isConnected(isX);
    }

    // 図形が連結か否か。
    #isConnected(isX) {
      const statesTemp = this.copyStates();
      let x0;
      let y0;
      loop:
      for (let y = this.#upEnd; y <= this.#downEnd; ++y) {
        for (let x = this.#leftEnd; x <= this.#rightEnd; ++x) {
          if (isX(statesTemp[y][x])) {
            x0 = x;
            y0 = y;
            break loop;
          }
        }
      }

      const dxs = [0, 1, 0, -1];
      const dys = [-1, 0, 1, 0];
      const st = new app.Stack();
      st.push([x0, y0]);
      statesTemp[y0][x0] = app.states.none;
      while (!st.empty()) {
        const xy = st.pop();
        for (let i = 0; i < 4; i++) {
          const xx = xy[0] + dxs[i];
          const yy = xy[1] + dys[i];
          if (isX(statesTemp[yy][xx])) {
            statesTemp[yy][xx] = app.states.none;
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

    // 図形の中心を得る。
    getCenter(isX) {
      if (!this.#exist(isX)) return null;
      return this.#getCenter(isX);
    }

    // 図形の中心を得る。
    #getMinMaxXY(isX) {
      let minX = this.getWidth();
      let maxX = 0;
      let minY = this.getHeight();
      let maxY = 0;
      for (let y = this.#upEnd; y <= this.#downEnd; ++y) {
        for (let x = this.#leftEnd; x <= this.#rightEnd; ++x) {
          if (isX(this.#states[y][x])) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
      return { minX, maxX, minY, maxY };
    }

    // 図形の中心を得る。
    #getCenter(isX) {
      const { minX, maxX, minY, maxY } = this.#getMinMaxXY(isX);
      return { x: (minX + maxX + 1) * 0.5, y: (minY + maxY + 1) * 0.5 };
    }

    isPointSymmetry(isX) {
      if (!this.#exist(app.states.isTarget)) return false;
      return this.#isPointSymmetry(isX);
    }

    // 点対称か否か。
    #isPointSymmetry(isX) {
      const { minX, maxX, minY, maxY } = this.#getMinMaxXY(isX);
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (isX(this.#states[y][x]) && !isX(this.#states[minY + maxY - y][minX + maxX - x])) {
            return false;
          }
        }
      }
      return true;
    }

    isReflectionSymmetry(isX) {
      if (!this.#exist(app.states.isTarget)) return false;
      return this.#isReflectionSymmetry(isX);
    }

    // 線対称か否か。
    #isReflectionSymmetry(isX) {
      return this.getReflectionType(isX) !== null;
    }

    getReflectionType(isX) {
      const { minX, maxX, minY, maxY } = this.#getMinMaxXY(isX);

      // 左右対称か否か。
      let res = true;
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (isX(this.#states[y][x]) && !isX(this.#states[y][minX + maxX - x])) {
            res = false;
          }
        }
      }
      if (res) {
        // console.log('線対称(左右)');
        return Level.SYMMETRY_TYPE.REFLECTION1;
      }

      // 上下対称か否か。
      res = true;
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (isX(this.#states[y][x]) && !isX(this.#states[minY + maxY - y][x])) {
            res = false;
          }
        }
      }
      if (res) {
        // console.log('線対称(上下)');
        return Level.SYMMETRY_TYPE.REFLECTION2;
      }

      if (maxX - minX !== maxY - minY) return null; // 縦と横の長さが異なる場合、左右対称でも上下対称でもなければ線対称でないことが確定。

      // 斜めに対称軸があるか否か。(1)
      res = true;
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (isX(this.#states[y][x]) && !isX(this.#states[minY + x - minX][minX + y - minY])) {
            res = false;
          }
        }
      }
      if (res) {
        // console.log('線対称(斜め1)');
        return Level.SYMMETRY_TYPE.REFLECTION3;
      }

      // 斜めに対称軸があるか否か。(2)
      res = true;
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (isX(this.#states[y][x]) && !isX(this.#states[minY + maxX - x][minX + maxY - y])) {
            res = false;
          }
        }
      }
      if (res) {
        // console.log('線対称(斜め2)');
        return Level.SYMMETRY_TYPE.REFLECTION4;
      }

      return null;
    }

    isCompleted() {
      if (!this.#exist(app.states.isTarget)) return false;
      const isConnected = this.#isConnected(app.states.isTarget);
      if (!isConnected) return false;
      const isPointSymmetry = this.#isPointSymmetry(app.states.isTarget);
      return isPointSymmetry;
    }

    isCompleted2() {
      if (!this.#exist(app.states.isTarget)) return false;
      const isConnected = this.#isConnected(app.states.isTarget);
      if (!isConnected) return false;
      const isRefrectSymmetry = this.#isReflectionSymmetry(app.states.isTarget);
      return isRefrectSymmetry;
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

      loop:
      for (let i = app.states.userMin; i <= app.states.userMax; ++i) {
        if (!this.#exist((x) => x === i)) continue;

        const moveState = []; // 移動予定の状態番号
        moveState[i] = true;

        const st = new app.Stack(); // 移動可能か検証必要な状態番号
        st.push(i);
        while (!st.empty()) {
          const state = st.pop();
          for (let y = this.#upEnd; y <= this.#downEnd; ++y) {
            for (let x = this.#leftEnd; x <= this.#rightEnd; ++x) {
              if (this.getState(x, y) !== state) continue;
              const neighborState = this.getState(x + dx, y + dy);
              if (neighborState === app.states.none) continue;

              if (neighborState === app.states.wall) {
                continue loop;
              } else if (!moveState[neighborState]) {
                moveState[neighborState] = true;
                st.push(neighborState);
              }
            }
          }
        }

        // 各座標に移動フラグを設定
        for (let y = this.#upEnd; y <= this.#downEnd; ++y) {
          for (let x = this.#leftEnd; x <= this.#rightEnd; ++x) {
            if (moveState[this.getState(x, y)]) {
              this.#moveFlags[y + dy][x + dx] = true;
            }
          }
        }
        moveFlag = true;
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

      for (let y = this.#upEnd; y <= this.#downEnd; ++y) {
        for (let x = this.#leftEnd; x <= this.#rightEnd; ++x) {
          if (this.#moveFlags[y + dy][x + dx]) {
            this.setState(x, y, app.states.none);
          }
        }
      }
      for (let y = this.#upEnd; y <= this.#downEnd; ++y) {
        for (let x = this.#leftEnd; x <= this.#rightEnd; ++x) {
          if (this.#moveFlags[y][x]) {
            this.setState(x, y, statesTemp[y - dy][x - dx]);
          }
        }
      }
    }

    createSvg(blockSize, symmetryType = false, showCharsFlag = false) {
      const g = app.svg.createG();

      // 背景
      {
        const rect = app.svg.createRect(blockSize, { x: 1, y: 1, width: this.getWidth() - 2, height: this.getHeight() - 2 });
        rect.setAttribute('fill', 'white');
        g.appendChild(rect);
      }

      const gShadows = app.svg.createG();
      const gElems = app.svg.createG();
      g.appendChild(gShadows);
      g.appendChild(gElems);

      // ターゲット以外を作成し、追加する。（描画順のためにターゲットは後で追加します。）
      for (let y = 1; y < this.getHeight() - 1; ++y) {
        for (let x = 1; x < this.getWidth() - 1; ++x) {
          const state = this.getState(x, y);
          if (state === app.states.none) continue;
          if (app.states.isTarget(state)) continue;
          this.#addOneBlock(x, y, blockSize, false, showCharsFlag, gShadows, gElems);
        }
      }

      // ターゲットを作成し、追加する。
      for (let y = 1; y < this.getHeight() - 1; ++y) {
        for (let x = 1; x < this.getWidth() - 1; ++x) {
          const state = this.getState(x, y);
          if (!app.states.isTarget(state)) continue;
          this.#addOneBlock(x, y, blockSize, symmetryType, showCharsFlag, gShadows, gElems);
        }
      }
      return g;
    }

    #addOneBlock(x, y, blockSize, symmetryType, showCharsFlag, gShadows, gElems) {
      const state = this.getState(x, y);
      const gElem = app.svg.createG();
      const color = app.colors[state];
      {
        const eps = 0.01; // サイズを少し大きくすることで、隙間をなくします。
        const rect = app.svg.createRect(blockSize, { x: x - eps, y: y - eps, width: 1 + eps * 2, height: 1 + eps * 2, fill: color.fill });
        gElem.appendChild(rect);
      }
      {
        const flags = [];
        for (let dir = 0; dir < 8; ++dir) {
          flags[dir] = this.getState(x + dxs[dir], y + dys[dir]) === state;
        }

        // 上側
        if (!flags[dirs.u]) {
          const line = app.svg.createRect(blockSize, { x, y, width: 1, height: blockBorderWidth, fill: color.stroke });
          gElem.appendChild(line);
        }
        // 右側
        if (!flags[dirs.r]) {
          const line = app.svg.createRect(blockSize, { x: x + 1 - blockBorderWidth, y, width: blockBorderWidth, height: 1, fill: color.stroke });
          gElem.appendChild(line);
        }
        // 下側
        if (!flags[dirs.d]) {
          const line = app.svg.createRect(blockSize, { x, y: y + 1 - blockBorderWidth, width: 1, height: blockBorderWidth, fill: color.stroke });
          gElem.appendChild(line);
        }
        // 左側
        if (!flags[dirs.l]) {
          const line = app.svg.createRect(blockSize, { x, y, width: blockBorderWidth, height: 1, fill: color.stroke });
          gElem.appendChild(line);
        }
        // 右上
        if (flags[dirs.u] && flags[dirs.r] && !flags[dirs.ur]) {
          const rect = app.svg.createRect(blockSize, { x: x + 1 - blockBorderWidth, y, width: blockBorderWidth, height: blockBorderWidth, fill: color.stroke });
          gElem.appendChild(rect);
        }
        // 右下
        if (flags[dirs.d] && flags[dirs.r] && !flags[dirs.dr]) {
          const rect = app.svg.createRect(blockSize, { x: x + 1 - blockBorderWidth, y: y + 1 - blockBorderWidth, width: blockBorderWidth, height: blockBorderWidth, fill: color.stroke });
          gElem.appendChild(rect);
        }
        // 左下
        if (flags[dirs.d] && flags[dirs.l] && !flags[dirs.dl]) {
          const rect = app.svg.createRect(blockSize, { x, y: y + 1 - blockBorderWidth, width: blockBorderWidth, height: blockBorderWidth, fill: color.stroke });
          gElem.appendChild(rect);
        }
        // 左上
        if (flags[dirs.u] && flags[dirs.l] && !flags[dirs.ul]) {
          const rect = app.svg.createRect(blockSize, { x, y, width: blockBorderWidth, height: blockBorderWidth, fill: color.stroke });
          gElem.appendChild(rect);
        }

        if (app.states.isOther(state)) {
          const size = blockBorderWidth * 1.75;
          // 右上
          if (!flags[dirs.u] && !flags[dirs.r]) {
            const rect = app.svg.createRect(blockSize, { x: x + 1 - size, y, width: size, height: size, fill: color.stroke });
            gElem.appendChild(rect);
          }
          // 右下
          if (!flags[dirs.d] && !flags[dirs.r]) {
            const rect = app.svg.createRect(blockSize, { x: x + 1 - size, y: y + 1 - size, width: size, height: size, fill: color.stroke });
            gElem.appendChild(rect);
          }
          // 左下
          if (!flags[dirs.d] && !flags[dirs.l]) {
            const rect = app.svg.createRect(blockSize, { x, y: y + 1 - size, width: size, height: size, fill: color.stroke });
            gElem.appendChild(rect);
          }
          // 左上
          if (!flags[dirs.u] && !flags[dirs.l]) {
            const rect = app.svg.createRect(blockSize, { x, y, width: size, height: size, fill: color.stroke });
            gElem.appendChild(rect);
          }
        }

        if (app.states.isUser(state)) {
          const size = blockBorderWidth * 3;
          // 右上
          if (!flags[dirs.u] && !flags[dirs.r]) {
            const polygon = app.svg.createPolygon(blockSize, {
              points: [
                [x + 1 - size, y],
                [x + 1, y],
                [x + 1, y + size],
              ],
              fill: color.stroke,
            });
            gElem.appendChild(polygon);
          }
          // 右下
          if (!flags[dirs.d] && !flags[dirs.r]) {
            const polygon = app.svg.createPolygon(blockSize, {
              points: [
                [x + 1, y + 1 - size],
                [x + 1, y + 1],
                [x + 1 - size, y + 1],
              ],
              fill: color.stroke,
            });
            gElem.appendChild(polygon);
          }
          // 左下
          if (!flags[dirs.d] && !flags[dirs.l]) {
            const polygon = app.svg.createPolygon(blockSize, {
              points: [
                [x, y + 1 - size],
                [x + size, y + 1],
                [x, y + 1],
              ],
              fill: color.stroke,
            });
            gElem.appendChild(polygon);
          }
          // 左上
          if (!flags[dirs.u] && !flags[dirs.l]) {
            const polygon = app.svg.createPolygon(blockSize, {
              points: [
                [x, y],
                [x + size, y],
                [x, y + size],
              ],
              fill: color.stroke,
            });
            gElem.appendChild(polygon);
          }
        }

        switch (symmetryType) {
          case Level.SYMMETRY_TYPE.POINT: {
            if (app.states.isTarget(state)) {
              gElem.classList.add('animation-rotation');
            }
            break;
          }
          case Level.SYMMETRY_TYPE.REFLECTION1: {
            if (app.states.isTarget(state)) {
              gElem.classList.add('animation-reflection1');
            }
            break;
          }
          case Level.SYMMETRY_TYPE.REFLECTION2: {
            if (app.states.isTarget(state)) {
              gElem.classList.add('animation-reflection2');
            }
            break;
          }
        }

        // 移動モーション
        if (this.#moveFlags[y][x]) {
          const dx = this.#moveDx;
          const dy = this.#moveDy;
          gElem.classList.add('animation-block');

          // 移動時のエフェクト（残像）
          if (!this.#moveFlags[y - dy][x - dx]) {
            const gShadow = app.svg.createG();
            {
              const dd = 0.2;
              const ddd = 0.15;
              const rectArg = { x: x - dx, y: y - dy, width: 1, height: 1, fill: color.fill };
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

              const rect = window.app.svg.createRect(blockSize, rectArg);
              rect.setAttribute('transform', `translate(${dx},${dy})`);
              gShadow.appendChild(rect);
            }
            gShadow.classList.add('animation-shadow');
            gShadows.appendChild(gShadow);
          }
        }
      }
      if (showCharsFlag) {
        const text = app.svg.createText(blockSize, { x: x + 0.5, y, text: app.states.stateToChar[state] });
        gElem.appendChild(text);
        if (state === app.states.wall || this.#isConnected((s) => s === state)) {
          text.setAttribute('fill', app.colors[state].text);
        } else {
          text.setAttribute('fill', app.colors[state].error);
          const rect = app.svg.createRect(blockSize, { x, y, width: 1, height: 1, fill: 'black' });
          rect.setAttribute('opacity', 0.3);
          gElem.appendChild(rect);
        }
        text.setAttribute('font-size', `${blockSize * 0.7}px`);
        text.setAttribute('font-weight', 'bold');
      }
      gElems.appendChild(gElem);
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Level = Level;
  } else {
    module.exports = Level;
  }
})();
