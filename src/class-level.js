(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  if (isBrowser) {
    app = window.app;
    if (app?.states === undefined) console.error('app.states is undefined.');
    if (app?.colors === undefined) console.error('app.colors is undefined.');
    if (app?.svg === undefined) console.error('app.svg is undefined.');
    if (app?.Stack === undefined) console.error('app.Stack is undefined.');
  } else {
    app.states = require('./states.js');
    app.colors = require('./colors.js');
    app.svg = require('./svg.js');
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
    static CHECK_MODE = {
      POINT: Symbol('point'),
      LINE: Symbol('line'),
    };

    static SYMMETRY_TYPE = {
      POINT: Symbol('point'),
      LINE1: Symbol('line1'),
      LINE2: Symbol('line2'),
      LINE3: Symbol('line3'),
      LINE4: Symbol('line4'),
    };

    #checkMode;
    #levelObj;
    #states;
    #width;
    #height;
    #moveFlags;
    #moveDx;
    #moveDy;
    #yMin;
    #xMin;
    #yMax;
    #xMax;
    #isCompleted;
    #isSymmetry;
    #getSymmetryType;

    constructor(obj_, checkMode, { mirrorFlag = false, rotateNum = 0 }) {
      this.#checkMode = null;
      this.#levelObj = null;
      this.#width = null;
      this.#height = null;
      this.#states = [];
      this.#moveFlags = [];
      this.#moveDx = null;
      this.#moveDy = null;
      this.#yMin = 1;
      this.#xMin = 1;
      this.#yMax = null;
      this.#xMax = null;
      this.#isCompleted = null;
      this.#isSymmetry = null;
      this.#getSymmetryType = null;

      this.#setCheckMode(checkMode);
      let obj = obj_;
      if (mirrorFlag) obj = this.#mirrorLevel(obj);
      if (rotateNum !== 0) obj = this.#rotateLevel(obj, rotateNum);
      this.#levelObj = obj;
      Object.freeze(this.#levelObj);
      this.#initStates();
      this.applyStateStr(obj.s);
    }

    getW() {
      return this.#width - 2;
    }

    getH() {
      return this.#height - 2;
    }

    getWidth() {
      return this.#width;
    }

    getHeight() {
      return this.#height;
    }

    getLevelObj() {
      return this.#levelObj;
    }

    getBestStep() {
      return this.#levelObj?.r?.length;
    }

    getState(x, y) {
      return this.#states[y][x];
    }

    getStateStr() {
      return this.#getStateStrSub(
        this.#states,
        this.#xMin,
        this.#xMax,
        this.#yMin,
        this.#yMax
      );
    }

    getUrlStr() {
      const w = this.getW();
      const h = this.getH();
      const s = this.getStateStr();
      console.log(`{ w: ${w}, h: ${h}, s: '${s}' },`); // コピペ用
      console.log(
        `node src/solve.js -w ${w} -h ${h} -s ${s} --all --console --draw` +
          (this.isLineMode() ? ' --line' : '')
      );
      return (
        `${location.href.split('?')[0]}?w=${w}&h=${h}&s=${s}` +
        (this.isLineMode() ? '&line' : '')
      );
    }

    getCenter(isX) {
      if (!this.#exist(isX)) return null;
      return this.#getCenter(isX);
    }

    getSymmetryType(isX) {
      return this.#getSymmetryType(isX);
    }

    getShapeStr(isX) {
      const { minX, maxX, minY, maxY } = this.#getMinMaxXY(isX);
      let str = '';
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          str += isX(this.#states[y][x]) ? '#' : ' ';
        }
        str += '\n';
      }
      return str;
    }

    getMaxValue(isX) {
      let res = null;
      for (let y = this.#yMin; y < this.#yMax; ++y) {
        for (let x = this.#xMin; x < this.#xMax; ++x) {
          const state = this.#states[y][x];
          if (!isX(state)) continue;
          if (res === null || state > res) {
            res = state;
          }
        }
      }
      return res;
    }

    applyObj(obj, resizeFlag) {
      if (resizeFlag) {
        this.#levelObj = obj;
        Object.freeze(this.#levelObj);
        this.#initStates();
        this.#removeR();
      }
      this.applyStateStr(obj.s);
    }

    applyState(x, y, state) {
      this.#setState(x, y, state);
      this.#removeR();
    }

    applyStateStr(stateStr) {
      for (let y = this.#yMin; y < this.#yMax; ++y) {
        for (let x = this.#xMin; x < this.#xMax; ++x) {
          this.#states[y][x] = app.states.none;
        }
      }
      let y = this.#yMin;
      let x = this.#xMin;
      for (const c of stateCharGenerator(stateStr)) {
        if (c === '-') {
          y++;
          if (y >= this.#yMax) break;
          x = this.#xMin;
        } else {
          if (x >= this.#xMax) continue;
          this.#states[y][x] = app.states.charToState[c];
          x++;
        }
      }
      this.resetMoveFlags();
    }

    // 正規化
    normalize() {
      const map = {};
      let nextTarget = app.states.targetMin;
      let nextOther = app.states.otherMin;
      let nextUser = app.states.userMin;
      for (let y = this.#yMin; y < this.#yMax; ++y) {
        for (let x = this.#xMin; x < this.#xMax; ++x) {
          const state = this.#states[y][x];
          if (map[state] === undefined) {
            if (
              app.states.targetMin <= state &&
              state <= app.states.targetMax
            ) {
              map[state] = nextTarget++;
            } else if (
              app.states.otherMin <= state &&
              state <= app.states.otherMax
            ) {
              map[state] = nextOther++;
            } else if (
              app.states.userMin <= state &&
              state <= app.states.userMax
            ) {
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

    // 左右反転
    mirror() {
      const obj = {
        w: this.getW(),
        h: this.getH(),
        s: this.getStateStr(),
      };
      const newObj = this.#mirrorLevel(obj);
      this.applyObj(newObj);
    }

    // 90度回転
    rotate(rotateNum) {
      const obj = {
        w: this.getW(),
        h: this.getH(),
        s: this.getStateStr(),
      };
      const newObj = this.#rotateLevel(obj, rotateNum);
      this.#levelObj = newObj;
      this.#initStates();
      this.applyObj(newObj);
    }

    isInsideInnerArea(x, y) {
      if (x < this.#xMin) return false;
      if (this.#xMax <= x) return false;
      if (y < this.#yMin) return false;
      if (this.#yMax <= y) return false;
      return true;
    }

    isNormalized() {
      const exists = {};
      for (let y = this.#yMin; y < this.#yMax; ++y) {
        for (let x = this.#xMin; x < this.#xMax; ++x) {
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

    isSymmetry(isX) {
      return this.#isSymmetry(isX);
    }

    isCompleted() {
      return this.#isCompleted();
    }

    isLineMode() {
      return this.#checkMode === Level.CHECK_MODE.LINE;
    }

    resetMoveFlags() {
      for (let y = 0; y < this.#height; ++y) {
        this.#moveFlags[y] = [];
        for (let x = 0; x < this.#width; ++x) {
          this.#moveFlags[y][x] = false;
        }
      }
    }

    updateMoveFlags(dx, dy, userMax = app.states.userMax) {
      let moveFlag = false;
      this.resetMoveFlags();

      loop: for (let i = app.states.userMin; i <= userMax; ++i) {
        if (!this.#exist((x) => x === i)) continue;

        const moveState = []; // 移動予定の状態番号
        moveState[i] = true;

        const st = new app.Stack(); // 移動可能か検証必要な状態番号
        st.push(i);
        while (!st.empty()) {
          const state = st.pop();
          for (let y = this.#yMin; y < this.#yMax; ++y) {
            for (let x = this.#xMin; x < this.#xMax; ++x) {
              if (this.#states[y][x] !== state) continue;
              const neighborState = this.#states[y + dy][x + dx];
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
        for (let y = this.#yMin; y < this.#yMax; ++y) {
          for (let x = this.#xMin; x < this.#xMax; ++x) {
            if (moveState[this.#states[y][x]]) {
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

    execMoveFlags() {
      const dx = this.#moveDx;
      const dy = this.#moveDy;

      if (dx === -1 || dy === -1) {
        for (let y = this.#yMin; y < this.#yMax; ++y) {
          for (let x = this.#xMin; x < this.#xMax; ++x) {
            if (this.#moveFlags[y][x]) {
              this.#states[y][x] = this.#states[y - dy][x - dx];
              this.#states[y - dy][x - dx] = app.states.none;
            }
          }
        }
      } else {
        for (let y = this.#yMax - 1; y >= this.#yMin; --y) {
          for (let x = this.#xMax - 1; x >= this.#xMin; --x) {
            if (this.#moveFlags[y][x]) {
              this.#states[y][x] = this.#states[y - dy][x - dx];
              this.#states[y - dy][x - dx] = app.states.none;
            }
          }
        }
      }
    }

    createSvgG(
      blockSize,
      symmetryAnimationFlag = false,
      showCharsFlag = false
    ) {
      const g = app.svg.createG();

      const symmetryType = symmetryAnimationFlag
        ? this.getSymmetryType(app.states.isTarget)
        : null;

      // 背景
      {
        const rect = app.svg.createRect(blockSize, {
          x: 0,
          y: 0,
          width: this.#width,
          height: this.#height,
        });
        rect.setAttribute('fill', 'white');
        g.appendChild(rect);
      }

      const gShadows = app.svg.createG();
      const gElemsNotTarget = app.svg.createG();
      const gElemsTarget = app.svg.createG();
      g.appendChild(gShadows);
      g.appendChild(gElemsNotTarget);
      g.appendChild(gElemsTarget);

      const stateHasEyes = {};
      for (let y = 0; y < this.#height; ++y) {
        for (let x = 0; x < this.#width; ++x) {
          const state = this.getState(x, y);
          if (state === app.states.none) continue;

          const eyeFlag = (() => {
            if (!app.states.isUser(state) && !app.states.isOther(state)) {
              return false;
            }
            if (stateHasEyes[state]) return false;
            stateHasEyes[state] = true;
            return true;
          })();
          const gElems = app.states.isTarget(state)
            ? gElemsTarget
            : gElemsNotTarget;
          this.#addOneBlock(
            x,
            y,
            blockSize,
            symmetryType,
            showCharsFlag,
            eyeFlag,
            gShadows,
            gElems
          );
        }
      }

      if (symmetryType !== null) {
        const center = this.getCenter(app.states.isTarget);
        const gg = app.svg.createG();
        g.appendChild(gg);
        gg.classList.add('animation-symmetry-axis');
        switch (symmetryType) {
          case Level.SYMMETRY_TYPE.POINT: {
            const circle = app.svg.createCircle(blockSize, {
              cx: center.x,
              cy: center.y,
              r: 0.08,
              fill: app.colors.symmetryPoint,
            });
            gg.appendChild(circle);
            const circle2 = app.svg.createCircle(blockSize, {
              cx: center.x,
              cy: center.y,
              r: 0.15,
              fill: 'none',
              stroke: app.colors.symmetryPoint,
            });
            gg.appendChild(circle2);
            break;
          }
          // ―
          case Level.SYMMETRY_TYPE.LINE1: {
            const line = app.svg.createLine(blockSize, {
              x1: center.x,
              y1: 0,
              x2: center.x,
              y2: this.getHeight(),
              stroke: app.colors.symmetryLine,
              strokeWidth: 3,
            });
            gg.appendChild(line);
            break;
          }
          // ｜
          case Level.SYMMETRY_TYPE.LINE2: {
            const line = app.svg.createLine(blockSize, {
              x1: 0,
              y1: center.y,
              x2: this.getWidth(),
              y2: center.y,
              stroke: app.colors.symmetryLine,
              strokeWidth: 3,
            });
            gg.appendChild(line);
            break;
          }
          // ＼
          case Level.SYMMETRY_TYPE.LINE3: {
            const line = app.svg.createLine(blockSize, {
              x1: center.x - center.y - 1,
              y1: 0 - 1,
              x2: center.x + this.getHeight() - center.y + 1,
              y2: this.getHeight() + 1,
              stroke: app.colors.symmetryLine,
              strokeWidth: 3,
            });
            gg.appendChild(line);
            break;
          }
          // ／
          case Level.SYMMETRY_TYPE.LINE4: {
            const line = app.svg.createLine(blockSize, {
              x1: center.x + center.y + 1,
              y1: 0 - 1,
              x2: center.x - this.getHeight() + center.y - 1,
              y2: this.getHeight() + 1,
              stroke: app.colors.symmetryLine,
              strokeWidth: 3,
            });
            gg.appendChild(line);
            break;
          }
        }
      }

      return g;
    }

    #removeR() {
      const obj = {};
      for (const key in this.#levelObj) {
        if (key === 'r') continue;
        obj[key] = this.#levelObj[key];
      }
      this.#levelObj = obj;
      Object.freeze(this.#levelObj);
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
      const s = this.#getStateStrSub(statesTemp, 0, w, 0, h);
      const newLevelObj = { w, h, s, r };
      return newLevelObj;
    }

    // 時計回りに90度×num回 回転する。
    #rotateLevel(levelObj, rotateNum) {
      let newLevelObj = levelObj;
      for (let i = 0; i < rotateNum; ++i) {
        const w = newLevelObj.h; // 90度回転後
        const h = newLevelObj.w; // 90度回転後
        const stateStr = newLevelObj.s;
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
        let r = newLevelObj.r;
        if (r !== undefined) {
          let rotatedR = '';
          for (const c of r) {
            rotatedR += (Number(c) + 1) % 4;
          }
          r = rotatedR;
        }
        const s = this.#getStateStrSub(statesTemp, 0, w, 0, h);
        newLevelObj = { w, h, s, r };
      }
      return newLevelObj;
    }

    #exist(isX) {
      for (let y = this.#yMin; y < this.#yMax; ++y) {
        for (let x = this.#xMin; x < this.#xMax; ++x) {
          if (isX(this.#states[y][x])) return true;
        }
      }
      return false;
    }

    #getStateStrSub(states, xMin, xMax, yMin, yMax) {
      let res = '';
      for (let y = yMin; y < yMax; ++y) {
        let line = '';
        for (let x = xMin; x < xMax; ++x) {
          let c = app.states.stateToChar[states[y][x]];
          if (c.length > 1) c = `(${c})`;
          line += c;
        }
        res += line.replace(/0+$/, '');
        res += '-';
      }
      return res.replace(/-+$/, '');
    }

    #getMinMaxXY(isX) {
      let minX = this.#width;
      let maxX = 0;
      let minY = this.#height;
      let maxY = 0;
      for (let y = this.#yMin; y < this.#yMax; ++y) {
        for (let x = this.#xMin; x < this.#xMax; ++x) {
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

    #getSymmetryTypePoint(isX) {
      const { minX, maxX, minY, maxY } = this.#getMinMaxXY(isX);
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (!isX(this.#states[y][x])) continue;
          if (!isX(this.#states[minY + maxY - y][minX + maxX - x])) {
            return null;
          }
        }
      }
      return Level.SYMMETRY_TYPE.POINT;
    }

    // 左右対称か否か。(｜)
    #isLine1(isX, minX, maxX, minY, maxY) {
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (!isX(this.#states[y][x])) continue;
          if (!isX(this.#states[y][minX + maxX - x])) {
            return false;
          }
        }
      }
      return true;
    }

    // 上下対称か否か。(―)
    #isLine2(isX, minX, maxX, minY, maxY) {
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (!isX(this.#states[y][x])) continue;
          if (!isX(this.#states[minY + maxY - y][x])) {
            return false;
          }
        }
      }
      return true;
    }

    // 斜めに対称軸があるか否か。(＼)
    #isLine3(isX, minX, maxX, minY, maxY) {
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (!isX(this.#states[y][x])) continue;
          if (!isX(this.#states[minY + x - minX][minX + y - minY])) {
            return false;
          }
        }
      }
      return true;
    }

    // 斜めに対称軸があるか否か。(／)
    #isLine4(isX, minX, maxX, minY, maxY) {
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (!isX(this.#states[y][x])) continue;
          if (!isX(this.#states[minY + maxX - x][minX + maxY - y])) {
            return false;
          }
        }
      }
      return true;
    }

    #getSymmetryTypeLine(isX) {
      const { minX, maxX, minY, maxY } = this.#getMinMaxXY(isX);

      // 左右対称か否か。(｜)
      const isLine1 = this.#isLine1(isX, minX, maxX, minY, maxY);
      if (isLine1) {
        return Level.SYMMETRY_TYPE.LINE1;
      }

      const isLine2 = this.#isLine2(isX, minX, maxX, minY, maxY);
      if (isLine2) {
        return Level.SYMMETRY_TYPE.LINE2;
      }

      if (maxX - minX !== maxY - minY) return null; // 縦と横の長さが異なる場合、左右対称でも上下対称でもなければ線対称でないことが確定。

      const isLine3 = this.#isLine3(isX, minX, maxX, minY, maxY);
      if (isLine3) {
        return Level.SYMMETRY_TYPE.LINE3;
      }

      const isLine4 = this.#isLine4(isX, minX, maxX, minY, maxY);
      if (isLine4) {
        return Level.SYMMETRY_TYPE.LINE4;
      }

      return null;
    }

    #initStates() {
      this.#width = this.#levelObj.w + 2;
      this.#height = this.#levelObj.h + 2;
      this.#xMax = this.#width - 1;
      this.#yMax = this.#height - 1;

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
          this.#states[y][this.#xMax] = app.states.wall;
        }
        for (let x = this.#xMin; x < this.#xMax; ++x) {
          this.#states[0][x] = app.states.wall;
          this.#states[this.#yMax][x] = app.states.wall;
        }
      }
    }

    #copyStates() {
      const res = new Array(this.#height);
      for (let y = 0; y < this.#height; ++y) {
        res[y] = [...this.#states[y]];
      }
      return res;
    }

    #setCheckMode(mode) {
      if (mode === Level.CHECK_MODE.POINT) {
        this.#isCompleted = this.#isCompletedPoint;
        this.#isSymmetry = this.#isSymmetryPoint;
        this.#getSymmetryType = this.#getSymmetryTypePoint;
      } else if (mode === Level.CHECK_MODE.LINE) {
        this.#isCompleted = this.#isCompletedLine;
        this.#isSymmetry = this.#isSymmetryLine;
        this.#getSymmetryType = this.#getSymmetryTypeLine;
      } else {
        throw new Error('Unexpected check mode.');
      }
      this.#checkMode = mode;
    }

    #setState(x, y, state) {
      this.#states[y][x] = state;
    }

    // 図形が連結か否か。
    #isConnected(isX) {
      const statesTemp = this.#copyStates();
      let x0;
      let y0;
      loop: for (let y = this.#yMin; y < this.#yMax; ++y) {
        for (let x = this.#xMin; x < this.#xMax; ++x) {
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

      for (let y = 0; y < this.#height; ++y) {
        for (let x = 0; x < this.#width; ++x) {
          if (isX(statesTemp[y][x])) return false;
        }
      }
      return true;
    }

    // 点対称か否か。
    #isSymmetryPoint(isX) {
      return this.#getSymmetryTypePoint(isX) !== null;
    }

    // 線対称か否か。
    #isSymmetryLine(isX) {
      return this.#getSymmetryTypeLine(isX) !== null;
    }

    #isCompletedPoint() {
      if (!this.#exist(app.states.isTarget)) return false;
      if (!this.#isSymmetryPoint(app.states.isTarget)) return false;
      if (!this.#isConnected(app.states.isTarget)) return false;
      return true;
    }

    #isCompletedLine() {
      if (!this.#exist(app.states.isTarget)) return false;
      if (!this.#isSymmetryLine(app.states.isTarget)) return false;
      if (!this.#isConnected(app.states.isTarget)) return false;
      return true;
    }

    #isInArea(x, y) {
      if (x < 0) return false;
      if (this.#width <= x) return false;
      if (y < 0) return false;
      if (this.#height <= y) return false;
      return true;
    }

    createOneBlock(x, y, blockSize, symmetryType, showCharsFlag, eyeFlag) {
      const state = this.getState(x, y);
      const color = app.colors[state];

      const gElem = app.svg.createG();
      {
        const eps = 0.01; // サイズを少し大きくすることで、隙間をなくします。
        const rect = app.svg.createRect(blockSize, {
          x: x - eps,
          y: y - eps,
          width: 1 + eps * 2,
          height: 1 + eps * 2,
          fill: color.fill,
        });
        gElem.appendChild(rect);
      }

      if (eyeFlag) {
        const dx = this.#moveFlags[y][x] ? this.#moveDx * 0.05 : 0;
        const dy = this.#moveFlags[y][x] ? this.#moveDy * 0.05 : 0;
        const eyeLeft = createEye(state, x, y, dx, dy, 0.3, 0.45);
        const eyeRight = createEye(state, x, y, dx, dy, 0.7, 0.45);
        if (showCharsFlag) {
          eyeLeft.setAttribute('opacity', 0.2);
          eyeRight.setAttribute('opacity', 0.2);
        }
        gElem.appendChild(eyeLeft);
        gElem.appendChild(eyeRight);
      }

      {
        const flags = [];
        for (let dir = 0; dir < 8; ++dir) {
          const dx = dxs[dir];
          const dy = dys[dir];
          if (this.#isInArea(x + dx, y + dy)) {
            flags[dir] = this.getState(x + dx, y + dy) === state;
          } else {
            flags[dir] = true;
          }
        }

        // 上側
        if (!flags[dirs.u]) {
          const line = app.svg.createRect(blockSize, {
            x,
            y,
            width: 1,
            height: blockBorderWidth,
            fill: color.stroke,
          });
          gElem.appendChild(line);
        }
        // 右側
        if (!flags[dirs.r]) {
          const line = app.svg.createRect(blockSize, {
            x: x + 1 - blockBorderWidth,
            y,
            width: blockBorderWidth,
            height: 1,
            fill: color.stroke,
          });
          gElem.appendChild(line);
        }
        // 下側
        if (!flags[dirs.d]) {
          const line = app.svg.createRect(blockSize, {
            x,
            y: y + 1 - blockBorderWidth,
            width: 1,
            height: blockBorderWidth,
            fill: color.stroke,
          });
          gElem.appendChild(line);
        }
        // 左側
        if (!flags[dirs.l]) {
          const line = app.svg.createRect(blockSize, {
            x,
            y,
            width: blockBorderWidth,
            height: 1,
            fill: color.stroke,
          });
          gElem.appendChild(line);
        }
        // 右上
        if (flags[dirs.u] && flags[dirs.r] && !flags[dirs.ur]) {
          const rect = app.svg.createRect(blockSize, {
            x: x + 1 - blockBorderWidth,
            y,
            width: blockBorderWidth,
            height: blockBorderWidth,
            fill: color.stroke,
          });
          gElem.appendChild(rect);
        }
        // 右下
        if (flags[dirs.d] && flags[dirs.r] && !flags[dirs.dr]) {
          const rect = app.svg.createRect(blockSize, {
            x: x + 1 - blockBorderWidth,
            y: y + 1 - blockBorderWidth,
            width: blockBorderWidth,
            height: blockBorderWidth,
            fill: color.stroke,
          });
          gElem.appendChild(rect);
        }
        // 左下
        if (flags[dirs.d] && flags[dirs.l] && !flags[dirs.dl]) {
          const rect = app.svg.createRect(blockSize, {
            x,
            y: y + 1 - blockBorderWidth,
            width: blockBorderWidth,
            height: blockBorderWidth,
            fill: color.stroke,
          });
          gElem.appendChild(rect);
        }
        // 左上
        if (flags[dirs.u] && flags[dirs.l] && !flags[dirs.ul]) {
          const rect = app.svg.createRect(blockSize, {
            x,
            y,
            width: blockBorderWidth,
            height: blockBorderWidth,
            fill: color.stroke,
          });
          gElem.appendChild(rect);
        }

        if (app.states.isOther(state)) {
          const size = blockBorderWidth * 1.75;
          if (!flags[dirs.u]) {
            // 左上
            if (!flags[dirs.l]) {
              const rect = app.svg.createRect(blockSize, {
                x,
                y,
                width: size,
                height: size,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
            // 右上
            if (!flags[dirs.r]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - size,
                y,
                width: size,
                height: size,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
          }
          if (!flags[dirs.d]) {
            // 右下
            if (!flags[dirs.r]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - size,
                y: y + 1 - size,
                width: size,
                height: size,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
            // 左下
            if (!flags[dirs.l]) {
              const rect = app.svg.createRect(blockSize, {
                x,
                y: y + 1 - size,
                width: size,
                height: size,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
          }
        }

        if (app.states.isUser(state)) {
          const size = blockBorderWidth * 3;
          if (!flags[dirs.u]) {
            // 右上
            if (!flags[dirs.r]) {
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
            // 左上
            if (!flags[dirs.l]) {
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
          if (!flags[dirs.d]) {
            // 右下
            if (!flags[dirs.r]) {
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
            if (!flags[dirs.l]) {
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
          }
        }

        if (app.states.isTarget(state) && symmetryType !== null) {
          gElem.classList.add(animationClass[symmetryType]);
        }
      }

      if (showCharsFlag) {
        const text = app.svg.createText(blockSize, {
          x: x + 0.5,
          y,
          text: app.states.stateToChar[state],
        });
        gElem.appendChild(text);
        if (
          state === app.states.none ||
          state === app.states.wall ||
          this.#isConnected((s) => s === state)
        ) {
          text.setAttribute('fill', app.colors[state].text);
        } else {
          text.setAttribute('fill', app.colors[state].error);
          const rect = app.svg.createRect(blockSize, {
            x,
            y,
            width: 1,
            height: 1,
            fill: 'black',
          });
          rect.setAttribute('opacity', 0.3);
          gElem.appendChild(rect);
        }
        text.setAttribute('font-size', `${blockSize * 0.7}px`);
        text.setAttribute('font-weight', 'bold');
      }

      return gElem;

      function createEye(state, x, y, dx, dy, ddx, ddy) {
        if (app.states.isUser(state)) {
          return app.svg.createCircle(blockSize, {
            cx: x + dx + ddx,
            cy: y + dy + ddy,
            r: 0.1,
            fill: color.stroke,
          });
        } else {
          return app.svg.createRect(blockSize, {
            x: x + ddx - 0.09,
            y: y + ddy,
            width: 0.18,
            height: 0.07,
            fill: color.stroke,
          });
        }
      }
    }

    #addOneBlock(
      x,
      y,
      blockSize,
      symmetryType,
      showCharsFlag,
      eyeFlag,
      gShadows,
      gElems
    ) {
      const state = this.getState(x, y);
      const color = app.colors[state];

      const elem = this.createOneBlock(
        x,
        y,
        blockSize,
        symmetryType,
        showCharsFlag,
        eyeFlag
      );

      {
        const flags = [];
        for (let dir = 0; dir < 8; ++dir) {
          const dx = dxs[dir];
          const dy = dys[dir];
          if (this.#isInArea(x + dx, y + dy)) {
            flags[dir] = this.getState(x + dx, y + dy) === state;
          } else {
            flags[dir] = true;
          }
        }

        // 移動モーション
        if (this.#moveFlags[y][x]) {
          const dx = this.#moveDx;
          const dy = this.#moveDy;
          elem.classList.add('animation-block');

          // 移動時のエフェクト（残像）
          if (!this.#moveFlags[y - dy][x - dx]) {
            const gShadow = app.svg.createG();
            {
              const dd = 0.2;
              const ddd = 0.15;
              const rectArg = {
                x: x - dx,
                y: y - dy,
                width: 1,
                height: 1,
                fill: color.fill,
              };
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

      gElems.appendChild(elem);
    }
  }

  const animationClass = {
    [Level.SYMMETRY_TYPE.POINT]: 'animation-rotation',
    [Level.SYMMETRY_TYPE.LINE1]: 'animation-line1',
    [Level.SYMMETRY_TYPE.LINE2]: 'animation-line2',
    [Level.SYMMETRY_TYPE.LINE3]: 'animation-line3',
    [Level.SYMMETRY_TYPE.LINE4]: 'animation-line4',
  };

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Level = Level;
  } else {
    module.exports = Level;
  }
})();
