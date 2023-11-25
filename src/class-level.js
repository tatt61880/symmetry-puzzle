(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  if (isBrowser) {
    app = window.app;
    console.assert(app?.states !== undefined);
    console.assert(app?.colors !== undefined);
    console.assert(app?.common !== undefined);
    console.assert(app?.svg !== undefined);
    console.assert(app?.Stack !== undefined);
  } else {
    app.states = require('./states.js');
    app.colors = require('./colors.js');
    app.common = require('./common.js');
    app.svg = require('./svg.js');
    app.Stack = require('./class-stack.js');
  }

  const dirs = {
    u: 0,
    r: 1,
    d: 2,
    l: 3,
    ul: 4,
    ur: 5,
    dr: 6,
    dl: 7,
  };

  const dxs = [0, 1, 0, -1, -1, 1, 1, -1];
  const dys = [-1, 0, 1, 0, -1, -1, 1, 1];

  const blockBorderWidth = 1 / 8;

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
      LINE: Symbol('line'),
      POINT: Symbol('point'),
      SPECIAL: Symbol('special'),
    };

    static SYMMETRY_TYPE = {
      LINE1: Symbol('line1'), // m (｜)
      LINE2: Symbol('line2'), // m (―)
      LINE3: Symbol('line3'), // m (＼)
      LINE4: Symbol('line4'), // m (／)
      PLUS1: Symbol('plus1'), // 2mm (｜―)
      PLUS2: Symbol('plus2'), // 2mm (＼／)
      PLUS3: Symbol('plus3'), // 4mm (｜―＼／)
      POINT1: Symbol('point1'), // 2
      POINT2: Symbol('point2'), // 4
      SPECIAL1: Symbol('special1'), // 2mm (｜―)
      SPECIAL2: Symbol('special2'), // 2mm (＼／)
      SPECIAL3: Symbol('special3'), // 4mm (｜―＼／)
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
    #getSymmetryType;

    constructor({
      levelObj,
      checkMode = Level.CHECK_MODE.LINE,
      mirrorFlag = false,
      rotateNum = 0,
    }) {
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
      this.#getSymmetryType = null;

      this.#setCheckMode(checkMode);
      let obj = levelObj;
      if (mirrorFlag) obj = this.#mirrorLevel(obj);
      if (rotateNum !== 0) obj = this.#rotateLevel(obj, rotateNum);
      this.#levelObj = obj;
      if (this.#levelObj.w > app.common.maxW)
        this.#levelObj.w = app.common.maxW;
      if (this.#levelObj.h > app.common.maxH)
        this.#levelObj.h = app.common.maxH;
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

    getS() {
      return this.#getStateStrSub(
        this.#states,
        this.#xMin,
        this.#xMax,
        this.#yMin,
        this.#yMax
      );
    }

    getR() {
      return this.#levelObj?.r;
    }

    printSolveJsStr() {
      const w = this.getW();
      const h = this.getH();
      const s = this.getS();

      const solveJsStr =
        `node src/solve.js -w ${w} -h ${h} -s ${s} --all --console --draw` +
        (this.isLineMode() ? ' --line' : '');
      console.log(solveJsStr);
    }

    getUrlStr() {
      const w = this.getW();
      const h = this.getH();
      const s = this.getS();

      console.log(`{ w: ${w}, h: ${h}, s: '${s}' },`); // コピペ用
      this.printSolveJsStr();

      const checkModeStr = (() => {
        switch (this.getCheckMode()) {
          case Level.CHECK_MODE.LINE:
            return '&line';
          case Level.CHECK_MODE.SPECIAL:
            return '&special';
          default:
            return '';
        }
      })();

      const urlStr = `${
        location.href.split('?')[0]
      }?w=${w}&h=${h}&s=${s}${checkModeStr}`;
      return urlStr;
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

    resize(dx, dy, flag) {
      const w = this.getW() + dx;
      const h = this.getH() + dy;
      if (w < 1) return;
      if (h < 1) return;
      if (w > app.common.maxW) return;
      if (h > app.common.maxH) return;

      if (flag) {
        this.rotate(2);
      }
      const s = this.getS();
      const obj = { w, h, s };
      this.applyObj(obj, true);
      if (flag) {
        this.rotate(2);
        const s = this.getS();
        const obj = { w, h, s };
        this.applyObj(obj, false);
      }
    }

    // 左右反転
    mirror() {
      const obj = {
        w: this.getW(),
        h: this.getH(),
        s: this.getS(),
      };
      const newObj = this.#mirrorLevel(obj);
      this.applyObj(newObj);
    }

    // 90度回転
    rotate(rotateNum) {
      const obj = {
        w: this.getW(),
        h: this.getH(),
        s: this.getS(),
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
      return this.#getSymmetryType(isX) !== null;
    }

    isCompleted() {
      if (!this.#exist(app.states.isTarget)) return false;
      if (!this.isSymmetry(app.states.isTarget)) return false;
      if (!this.#isConnected(app.states.isTarget)) return false;
      return true;
    }

    getCheckMode() {
      return this.#checkMode;
    }

    isLineMode() {
      return this.#checkMode === Level.CHECK_MODE.LINE;
    }

    isSpecialMode() {
      return this.#checkMode === Level.CHECK_MODE.SPECIAL;
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

    createSvgG({
      blockSize,
      symmetryAnimationFlag = false,
      showCharsFlag = false,
      drawBackground = true,
      x0 = 0,
      y0 = 0,
      width = this.#width,
      height = this.#height,
    }) {
      const g = app.svg.createG();

      const symmetryType = symmetryAnimationFlag
        ? this.getSymmetryType(app.states.isTarget)
        : null;

      // 背景
      if (drawBackground) {
        const rect = app.svg.createRect(blockSize, {
          x: 0,
          y: 0,
          width,
          height,
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

      const stateHasEyes = {}; // 一番左上のみに目を付けます。
      for (let y = y0; y < y0 + height; ++y) {
        for (let x = x0; x < x0 + width; ++x) {
          const state = this.getState(x, y);
          if (state === app.states.none) continue;

          const eyeFlag = (() => {
            if (!app.states.isUser(state)) return false;
            if (stateHasEyes[state]) return false;
            stateHasEyes[state] = true;
            return true;
          })();
          const gElems = app.states.isTarget(state)
            ? gElemsTarget
            : gElemsNotTarget;
          this.#addOneBlock(
            x - x0,
            y - y0,
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
        switch (symmetryType) {
          case Level.SYMMETRY_TYPE.LINE1: // m (｜)
            gg.appendChild(createAxisLine1(center, height));
            gg.classList.add('animation-symmetry-axis');
            break;
          case Level.SYMMETRY_TYPE.LINE2: // m (―)
            gg.appendChild(createAxisLine2(center, width));
            gg.classList.add('animation-symmetry-axis');
            break;
          case Level.SYMMETRY_TYPE.LINE3: // m (＼)
            gg.appendChild(createAxisLine3(center, height));
            gg.classList.add('animation-symmetry-axis');
            break;
          case Level.SYMMETRY_TYPE.LINE4: // m (／)
            gg.appendChild(createAxisLine4(center, height));
            gg.classList.add('animation-symmetry-axis');
            break;
          case Level.SYMMETRY_TYPE.PLUS1: {
            // 2mm (｜―)
            const line1 = createAxisLine1(center, height);
            const line2 = createAxisLine2(center, width);
            line1.classList.add('animation-symmetry-axis', 'axis-2-1');
            line2.classList.add('animation-symmetry-axis', 'axis-2-2');
            gg.appendChild(line1);
            gg.appendChild(line2);
            break;
          }
          case Level.SYMMETRY_TYPE.PLUS2: {
            // 2mm (＼／)
            const line3 = createAxisLine3(center, height);
            const line4 = createAxisLine4(center, height);
            line3.classList.add('animation-symmetry-axis', 'axis-2-1');
            line4.classList.add('animation-symmetry-axis', 'axis-2-2');
            gg.appendChild(line3);
            gg.appendChild(line4);
            break;
          }
          case Level.SYMMETRY_TYPE.PLUS3: {
            // 4mm (｜―＼／)
            const line1 = createAxisLine1(center, height);
            const line2 = createAxisLine2(center, width);
            const line3 = createAxisLine3(center, height);
            const line4 = createAxisLine4(center, height);
            line1.classList.add('animation-symmetry-axis', 'axis-4-1');
            line2.classList.add('animation-symmetry-axis', 'axis-4-2');
            line3.classList.add('animation-symmetry-axis', 'axis-4-3');
            line4.classList.add('animation-symmetry-axis', 'axis-4-4');
            gg.appendChild(line1);
            gg.appendChild(line2);
            gg.appendChild(line3);
            gg.appendChild(line4);
            break;
          }
          case Level.SYMMETRY_TYPE.POINT1: // 2
            gg.appendChild(createAxisPoint1(center));
            gg.classList.add('animation-symmetry-axis');
            break;
          case Level.SYMMETRY_TYPE.POINT2: // 4
            gg.appendChild(createAxisPoint2(center));
            gg.classList.add('animation-symmetry-axis');
            break;

          case Level.SYMMETRY_TYPE.SPECIAL1: {
            // 2mm (｜―)
            const point = createAxisPoint1(center);
            const line1 = createAxisLine1(center, height);
            const line2 = createAxisLine2(center, width);

            point.classList.add('animation-symmetry-axis', 'axis-3-1');
            line1.classList.add('animation-symmetry-axis', 'axis-3-2');
            line2.classList.add('animation-symmetry-axis', 'axis-3-3');
            gg.appendChild(point);
            gg.appendChild(line1);
            gg.appendChild(line2);
            break;
          }
          case Level.SYMMETRY_TYPE.SPECIAL2: {
            // 2mm (＼／)
            const point = createAxisPoint1(center);
            const line3 = createAxisLine3(center, height);
            const line4 = createAxisLine4(center, height);
            point.classList.add('animation-symmetry-axis', 'axis-3-1');
            line3.classList.add('animation-symmetry-axis', 'axis-3-2');
            line4.classList.add('animation-symmetry-axis', 'axis-3-3');
            gg.appendChild(point);
            gg.appendChild(line3);
            gg.appendChild(line4);
            break;
          }
          case Level.SYMMETRY_TYPE.SPECIAL3: {
            // 4mm (｜―＼／)
            const point = createAxisPoint2(center);
            const line1 = createAxisLine1(center, height);
            const line2 = createAxisLine2(center, width);
            const line3 = createAxisLine3(center, height);
            const line4 = createAxisLine4(center, height);
            point.classList.add('animation-symmetry-axis', 'axis-3-1');
            line1.classList.add('animation-symmetry-axis', 'axis-3-2');
            line2.classList.add('animation-symmetry-axis', 'axis-3-2');
            line3.classList.add('animation-symmetry-axis', 'axis-3-3');
            line4.classList.add('animation-symmetry-axis', 'axis-3-3');
            gg.appendChild(point);
            gg.appendChild(line1);
            gg.appendChild(line2);
            gg.appendChild(line3);
            gg.appendChild(line4);
            break;
          }
        }
      }

      return g;

      function createAxisPoint1(center) {
        return app.svg.createEllipse(blockSize, {
          cx: center.x,
          cy: center.y,
          rx: 1 / 8,
          ry: 3 / 8,
          fill: app.colors.symmetryAxis,
        });
      }

      function createAxisPoint2(center) {
        const x = center.x;
        const y = center.y;
        const size = 3 / 8;
        return app.svg.createPolygon(blockSize, {
          points: [
            [x, y - size],
            [x + size, y],
            [x, y + size],
            [x - size, y],
          ],
          fill: app.colors.symmetryAxis,
        });
      }

      function createAxisLine1(center, height) {
        return app.svg.createLine(blockSize, {
          x1: center.x,
          y1: 0,
          x2: center.x,
          y2: height,
          stroke: app.colors.symmetryAxis,
          strokeWidth: 0.1,
        });
      }

      function createAxisLine2(center, width) {
        return app.svg.createLine(blockSize, {
          x1: 0,
          y1: center.y,
          x2: width,
          y2: center.y,
          stroke: app.colors.symmetryAxis,
          strokeWidth: 0.1,
        });
      }

      function createAxisLine3(center, height) {
        return app.svg.createLine(blockSize, {
          x1: center.x - center.y - 1,
          y1: 0 - 1,
          x2: center.x + height - center.y + 1,
          y2: height + 1,
          stroke: app.colors.symmetryAxis,
          strokeWidth: 0.1,
        });
      }

      function createAxisLine4(center, height) {
        return app.svg.createLine(blockSize, {
          x1: center.x + center.y + 1,
          y1: 0 - 1,
          x2: center.x - height + center.y - 1,
          y2: height + 1,
          stroke: app.colors.symmetryAxis,
          strokeWidth: 0.1,
        });
      }
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
        let newR = '';
        for (const c of r) {
          newR += (4 - Number(c)) % 4;
        }
        r = newR;
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
          let newR = '';
          for (const c of r) {
            newR += (Number(c) + 1) % 4;
          }
          r = newR;
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
      if (maxX - minX !== maxY - minY) return false;
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
      if (maxX - minX !== maxY - minY) return false;
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

      const isLine1 = this.#isLine1(isX, minX, maxX, minY, maxY);
      const isLine2 = this.#isLine2(isX, minX, maxX, minY, maxY);
      const isLine3 = this.#isLine3(isX, minX, maxX, minY, maxY);
      const isLine4 = this.#isLine4(isX, minX, maxX, minY, maxY);

      if (isLine1) {
        if (isLine2) {
          if (isLine3) {
            return Level.SYMMETRY_TYPE.PLUS3;
          }
          return Level.SYMMETRY_TYPE.PLUS1;
        }
        return Level.SYMMETRY_TYPE.LINE1;
      }
      if (isLine2) {
        return Level.SYMMETRY_TYPE.LINE2;
      }
      if (isLine3) {
        if (isLine4) {
          return Level.SYMMETRY_TYPE.PLUS2;
        }
        return Level.SYMMETRY_TYPE.LINE3;
      }
      if (isLine4) {
        return Level.SYMMETRY_TYPE.LINE4;
      }

      return null;
    }

    #isPoint1(isX, minX, maxX, minY, maxY) {
      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (!isX(this.#states[y][x])) continue;
          if (!isX(this.#states[minY + maxY - y][minX + maxX - x])) {
            return false;
          }
        }
      }
      return true;
    }

    #isPoint2(isX, minX, maxX, minY, maxY) {
      if (maxX - minX !== maxY - minY) return false;

      for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
          if (!isX(this.#states[y][x])) continue;
          const xx = x - minX;
          const yy = y - minY;
          if (!isX(this.#states[maxY - xx][minX + yy])) {
            return false;
          }
        }
      }
      return true;
    }

    #getSymmetryTypePoint(isX) {
      const { minX, maxX, minY, maxY } = this.#getMinMaxXY(isX);

      const isPoint1 = this.#isPoint1(isX, minX, maxX, minY, maxY);

      if (!isPoint1) return null;

      const isPoint2 = this.#isPoint2(isX, minX, maxX, minY, maxY);

      if (isPoint2) {
        return Level.SYMMETRY_TYPE.POINT2;
      } else {
        return Level.SYMMETRY_TYPE.POINT1;
      }
    }

    #getSymmetryTypeSpecial(isX) {
      const { minX, maxX, minY, maxY } = this.#getMinMaxXY(isX);

      const isPoint1 = this.#isPoint1(isX, minX, maxX, minY, maxY);
      if (!isPoint1) return null;

      const isPoint2 = this.#isPoint2(isX, minX, maxX, minY, maxY);
      const isLine1 = this.#isLine1(isX, minX, maxX, minY, maxY);
      const isLine3 = this.#isLine3(isX, minX, maxX, minY, maxY);
      if (isPoint2) {
        if (isLine1) {
          return Level.SYMMETRY_TYPE.SPECIAL3;
        }
      } else {
        if (isLine1) {
          return Level.SYMMETRY_TYPE.SPECIAL1;
        }
        if (isLine3) {
          return Level.SYMMETRY_TYPE.SPECIAL2;
        }
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
      switch (mode) {
        case Level.CHECK_MODE.LINE:
          this.#getSymmetryType = this.#getSymmetryTypeLine;
          break;
        case Level.CHECK_MODE.POINT:
          this.#getSymmetryType = this.#getSymmetryTypePoint;
          break;
        case Level.CHECK_MODE.SPECIAL:
          this.#getSymmetryType = this.#getSymmetryTypeSpecial;
          break;
        default:
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

    #isInArea(x, y) {
      if (x < 0) return false;
      if (this.#width <= x) return false;
      if (y < 0) return false;
      if (this.#height <= y) return false;
      return true;
    }

    #createOneBlock(
      x,
      y,
      stateX,
      stateY,
      blockSize,
      symmetryType,
      showCharsFlag,
      eyeFlag
    ) {
      const state = this.getState(stateX, stateY);
      const color = app.colors[state];

      const gElem = app.svg.createG();

      {
        const flags = [];
        for (let dir = 0; dir < 8; ++dir) {
          const dx = dxs[dir];
          const dy = dys[dir];
          if (this.#isInArea(stateX + dx, stateY + dy)) {
            flags[dir] = this.getState(stateX + dx, stateY + dy) === state;
          } else {
            flags[dir] = true;
          }
        }

        const eps = 0.01; // 隙間を埋めます。
        const eps2 = eps * 2;

        // 操作キャラ
        if (app.states.isUser(state)) {
          const radius = 0.3;
          const radius2 = radius * 2;
          const blockBorderWidth = 0.1;

          // 左上
          if (!flags[dirs.u] && !flags[dirs.l]) {
            const circle = app.svg.createCircle(blockSize, {
              cx: x + radius,
              cy: y + radius,
              r: radius,
              fill: color.stroke,
            });
            gElem.appendChild(circle);
            const circle2 = app.svg.createCircle(blockSize, {
              cx: x + radius,
              cy: y + radius,
              r: radius - blockBorderWidth,
              fill: color.fill,
            });
            gElem.appendChild(circle2);
          } else {
            {
              const rect = app.svg.createRect(blockSize, {
                x,
                y,
                width: radius + eps,
                height: radius + eps,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (!flags[dirs.u]) {
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y,
                width: radius + eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.l]) {
              const rect = app.svg.createRect(blockSize, {
                x,
                y: y - eps,
                width: blockBorderWidth,
                height: radius + eps2,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.ul]) {
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y - eps,
                width: blockBorderWidth + eps,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
          }

          // 右上
          if (!flags[dirs.u] && !flags[dirs.r]) {
            const circle = app.svg.createCircle(blockSize, {
              cx: x + 1 - radius,
              cy: y + radius,
              r: radius,
              fill: color.stroke,
            });
            gElem.appendChild(circle);
            const circle2 = app.svg.createCircle(blockSize, {
              cx: x + 1 - radius,
              cy: y + radius,
              r: radius - blockBorderWidth,
              fill: color.fill,
            });
            gElem.appendChild(circle2);
          } else {
            {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - radius - eps,
                y,
                width: radius + eps,
                height: radius + eps,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (!flags[dirs.u]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - radius - eps,
                y,
                width: radius + eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.r]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y - eps,
                width: blockBorderWidth,
                height: radius + eps2,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.ur]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y - eps,
                width: blockBorderWidth + eps,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
          }

          // 右下
          if (!flags[dirs.d] && !flags[dirs.r]) {
            const circle = app.svg.createCircle(blockSize, {
              cx: x + 1 - radius,
              cy: y + 1 - radius,
              r: radius,
              fill: color.stroke,
            });
            gElem.appendChild(circle);
            const circle2 = app.svg.createCircle(blockSize, {
              cx: x + 1 - radius,
              cy: y + 1 - radius,
              r: radius - blockBorderWidth,
              fill: color.fill,
            });
            gElem.appendChild(circle2);
          } else {
            {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - radius - eps,
                y: y + 1 - radius - eps,
                width: radius + eps,
                height: radius + eps,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (!flags[dirs.d]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - radius - eps,
                y: y + 1 - blockBorderWidth,
                width: radius + eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.r]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y + 1 - radius - eps,
                width: blockBorderWidth,
                height: radius + eps2,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.dr]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth + eps,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
          }

          // 左下
          if (!flags[dirs.d] && !flags[dirs.l]) {
            const circle = app.svg.createCircle(blockSize, {
              cx: x + radius,
              cy: y + 1 - radius,
              r: radius,
              fill: color.stroke,
            });
            gElem.appendChild(circle);
            const circle2 = app.svg.createCircle(blockSize, {
              cx: x + radius,
              cy: y + 1 - radius,
              r: radius - blockBorderWidth,
              fill: color.fill,
            });
            gElem.appendChild(circle2);
          } else {
            {
              const rect = app.svg.createRect(blockSize, {
                x,
                y: y + 1 - radius - eps,
                width: radius + eps,
                height: radius + eps,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (!flags[dirs.d]) {
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + 1 - blockBorderWidth,
                width: radius + eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.l]) {
              const rect = app.svg.createRect(blockSize, {
                x,
                y: y + 1 - radius - eps,
                width: blockBorderWidth,
                height: radius + eps2,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.dl]) {
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth + eps,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
          }

          // 中央付近の塗りつぶし
          {
            // 横長
            const rect = app.svg.createRect(blockSize, {
              x,
              y: y + radius,
              width: 1,
              height: 1 - radius2,
              fill: color.fill,
            });
            gElem.appendChild(rect);
          }
          {
            // 縦長
            const rect = app.svg.createRect(blockSize, {
              x: x + radius,
              y,
              width: 1 - radius2,
              height: 1,
              fill: color.fill,
            });
            gElem.appendChild(rect);
          }

          // 上側
          if (!flags[dirs.u]) {
            const line = app.svg.createRect(blockSize, {
              x: x + radius - eps,
              y,
              width: 1 - radius2 + eps2,
              height: blockBorderWidth,
              fill: color.stroke,
            });
            gElem.appendChild(line);
          }
          // 右側
          if (!flags[dirs.r]) {
            const line = app.svg.createRect(blockSize, {
              x: x + 1 - blockBorderWidth,
              y: y + radius - eps,
              width: blockBorderWidth,
              height: 1 - radius2 + eps2,
              fill: color.stroke,
            });
            gElem.appendChild(line);
          }
          // 下側
          if (!flags[dirs.d]) {
            const line = app.svg.createRect(blockSize, {
              x: x + radius - eps,
              y: y + 1 - blockBorderWidth,
              width: 1 - radius2 + eps2,
              height: blockBorderWidth,
              fill: color.stroke,
            });
            gElem.appendChild(line);
          }
          // 左側
          if (!flags[dirs.l]) {
            const line = app.svg.createRect(blockSize, {
              x,
              y: y + radius - eps,
              width: blockBorderWidth,
              height: 1 - radius2 + eps2,
              fill: color.stroke,
            });
            gElem.appendChild(line);
          }

          // 左側の境界線上
          if (flags[dirs.l]) {
            if (flags[dirs.u] && flags[dirs.ul]) {
              // eps 左 上 fill
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y,
                width: eps2,
                height: blockBorderWidth,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            {
              // eps 左 中 fill
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + blockBorderWidth,
                width: eps2,
                height: 1 - blockBorderWidth * 2,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (flags[dirs.d] && flags[dirs.dl]) {
              // eps 左 下 fill
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + 1 - blockBorderWidth,
                width: eps2,
                height: blockBorderWidth,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }
          }

          // 上側の境界線上
          if (flags[dirs.u]) {
            if (flags[dirs.l] && flags[dirs.ul]) {
              // eps 上 左 fill
              const rect = app.svg.createRect(blockSize, {
                x,
                y: y - eps,
                width: blockBorderWidth,
                height: eps2,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            {
              // eps 上 中 fill
              const rect = app.svg.createRect(blockSize, {
                x: x + blockBorderWidth,
                y: y - eps,
                width: 1 - blockBorderWidth * 2,
                height: eps2,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (flags[dirs.r] && flags[dirs.ur]) {
              // eps 上 右 fill
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y - eps,
                width: blockBorderWidth,
                height: eps2,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }
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
        } else {
          // 操作キャラ以外

          // 塗りつぶし
          {
            const rect = app.svg.createRect(blockSize, {
              x,
              y,
              width: 1,
              height: 1,
              fill: color.fill,
            });
            gElem.appendChild(rect);
          }

          // 上側の境界枠
          if (!flags[dirs.u]) {
            const line = app.svg.createRect(blockSize, {
              x,
              y,
              width: 1,
              height: blockBorderWidth,
              fill: color.stroke,
            });
            gElem.appendChild(line);
            if (flags[dirs.l]) {
              // eps 左 上 stroke
              const line = app.svg.createRect(blockSize, {
                x: x - eps,
                y,
                width: eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(line);
            }
          }
          // 右側の境界枠
          if (!flags[dirs.r]) {
            const line = app.svg.createRect(blockSize, {
              x: x + 1 - blockBorderWidth,
              y,
              width: blockBorderWidth,
              height: 1,
              fill: color.stroke,
            });
            gElem.appendChild(line);
            if (flags[dirs.u]) {
              // eps 上 右 stroke
              const line = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y - eps,
                width: blockBorderWidth,
                height: eps2,
                fill: color.stroke,
              });
              gElem.appendChild(line);
            }
          }
          // 下側の境界枠
          if (!flags[dirs.d]) {
            const line = app.svg.createRect(blockSize, {
              x,
              y: y + 1 - blockBorderWidth,
              width: 1,
              height: blockBorderWidth,
              fill: color.stroke,
            });
            gElem.appendChild(line);
            if (flags[dirs.l]) {
              // eps 左 下 stroke
              const line = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + 1 - blockBorderWidth,
                width: eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(line);
            }
          }
          // 左側の境界枠
          if (!flags[dirs.l]) {
            const line = app.svg.createRect(blockSize, {
              x,
              y,
              width: blockBorderWidth,
              height: 1,
              fill: color.stroke,
            });
            gElem.appendChild(line);
            if (flags[dirs.u]) {
              // eps 上 左 stroke
              const line = app.svg.createRect(blockSize, {
                x,
                y: y - eps,
                width: blockBorderWidth,
                height: eps2,
                fill: color.stroke,
              });
              gElem.appendChild(line);
            }
          }

          // 左側の境界線上
          if (flags[dirs.l]) {
            if (flags[dirs.u] && flags[dirs.ul]) {
              // eps 左 上 fill
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y,
                width: eps2,
                height: blockBorderWidth,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            {
              // eps 左 中 fill
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + blockBorderWidth,
                width: eps2,
                height: 1 - blockBorderWidth * 2,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (flags[dirs.d] && flags[dirs.dl]) {
              // eps 左 下 fill
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + 1 - blockBorderWidth,
                width: eps2,
                height: blockBorderWidth,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }
          }

          // 上側の境界線上 + 上側の境界枠上
          if (flags[dirs.u]) {
            // 左上
            if (flags[dirs.l]) {
              if (!flags[dirs.ul]) {
                // 上 左 stroke
                const rect = app.svg.createRect(blockSize, {
                  x: x - eps,
                  y: y - eps,
                  width: blockBorderWidth + eps,
                  height: blockBorderWidth + eps,
                  fill: color.stroke,
                });
                gElem.appendChild(rect);
              } else {
                // eps 上 左 fill
                const rect = app.svg.createRect(blockSize, {
                  x,
                  y: y - eps,
                  width: blockBorderWidth,
                  height: eps2,
                  fill: color.fill,
                });
                gElem.appendChild(rect);
              }
            }

            {
              // eps 上 中 fill
              const rect = app.svg.createRect(blockSize, {
                x: x + blockBorderWidth,
                y: y - eps,
                width: 1 - blockBorderWidth * 2,
                height: eps2,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            // 右上
            if (flags[dirs.r]) {
              if (!flags[dirs.ur]) {
                // 上 右 stroke
                const rect = app.svg.createRect(blockSize, {
                  x: x + 1 - blockBorderWidth,
                  y: y - eps,
                  width: blockBorderWidth + eps,
                  height: blockBorderWidth + eps,
                  fill: color.stroke,
                });
                gElem.appendChild(rect);
              } else {
                // eps 上 右 fill
                const rect = app.svg.createRect(blockSize, {
                  x: x + 1 - blockBorderWidth,
                  y: y - eps,
                  width: blockBorderWidth,
                  height: eps2,
                  fill: color.fill,
                });
                gElem.appendChild(rect);
              }
            }
          }

          // 下側の境界枠上
          if (flags[dirs.d]) {
            if (flags[dirs.r] && !flags[dirs.dr]) {
              // 下 右 stroke
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth + eps,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
            if (flags[dirs.l] && !flags[dirs.dl]) {
              // 下 左 stroke
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth + eps,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            }
          }

          // 邪魔ブロック
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

          if (app.states.isTarget(state) && symmetryType !== null) {
            gElem.classList.add(animationClass[symmetryType]);
          }
        }
      }

      if (showCharsFlag) {
        const text = app.svg.createText(blockSize, {
          x: x + 0.5,
          y: y + 0.5,
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
      stateX,
      stateY,
      blockSize,
      symmetryType,
      showCharsFlag,
      eyeFlag,
      gShadows,
      gElems
    ) {
      const state = this.getState(x, y);
      const color = app.colors[state];

      const elem = this.#createOneBlock(
        x,
        y,
        stateX,
        stateY,
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
    [Level.SYMMETRY_TYPE.LINE1]: 'animation-axis-line1',
    [Level.SYMMETRY_TYPE.LINE2]: 'animation-axis-line2',
    [Level.SYMMETRY_TYPE.LINE3]: 'animation-axis-line3',
    [Level.SYMMETRY_TYPE.LINE4]: 'animation-axis-line4',
    [Level.SYMMETRY_TYPE.PLUS1]: 'animation-axis-plus1',
    [Level.SYMMETRY_TYPE.PLUS2]: 'animation-axis-plus2',
    [Level.SYMMETRY_TYPE.PLUS3]: 'animation-axis-plus3',
    [Level.SYMMETRY_TYPE.POINT1]: 'animation-axis-point1',
    [Level.SYMMETRY_TYPE.POINT2]: 'animation-axis-point2',
    [Level.SYMMETRY_TYPE.SPECIAL1]: 'animation-axis-special1',
    [Level.SYMMETRY_TYPE.SPECIAL2]: 'animation-axis-special2',
    [Level.SYMMETRY_TYPE.SPECIAL3]: 'animation-axis-special3',
  };

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Level = Level;
  } else {
    module.exports = Level;
  }
})();
