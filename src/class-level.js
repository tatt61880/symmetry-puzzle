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

  const axisOffset = 2;

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
      NONE: Symbol('none'),

      // 線対称の分類
      LINE1: Symbol('line1'), // m (｜)
      LINE2: Symbol('line2'), // m (―)
      LINE3: Symbol('line3'), // m (＼)
      LINE4: Symbol('line4'), // m (／)
      PLUS1: Symbol('plus1'), // 2mm (｜―)
      PLUS2: Symbol('plus2'), // 2mm (＼／)
      PLUS3: Symbol('plus3'), // 4mm (｜―＼／)

      // 点対称の分類
      POINT1: Symbol('point1'), // 2
      POINT2: Symbol('point2'), // 4

      // 線&点対称の分類
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
    #eyePrevInfo;
    #yMin;
    #xMin;
    #yMax;
    #xMax;
    #getSymmetryType;
    #axis;
    #mirrorFlag;

    constructor({ levelObj, checkMode = Level.CHECK_MODE.LINE, mirrorFlag = false, rotateNum = 0 }) {
      this.#checkMode = null;
      this.#levelObj = null;
      this.#width = null;
      this.#height = null;
      this.#states = [];
      this.#moveFlags = [];
      this.#moveDx = null;
      this.#moveDy = null;
      this.#eyePrevInfo = [];
      this.#yMin = 1;
      this.#xMin = 1;
      this.#yMax = null;
      this.#xMax = null;
      this.#getSymmetryType = null;
      this.#axis = null;
      this.#mirrorFlag = false;

      this.#setCheckMode(checkMode);
      let obj = levelObj;
      this.applyAxis(obj.axis);
      if (mirrorFlag) {
        obj = this.#mirrorLevel(obj);
        this.#mirrorFlag = true;
      }
      if (rotateNum !== 0) obj = this.#rotateLevel(obj, rotateNum);
      this.#levelObj = obj;
      if (this.#levelObj.w > app.common.maxW) this.#levelObj.w = app.common.maxW;
      if (this.#levelObj.h > app.common.maxH) this.#levelObj.h = app.common.maxH;
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

    getCurrentLevelObj() {
      const w = this.getW();
      const h = this.getH();
      const s = this.getS();
      const axis = this.getA();
      const levelObj = {
        w,
        h,
        s,
        axis,
      };
      return levelObj;
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
      return this.#getStateStrSub(this.#states, this.#xMin, this.#xMax, this.#yMin, this.#yMax);
    }

    getA() {
      if (!this.hasAxis()) return undefined;

      const { cx, cy } = this.#getNormalizedAxisCenter();
      const lp = axisTypeStr[this.#axis.type];
      const x = cx === axisOffset ? '' : `-x${cx - axisOffset}`;
      const y = cy === axisOffset ? '' : `-y${cy - axisOffset}`;
      const res = `${lp}${x}${y}`;
      return res;
    }

    getR() {
      return this.#levelObj?.r;
    }

    getShapes() {
      return this.#levelObj?.shapes;
    }

    #getCheckModeStr() {
      return Level.getCheckModeStr(this.getCheckMode());
    }

    static getCheckModeStr(checkMode) {
      switch (checkMode) {
        case Level.CHECK_MODE.LINE:
          return 'line';
        case Level.CHECK_MODE.POINT:
          return 'point';
        case Level.CHECK_MODE.SPECIAL:
          return 'special';
      }
    }

    printSolveJsStr() {
      const w = this.getW();
      const h = this.getH();
      const s = this.getS();

      const checkModeStr = this.#getCheckModeStr();
      const axis = this.hasAxis() ? ` --axis ${this.getA()}` : '';
      const solveJsStr = `node src/solve.js --mode ${checkModeStr} -w ${w} -h ${h} -s ${s} --all --console --draw${axis}`;
      console.log(solveJsStr);
    }

    #getUrlQuerySub(levelObj) {
      const checkMode = this.getCheckMode();
      const w = levelObj.w;
      const h = levelObj.h;
      const s = levelObj.s;
      const a = levelObj.axis !== undefined ? `&axis=${levelObj.axis}` : '';
      const checkModeStr = Level.getCheckModeStr(checkMode);
      return `mode=${checkModeStr}&w=${w}&h=${h}&s=${s}${a}`;
    }

    getUrlQuery() {
      const levelObj = this.getLevelObj();
      return this.#getUrlQuerySub(levelObj);
    }

    getCurrentUrlQuery() {
      const levelObj = this.getCurrentLevelObj();
      return this.#getUrlQuerySub(levelObj);
    }

    printDebugInfo() {
      const w = this.getW();
      const h = this.getH();
      const s = this.getS();
      const axis = this.hasAxis() ? `, axis: '${this.getA()}'` : '';

      console.log(`{ w: ${w}, h: ${h}, s: '${s}'${axis} },`); // コピペ用
      this.printSolveJsStr();
    }

    getCenter(isX) {
      if (!this.#exist(isX)) return null;
      return this.#getCenter(isX);
    }

    getSymmetryType(isX) {
      return this.#getSymmetryType(isX);
    }

    getTargetShapeForSavedata() {
      const shapeStr = this.getShapeStr(app.states.isTarget)
        .replace(/\s*$/, '')
        .replace(/ +\n/g, '\n')
        .replaceAll(' ', '0')
        .replaceAll('\n', '-');
      return shapeStr;
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

    getAxisType() {
      return this.#axis?.type;
    }

    hasAxis() {
      return this.#axis.type !== Level.SYMMETRY_TYPE.NONE;
    }

    changeAxis() {
      switch (this.#axis.type) {
        case Level.SYMMETRY_TYPE.NONE: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE1;
          break;
        }
        case Level.SYMMETRY_TYPE.LINE1: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE2;
          break;
        }
        case Level.SYMMETRY_TYPE.LINE2: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE3;
          break;
        }
        case Level.SYMMETRY_TYPE.LINE3: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE4;
          break;
        }
        case Level.SYMMETRY_TYPE.LINE4: {
          this.#axis.type = Level.SYMMETRY_TYPE.POINT1;
          break;
        }
        case Level.SYMMETRY_TYPE.POINT1: {
          this.#axis.type = Level.SYMMETRY_TYPE.POINT2;
          break;
        }
        case Level.SYMMETRY_TYPE.POINT2: {
          this.#axis.type = Level.SYMMETRY_TYPE.NONE;
          break;
        }
      }
    }

    getAxisCenter() {
      return { cx: this.#axis.cx, cy: this.#axis.cy };
    }

    axisCxDecAble() {
      return this.#axis.cx > 2;
    }

    axisCxIncAble() {
      return this.#axis.cx < (this.#width - 1) * 2;
    }

    axisCyDecAble() {
      return this.#axis.cy > 2;
    }

    axisCyIncAble() {
      return this.#axis.cy < (this.#height - 1) * 2;
    }

    // 軸移動
    moveAxis(dx, dy) {
      if (!this.hasAxis()) return;
      this.#axis.cx += dx;
      this.#axis.cy += dy;

      const minX = axisOffset;
      const minY = axisOffset;
      const maxX = this.#width * 2 - axisOffset;
      const maxY = this.#height * 2 - axisOffset;
      if (this.#axis.cx < minX) this.#axis.cx = minX;
      if (this.#axis.cx > maxX) this.#axis.cx = maxX;
      if (this.#axis.cy < minY) this.#axis.cy = minY;
      if (this.#axis.cy > maxY) this.#axis.cy = maxY;
    }

    // 軸の鏡映移動
    #mirrorAxis() {
      if (!this.hasAxis()) return;
      this.#axis.cx = this.#width * 2 - this.#axis.cx;
      switch (this.#axis.type) {
        case Level.SYMMETRY_TYPE.LINE3: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE4;
          break;
        }
        case Level.SYMMETRY_TYPE.LINE4: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE3;
          break;
        }
      }
    }

    // 軸の回転移動
    #rotateAxis(height) {
      if (!this.hasAxis()) return;
      const cx = this.#axis.cx;
      const cy = this.#axis.cy;
      this.#axis.cx = height * 2 - cy;
      this.#axis.cy = cx;
      switch (this.#axis.type) {
        case Level.SYMMETRY_TYPE.LINE1: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE2;
          break;
        }
        case Level.SYMMETRY_TYPE.LINE2: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE1;
          break;
        }
        case Level.SYMMETRY_TYPE.LINE3: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE4;
          break;
        }
        case Level.SYMMETRY_TYPE.LINE4: {
          this.#axis.type = Level.SYMMETRY_TYPE.LINE3;
          break;
        }
      }
    }

    #getNormalizedAxisCenter() {
      switch (this.#axis.type) {
        case Level.SYMMETRY_TYPE.LINE1: {
          return { cx: this.#axis.cx, cy: axisOffset };
        }
        case Level.SYMMETRY_TYPE.LINE2: {
          return { cx: axisOffset, cy: this.#axis.cy };
        }
        case Level.SYMMETRY_TYPE.LINE3: {
          const diff = this.#axis.cx - this.#axis.cy;
          if (diff >= 0) {
            return { cx: axisOffset + diff, cy: axisOffset };
          } else {
            return { cx: axisOffset, cy: axisOffset - diff };
          }
        }
        case Level.SYMMETRY_TYPE.LINE4: {
          const cx = this.#axis.cx + this.#axis.cy - axisOffset;
          const cy = axisOffset;
          if (cx <= this.#width * 2 - axisOffset) {
            return { cx, cy };
          } else {
            const diff = this.#axis.cx + this.#axis.cy - this.#width * 2;
            return { cx: this.#width * 2 - axisOffset, cy: cy + diff };
          }
        }
        default:
          return { cx: this.#axis.cx, cy: this.#axis.cy };
      }
    }

    applyAxis(axisStr) {
      this.#axis = {
        type: Level.SYMMETRY_TYPE.NONE,
        cx: axisOffset,
        cy: axisOffset,
      };
      if (axisStr !== undefined) {
        const res = axisStr.match(/(\w\d)(?:-x(\d+))?(?:-y(\d+))?/);
        const type = (() => {
          switch (res[1]) {
            case 'l1':
              return Level.SYMMETRY_TYPE.LINE1;
            case 'l2':
              return Level.SYMMETRY_TYPE.LINE2;
            case 'l3':
              return Level.SYMMETRY_TYPE.LINE3;
            case 'l4':
              return Level.SYMMETRY_TYPE.LINE4;
            case 'p1':
              return Level.SYMMETRY_TYPE.POINT1;
            case 'p2':
              return Level.SYMMETRY_TYPE.POINT2;
          }
        })();

        this.#axis = {
          type,
          cx: Number(res[2] ?? 0) + axisOffset,
          cy: Number(res[3] ?? 0) + axisOffset,
        };
      }
    }

    applyObj(obj, resizeFlag) {
      if (resizeFlag) {
        this.#levelObj = obj;
        Object.freeze(this.#levelObj);
        this.#initStates();
        this.#removeR();
      }
      this.applyStateStr(obj.s);
      if (isBrowser) this.#eyePrevInfo = [];
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
      this.#resetMoveFlags();
    }

    // 正規化
    normalize() {
      // ブロック番号の正規化
      const map = {};
      let nextTarget = app.states.targetMin;
      let nextOther = app.states.otherMin;
      let nextUser = app.states.userMin;
      for (let y = this.#yMin; y < this.#yMax; ++y) {
        for (let x = this.#xMin; x < this.#xMax; ++x) {
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

      // 対称軸座標の正規化
      if (this.hasAxis()) {
        switch (this.#axis.type) {
          case Level.SYMMETRY_TYPE.LINE1: {
            // 軸座標を上の壁沿いに移動。
            this.#axis.cy = this.#yMin * 2;
            break;
          }
          case Level.SYMMETRY_TYPE.LINE2: {
            // 軸座標を左の壁沿いに移動。
            this.#axis.cx = this.#xMin * 2;
            break;
          }
          case Level.SYMMETRY_TYPE.LINE3: {
            while (this.#axis.cy > this.#yMin * 2 && this.#axis.cx > this.#xMin * 2) {
              // 軸座標が上あるいは左の壁沿いに来るまで左上に移動。
              this.#axis.cx--;
              this.#axis.cy--;
            }
            break;
          }
          case Level.SYMMETRY_TYPE.LINE4: {
            while (true) {
              if (this.#xMin * 2 <= this.#axis.cx && this.#axis.cx <= this.#xMax * 2 && this.#axis.cy === this.#yMin * 2) {
                // 軸座標が上の壁沿いにある。
                break;
              } else if (this.#axis.cx === this.#xMax * 2 && this.#yMin * 2 <= this.#axis.cy && this.#axis.cy <= this.#yMax * 2) {
                // 軸座標が右の壁沿いにある。
                break;
              } else if (this.#axis.cx < this.#xMin * 2 || this.#axis.cy < this.#yMin * 2) {
                // 軸座標が異常な位置にあります。
                break;
              } else {
                this.#axis.cx++;
                this.#axis.cy--;
                // 軸座標を左上に移動。
              }
            }
            break;
          }
        }
      }
    }

    // 盤面サイズ変更
    resize(dx, dy, flag) {
      const w = this.getW() + dx;
      const h = this.getH() + dy;
      if (w < 1) return;
      if (h < 1) return;
      if (w > app.common.maxW) return;
      if (h > app.common.maxH) return;

      const acx = this.#axis.cx;
      const acy = this.#axis.cy;
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
        this.#axis.cx = Math.max(axisOffset, acx + 2 * dx);
        this.#axis.cy = Math.max(axisOffset, acy + 2 * dy);
      }
    }

    // 鏡映 (左右反転)
    mirror() {
      const obj = {
        w: this.getW(),
        h: this.getH(),
        s: this.getS(),
      };
      const newObj = this.#mirrorLevel(obj);
      this.applyObj(newObj);
      this.#mirrorAxis();
    }

    // 回転 (90° × rotateNum 回転)
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

    // 正規化チェック
    isNormalized() {
      // ブロック番号の正規化チェック
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

      // 対称軸座標の正規化チェック
      if (this.hasAxis()) {
        switch (this.#axis.type) {
          case Level.SYMMETRY_TYPE.LINE1: {
            if (this.#axis.cy === this.#yMin * 2) {
              // 軸座標が上の壁沿いにある。
            } else {
              return false;
            }
            break;
          }
          case Level.SYMMETRY_TYPE.LINE2: {
            if (this.#axis.cx === this.#xMin * 2) {
              // 軸座標が左の壁沿いにある。
            } else {
              return false;
            }
            break;
          }
          case Level.SYMMETRY_TYPE.LINE3: {
            if (this.#axis.cy === this.#yMin * 2) {
              // 軸座標が上の壁沿いにある。
            } else if (this.#axis.cx === this.#xMin * 2) {
              // 軸座標が左の壁沿いにある。
            } else {
              return false;
            }
            break;
          }
          case Level.SYMMETRY_TYPE.LINE4: {
            if (this.#xMin * 2 <= this.#axis.cx && this.#axis.cx <= this.#xMax * 2 && this.#axis.cy === this.#yMin * 2) {
              // 軸座標が上の壁沿いにある。
            } else if (this.#axis.cx === this.#xMax * 2 && this.#yMin * 2 <= this.#axis.cy && this.#axis.cy <= this.#yMax * 2) {
              // 軸座標が右の壁沿いにある。
            } else {
              return false;
            }
            break;
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

    #resetMoveFlags() {
      for (let y = 0; y < this.#height; ++y) {
        this.#moveFlags[y] = [];
        for (let x = 0; x < this.#width; ++x) {
          this.#moveFlags[y][x] = false;
        }
      }
    }

    #updateMoveFlags(dx, dy, userMax = app.states.userMax) {
      if (!this.hasAxis() && dx + dy === 0) {
        return false;
      }

      let moveFlag = false;
      this.#resetMoveFlags();

      if (this.hasAxis() && dx + dy === 0) {
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
                const { dstX, dstY } = this.#getDst(x, y);
                if (dstX < this.#xMin || this.#xMax <= dstX) continue loop;
                if (dstY < this.#yMin || this.#yMax <= dstY) continue loop;
                const dstState = this.#states[dstY][dstX];
                if (dstState === app.states.none) continue;

                if (dstState < app.states.userMin || userMax < dstState) {
                  continue loop;
                } else if (!moveState[dstState]) {
                  moveState[dstState] = true;
                  st.push(dstState);
                }
              }
            }
          }

          // 各座標に移動フラグを設定
          for (let y = this.#yMin; y < this.#yMax; ++y) {
            for (let x = this.#xMin; x < this.#xMax; ++x) {
              if (moveState[this.#states[y][x]]) {
                this.#moveFlags[y][x] = true;
              }
            }
          }
          moveFlag = true;
        }
      } else {
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
                const dstState = this.#states[y + dy][x + dx];
                if (dstState === app.states.none) continue;

                if (dstState === app.states.wall) {
                  continue loop;
                } else if (!moveState[dstState]) {
                  moveState[dstState] = true;
                  st.push(dstState);
                }
              }
            }
          }

          // 各座標に移動フラグを設定
          for (let y = this.#yMin; y < this.#yMax; ++y) {
            for (let x = this.#xMin; x < this.#xMax; ++x) {
              if (moveState[this.#states[y][x]]) {
                this.#moveFlags[y][x] = true;
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

    #execMoveFlags() {
      const dx = this.#moveDx;
      const dy = this.#moveDy;

      if (this.#axis && dx + dy === 0) {
        const statesTemp = [];
        for (let y = this.#yMin; y < this.#yMax; ++y) {
          statesTemp[y] = [];
          for (let x = this.#xMin; x < this.#xMax; ++x) {
            statesTemp[y][x] = this.#states[y][x];
            this.#states[y][x] = app.states.none;
          }
        }
        for (let y = this.#yMin; y < this.#yMax; ++y) {
          for (let x = this.#xMin; x < this.#xMax; ++x) {
            if (statesTemp[y][x] === app.states.none) continue;
            if (this.#moveFlags[y][x]) {
              const { dstX, dstY } = this.#getDst(x, y);
              this.#states[dstY][dstX] = statesTemp[y][x];
            } else {
              this.#states[y][x] = statesTemp[y][x];
            }
          }
        }
      } else {
        if (dx === -1 || dy === -1) {
          for (let y = this.#yMin; y < this.#yMax; ++y) {
            for (let x = this.#xMin; x < this.#xMax; ++x) {
              if (this.#moveFlags[y][x]) {
                this.#states[y + dy][x + dx] = this.#states[y][x];
                this.#states[y][x] = app.states.none;
              }
            }
          }
        } else {
          for (let y = this.#yMax - 1; y >= this.#yMin; --y) {
            for (let x = this.#xMax - 1; x >= this.#xMin; --x) {
              if (this.#moveFlags[y][x]) {
                this.#states[y + dy][x + dx] = this.#states[y][x];
                this.#states[y][x] = app.states.none;
              }
            }
          }
        }
      }
    }

    #getSrc(x, y, dx = 0, dy = 0) {
      if (dx + dy !== 0) {
        const srcX = x - dx;
        const srcY = y - dy;
        return { srcX, srcY };
      }
      if (dx === null || !this.hasAxis()) {
        return { srcX: x, srcY: y };
      }
      switch (this.#axis.type) {
        case Level.SYMMETRY_TYPE.POINT2: {
          if (!this.#mirrorFlag) {
            if ((this.#axis.cx + this.#axis.cy) % 2 !== 0) {
              return { srcX: 0, srcY: 0 };
            }
            const srcX = (this.#axis.cx - this.#axis.cy) / 2 + y;
            const srcY = (this.#axis.cx + this.#axis.cy) / 2 - x - 1;
            return { srcX, srcY };
          } else {
            if ((this.#axis.cx + this.#axis.cy) % 2 !== 0) {
              return { srcX: 0, srcY: 0 };
            }
            const srcX = (this.#axis.cy + this.#axis.cx) / 2 - y - 1;
            const srcY = (this.#axis.cy - this.#axis.cx) / 2 + x;
            return { srcX, srcY };
          }
        }
        default: {
          const { dstX: srcX, dstY: srcY } = this.#getDst(x, y, dx, dy);
          return { srcX, srcY };
        }
      }
    }

    #getDst(x, y, dx = 0, dy = 0) {
      if (dx + dy !== 0) {
        const dstX = x + dx;
        const dstY = y + dy;
        return { dstX, dstY };
      }
      switch (this.#axis.type) {
        case Level.SYMMETRY_TYPE.LINE1: {
          const dstX = this.#axis.cx - x - 1;
          const dstY = y;
          return { dstX, dstY };
        }
        case Level.SYMMETRY_TYPE.LINE2: {
          const dstX = x;
          const dstY = this.#axis.cy - y - 1;
          return { dstX, dstY };
        }
        case Level.SYMMETRY_TYPE.LINE3: {
          if ((this.#axis.cx + this.#axis.cy) % 2 !== 0) {
            return { dstX: 0, dstY: 0 };
          }
          const diff = x - y - (this.#axis.cx - this.#axis.cy) / 2;
          const dstX = x - diff;
          const dstY = y + diff;
          return { dstX, dstY };
        }
        case Level.SYMMETRY_TYPE.LINE4: {
          if ((this.#axis.cx + this.#axis.cy) % 2 !== 0) {
            return { dstX: 0, dstY: 0 };
          }
          const diff = x + y + 1 - (this.#axis.cx + this.#axis.cy) / 2;
          const dstX = x - diff;
          const dstY = y - diff;
          return { dstX, dstY };
        }
        case Level.SYMMETRY_TYPE.POINT1: {
          const dstX = this.#axis.cx - x - 1;
          const dstY = this.#axis.cy - y - 1;
          return { dstX, dstY };
        }
        case Level.SYMMETRY_TYPE.POINT2: {
          if (!this.#mirrorFlag) {
            if ((this.#axis.cx + this.#axis.cy) % 2 !== 0) {
              return { dstX: 0, dstY: 0 };
            }
            const dstX = (this.#axis.cy + this.#axis.cx) / 2 - y - 1;
            const dstY = (this.#axis.cy - this.#axis.cx) / 2 + x;
            return { dstX, dstY };
          } else {
            // 逆回転の場合
            const dstX = (this.#axis.cx - this.#axis.cy) / 2 + y;
            const dstY = (this.#axis.cx + this.#axis.cy) / 2 - x - 1;
            return { dstX, dstY };
          }
        }
      }
    }

    move(dx, dy) {
      const moveFlag = this.#updateMoveFlags(dx, dy);
      if (moveFlag) {
        this.#execMoveFlags();
      }
      return moveFlag;
    }

    #createEdge(blockSize, edgeColor) {
      const g = app.svg.createG();

      const eps = 1; // 隙間を埋めます。
      const fill = edgeColor;

      const radiuses = {
        [Level.CHECK_MODE.LINE]: {
          ul: 0.5,
          ur: 0.5,
          dr: 1.0,
          dl: 1.0,
        },
        [Level.CHECK_MODE.POINT]: {
          ul: 0.5,
          ur: 1.0,
          dr: 0.5,
          dl: 1.0,
        },
        [Level.CHECK_MODE.SPECIAL]: {
          ul: 0.75,
          ur: 0.75,
          dr: 0.75,
          dl: 0.75,
        },
      };
      const radius = radiuses[app.common.checkMode];

      // 左上
      {
        const sx = -eps;
        const sy = -eps;
        const r = blockSize * radius.ul;
        const vdy = r + eps;
        const dx = r;
        const dy = -r;
        const d = `M ${sx},${sy} v ${vdy} h ${eps} a ${r},${r} 0 0 1 ${dx},${dy} v ${-eps} z`;
        const path = app.svg.createPath({ d, fill });
        g.appendChild(path);
      }

      // 右上
      {
        const sx = this.getWidth() * blockSize + eps;
        const sy = -eps;
        const r = blockSize * radius.ur;
        const hdx = -r - eps;
        const dx = r;
        const dy = r;
        const d = `M ${sx},${sy} h ${hdx} v ${eps} a ${r},${r} 0 0 1 ${dx},${dy} h ${eps} z`;
        const path = app.svg.createPath({ d, fill });
        g.appendChild(path);
      }

      // 右下
      {
        const sx = this.getWidth() * blockSize + eps;
        const sy = this.getHeight() * blockSize + eps;
        const r = blockSize * radius.dr;
        const vdy = -r - eps;
        const dx = -r;
        const dy = r;
        const d = `M ${sx},${sy} v ${vdy} h ${-eps} a ${r},${r} 0 0 1 ${dx},${dy} v ${eps} z`;
        const path = app.svg.createPath({ d, fill });
        g.appendChild(path);
      }

      // 左下
      {
        const sx = -eps;
        const sy = this.getHeight() * blockSize + eps;
        const r = blockSize * radius.dl;
        const hdx = r + eps;
        const dx = -r;
        const dy = -r;
        const d = `M ${sx},${sy} h ${hdx} v ${-eps} a ${r},${r} 0 0 1 ${dx},${dy} h ${-eps} z`;
        const path = app.svg.createPath({ d, fill });
        g.appendChild(path);
      }

      return g;
    }

    createSvgG({
      blockSize,
      symmetryAnimationFlag = false,
      showCharsFlag = false,
      smallJumpFlag = false,
      drawBackground = true,
      x0 = 0,
      y0 = 0,
      width = this.#width,
      height = this.#height,
      edgeColor = null,
    }) {
      const g = app.svg.createG();
      g.style.setProperty('--animation-jump-small', `translate(0, ${-0.25 * blockSize}px)`);
      g.style.setProperty('--animation-jump', `translate(0, ${-0.5 * blockSize}px)`);

      const symmetryType = symmetryAnimationFlag ? this.getSymmetryType(app.states.isTarget) : null;

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

      const gShadows = app.svg.createG('group-shadow');
      const gElemsOther = app.svg.createG('group-elems-other');
      const gElemsAnimation1 = app.svg.createG('group-elems-animation1');
      const gElemsAnimation2 = app.svg.createG('group-elems-animation2');
      g.appendChild(gShadows);
      g.appendChild(gElemsOther);
      g.appendChild(gElemsAnimation1); // 最後に追加。アニメーション中の図形が静止中の図形に隠されないようにするためです。
      g.appendChild(gElemsAnimation2); // 最後に追加。アニメーション中の図形が静止中の図形に隠されないようにするためです。

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
          const isSoloUser = (() => {
            if (!app.states.isUser(state)) return false;
            if (!eyeFlag) return false;
            if (app.states.isUser(this.getState(x + 1, y))) return false;
            if (app.states.isUser(this.getState(x, y + 1))) return false;
            return true;
          })();
          this.#addOneBlock(
            x - x0,
            y - y0,
            x,
            y,
            blockSize,
            symmetryType,
            showCharsFlag,
            smallJumpFlag,
            eyeFlag,
            isSoloUser,
            gShadows,
            gElemsOther,
            gElemsAnimation1,
            gElemsAnimation2
          );
        }
      }

      if (this.hasAxis()) {
        const center = {
          x: this.#axis.cx / 2,
          y: this.#axis.cy / 2,
        };
        const gg = app.svg.createG();
        g.appendChild(gg);

        const fill = app.colors.levelSymmetryAxis;
        const stroke = app.colors.levelSymmetryAxis;
        switch (this.#axis.type) {
          case Level.SYMMETRY_TYPE.LINE1: {
            // m (｜)
            const line = createAxisLine1({ center, height, stroke });
            gg.appendChild(line);
            break;
          }
          case Level.SYMMETRY_TYPE.LINE2: {
            // m (―)
            const line = createAxisLine2({ center, width, stroke });
            gg.appendChild(line);
            break;
          }
          case Level.SYMMETRY_TYPE.LINE3: {
            // m (＼)
            const line = createAxisLine3({ center, height, stroke });
            gg.appendChild(line);
            break;
          }
          case Level.SYMMETRY_TYPE.LINE4: {
            // m (／)
            const line = createAxisLine4({ center, height, stroke });
            gg.appendChild(line);
            break;
          }

          case Level.SYMMETRY_TYPE.POINT1: {
            // 2
            const point = createAxisPoint2({ center, fill });
            gg.appendChild(point);
            break;
          }
          case Level.SYMMETRY_TYPE.POINT2: {
            // 4
            const point = createAxisPoint4({ center, fill });
            gg.appendChild(point);
            break;
          }
        }

        if (showCharsFlag) {
          const circle = app.svg.createCircle(blockSize, {
            cx: center.x,
            cy: center.y,
            r: 0.1,
            fill: app.colors.levelSymmetryAxisCenter,
          });
          gg.appendChild(circle);
        }
      }

      if (symmetryType !== null) {
        const center = this.getCenter(app.states.isTarget);
        const gg = app.svg.createG('group-symmetry-axis');
        g.appendChild(gg);
        g.style.setProperty('--animation-jump-count', jumpCounts[symmetryType]);
        switch (symmetryType) {
          case Level.SYMMETRY_TYPE.LINE1: {
            // m (｜)
            const line = createAxisLine1({ center, height });
            line.classList.add('animation-symmetry-axis');
            gg.appendChild(line);
            break;
          }
          case Level.SYMMETRY_TYPE.LINE2: {
            // m (―)
            const line = createAxisLine2({ center, width });
            line.classList.add('animation-symmetry-axis');
            gg.appendChild(line);
            break;
          }
          case Level.SYMMETRY_TYPE.LINE3: {
            // m (＼)
            const line = createAxisLine3({ center, height });
            line.classList.add('animation-symmetry-axis');
            gg.appendChild(line);
            break;
          }
          case Level.SYMMETRY_TYPE.LINE4: {
            // m (／)
            const line = createAxisLine4({ center, height });
            line.classList.add('animation-symmetry-axis');
            gg.appendChild(line);
            break;
          }
          case Level.SYMMETRY_TYPE.PLUS1: {
            // 2mm (｜―)
            const line1 = createAxisLine1({ center, height });
            const line2 = createAxisLine2({ center, width });
            line1.classList.add('animation-symmetry-axis', 'axis-2-1');
            line2.classList.add('animation-symmetry-axis', 'axis-2-2');
            gg.appendChild(line1);
            gg.appendChild(line2);
            break;
          }
          case Level.SYMMETRY_TYPE.PLUS2: {
            // 2mm (＼／)
            const line3 = createAxisLine3({ center, height });
            const line4 = createAxisLine4({ center, height });
            line3.classList.add('animation-symmetry-axis', 'axis-2-1');
            line4.classList.add('animation-symmetry-axis', 'axis-2-2');
            gg.appendChild(line3);
            gg.appendChild(line4);
            break;
          }
          case Level.SYMMETRY_TYPE.PLUS3: {
            // 4mm (｜―＼／)
            const line1 = createAxisLine1({ center, height });
            const line2 = createAxisLine2({ center, width });
            const line3 = createAxisLine3({ center, height });
            const line4 = createAxisLine4({ center, height });
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

          case Level.SYMMETRY_TYPE.POINT1: {
            // 2
            const point = createAxisPoint2({ center });
            point.classList.add('animation-symmetry-axis-point2');
            gg.appendChild(point);
            break;
          }
          case Level.SYMMETRY_TYPE.POINT2: {
            // 4
            const point = createAxisPoint4({ center });
            point.classList.add('animation-symmetry-axis-point4');
            gg.appendChild(point);
            break;
          }

          case Level.SYMMETRY_TYPE.SPECIAL1: {
            // 2mm (｜―)
            const point = createAxisPoint2({ center });
            const line1 = createAxisLine1({ center, height });
            const line2 = createAxisLine2({ center, width });
            point.classList.add('animation-symmetry-axis-sp1');
            line1.classList.add('animation-symmetry-axis', 'axis-3-2');
            line2.classList.add('animation-symmetry-axis', 'axis-3-3');
            gg.appendChild(point);
            gg.appendChild(line1);
            gg.appendChild(line2);
            break;
          }
          case Level.SYMMETRY_TYPE.SPECIAL2: {
            // 2mm (＼／)
            const point = createAxisPoint2({ center });
            const line3 = createAxisLine3({ center, height });
            const line4 = createAxisLine4({ center, height });
            point.classList.add('animation-symmetry-axis-sp2');
            line3.classList.add('animation-symmetry-axis', 'axis-3-2');
            line4.classList.add('animation-symmetry-axis', 'axis-3-3');
            gg.appendChild(point);
            gg.appendChild(line3);
            gg.appendChild(line4);
            break;
          }
          case Level.SYMMETRY_TYPE.SPECIAL3: {
            console.log(1);
            // 4mm (｜―＼／)
            const point = createAxisPoint4({ center });
            const line1 = createAxisLine1({ center, height });
            const line2 = createAxisLine2({ center, width });
            const line3 = createAxisLine3({ center, height });
            const line4 = createAxisLine4({ center, height });
            point.classList.add('animation-symmetry-axis-sp3');
            line1.classList.add('animation-symmetry-axis', 'axis-8-5');
            line2.classList.add('animation-symmetry-axis', 'axis-8-6');
            line3.classList.add('animation-symmetry-axis', 'axis-8-7');
            line4.classList.add('animation-symmetry-axis', 'axis-8-8');
            gg.appendChild(point);
            gg.appendChild(line1);
            gg.appendChild(line2);
            gg.appendChild(line3);
            gg.appendChild(line4);
            break;
          }
        }
      }

      if (edgeColor !== null) {
        const gEdge = this.#createEdge(blockSize, edgeColor);
        g.appendChild(gEdge);
      }

      this.#resetMoveFlags();
      return g;

      // 対称軸
      function createAxisLine1({ center, height, stroke = app.colors.symmetryAxis }) {
        const g = app.svg.createG();
        {
          const line = app.svg.createLine(blockSize, {
            x1: center.x,
            y1: 0,
            x2: center.x,
            y2: height,
            stroke,
            strokeWidth: 0.125,
          });
          g.appendChild(line);
        }
        {
          const line = app.svg.createLine(blockSize, {
            x1: center.x - 0.05,
            y1: 0,
            x2: center.x - 0.05,
            y2: height,
            stroke: 'white',
            strokeWidth: 0.025,
            strokeOpacity: 0.5,
          });
          g.appendChild(line);
        }
        {
          const line = app.svg.createLine(blockSize, {
            x1: center.x + 0.05,
            y1: 0,
            x2: center.x + 0.05,
            y2: height,
            stroke: 'white',
            strokeWidth: 0.025,
            strokeOpacity: 0.5,
          });
          g.appendChild(line);
        }
        g.classList.add('symmetry-axis');
        return g;
      }

      function createAxisLine2({ center, width, stroke = app.colors.symmetryAxis }) {
        const g = app.svg.createG();
        {
          const line = app.svg.createLine(blockSize, {
            x1: 0,
            y1: center.y,
            x2: width,
            y2: center.y,
            stroke,
            strokeWidth: 0.125,
          });
          g.appendChild(line);
        }
        {
          const line = app.svg.createLine(blockSize, {
            x1: 0,
            y1: center.y - 0.05,
            x2: width,
            y2: center.y - 0.05,
            stroke: 'white',
            strokeWidth: 0.025,
            strokeOpacity: 0.5,
          });
          g.appendChild(line);
        }
        {
          const line = app.svg.createLine(blockSize, {
            x1: 0,
            y1: center.y + 0.05,
            x2: width,
            y2: center.y + 0.05,
            stroke: 'white',
            strokeWidth: 0.025,
            strokeOpacity: 0.5,
          });
          g.appendChild(line);
        }
        g.classList.add('symmetry-axis');
        return g;
      }

      function createAxisLine3({ center, height, stroke = app.colors.symmetryAxis }) {
        const dd = 0.05;

        const x1a = center.x - center.y;
        const x1 = x1a < 0 ? 0 : x1a;
        const y1 = x1a < 0 ? -x1a : 0;

        const x2a = center.x + height - center.y;
        const x2 = x2a > width ? width : x2a;
        const y2 = x2a > width ? width + height - x2a : height;

        const stroke2 = (center.x + center.y) % 1 === 0 ? stroke : app.colors.symmetryAxisInvalid;

        const g = app.svg.createG();
        {
          const line = app.svg.createLine(blockSize, {
            x1: x1 - dd,
            y1: y1 - dd,
            x2: x2 + dd,
            y2: y2 + dd,
            stroke: stroke2,
            strokeWidth: 0.125,
          });
          g.appendChild(line);
        }
        {
          const line = app.svg.createLine(blockSize, {
            x1: x1 - dd - 0.07,
            y1: y1 - dd,
            x2: x2 + dd,
            y2: y2 + dd + 0.07,
            stroke: 'white',
            strokeWidth: 0.025,
            strokeOpacity: 0.5,
          });
          g.appendChild(line);
        }
        {
          const line = app.svg.createLine(blockSize, {
            x1: x1 - dd,
            y1: y1 - dd - 0.07,
            x2: x2 + dd + 0.07,
            y2: y2 + dd,
            stroke: 'white',
            strokeWidth: 0.025,
            strokeOpacity: 0.5,
          });
          g.appendChild(line);
        }
        g.classList.add('symmetry-axis');
        return g;
      }

      function createAxisLine4({ center, height, stroke = app.colors.symmetryAxis }) {
        const dd = 0.05;

        const x1a = center.x + center.y;
        const x1 = x1a > width ? width : x1a;
        const y1 = x1a > width ? x1a - width : 0;

        const x2a = center.x - height + center.y;
        const x2 = x2a < 0 ? 0 : x2a;
        const y2 = x2a < 0 ? height + x2a : height;

        const stroke2 = (center.x + center.y) % 1 === 0 ? stroke : app.colors.symmetryAxisInvalid;

        const g = app.svg.createG();
        {
          const line = app.svg.createLine(blockSize, {
            x1: x1 + dd,
            y1: y1 - dd,
            x2: x2 - dd,
            y2: y2 + dd,
            stroke: stroke2,
            strokeWidth: 0.125,
          });
          g.appendChild(line);
        }
        {
          const line = app.svg.createLine(blockSize, {
            x1: x1 + dd,
            y1: y1 - dd - 0.07,
            x2: x2 - dd - 0.07,
            y2: y2 + dd,
            stroke: 'white',
            strokeWidth: 0.025,
            strokeOpacity: 0.5,
          });
          g.appendChild(line);
        }
        {
          const line = app.svg.createLine(blockSize, {
            x1: x1 + dd + 0.07,
            y1: y1 - dd,
            x2: x2 - dd,
            y2: y2 + dd + 0.07,
            stroke: 'white',
            strokeWidth: 0.025,
            strokeOpacity: 0.5,
          });
          g.appendChild(line);
        }
        g.classList.add('symmetry-axis');
        return g;
      }

      function createAxisPoint2({ center, fill = app.colors.symmetryAxis }) {
        const ellipse = app.svg.createEllipse(blockSize, {
          cx: center.x,
          cy: center.y,
          rx: 1 / 8,
          ry: 3 / 8,
          fill,
          stroke: 'white',
          strokeWidth: 0.025,
          strokeOpacity: 0.75,
        });
        ellipse.classList.add('symmetry-axis');
        return ellipse;
      }

      function createAxisPoint4({ center, fill = app.colors.symmetryAxis }) {
        const x = center.x;
        const y = center.y;
        const size = 3 / 8;
        const polygon = app.svg.createPolygon(blockSize, {
          points: [
            [x, y - size],
            [x + size, y],
            [x, y + size],
            [x - size, y],
          ],
          fill: (x + y) % 1 === 0 ? fill : app.colors.symmetryAxisInvalid,
          stroke: 'white',
          strokeWidth: 0.025,
          strokeOpacity: 0.75,
        });
        polygon.classList.add('symmetry-axis');
        return polygon;
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
          const dirIndex = Number(c);
          if (dirIndex === 4) {
            newR += '4';
          } else {
            newR += (4 - dirIndex) % 4;
          }
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
        this.#rotateAxis(newLevelObj.h + 2);
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
            const dirIndex = Number(c);
            if (dirIndex === 4) {
              newR += '4';
            } else {
              newR += (dirIndex + 1) % 4;
            }
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
      if (isPoint2) {
        if (isLine1) {
          return Level.SYMMETRY_TYPE.SPECIAL3;
        }
      } else {
        if (isLine1) {
          return Level.SYMMETRY_TYPE.SPECIAL1;
        }
        const isLine3 = this.#isLine3(isX, minX, maxX, minY, maxY);
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

    setCheckMode(mode) {
      this.#setCheckMode(mode);
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

    #createOneBlock(x, y, sX, sY, blockSize, showCharsFlag, eyeFlag) {
      const state = this.getState(sX, sY);
      const color = app.colors[state];

      const gElem = app.svg.createG('group-elem');

      {
        const flags = [];
        for (let dir = 0; dir < 8; ++dir) {
          const dx = dxs[dir];
          const dy = dys[dir];
          if (this.#isInArea(sX + dx, sY + dy)) {
            flags[dir] = this.getState(sX + dx, sY + dy) === state;
          } else {
            flags[dir] = true;
          }
        }

        const eps = 0.01; // 隙間を埋めます。
        const eps2 = eps * 2;
        const epsB = eps * blockSize;

        // 操作キャラ
        if (app.states.isUser(state)) {
          const radiuses = {
            [Level.CHECK_MODE.LINE]: {
              ul: 0.2,
              ur: 0.2,
              dr: 0.4,
              dl: 0.4,
            },
            [Level.CHECK_MODE.POINT]: {
              ul: 0.2,
              ur: 0.4,
              dr: 0.2,
              dl: 0.4,
            },
            [Level.CHECK_MODE.SPECIAL]: {
              ul: 0.3,
              ur: 0.3,
              dr: 0.3,
              dl: 0.3,
            },
          };
          const radius = radiuses[this.getCheckMode()];
          const blockBorderWidth = 0.1;

          // 左上
          if (!flags[dirs.u] && !flags[dirs.l]) {
            const createD = (r1, r0 = r1) => {
              const r = r1 * blockSize;
              const sx = x * blockSize + r + epsB;
              const sy = y * blockSize + r + epsB;
              const ar = r0 * blockSize;
              const hdx = -(ar + epsB);
              const dx = ar;
              const dy = -ar;
              const d = `M ${sx},${sy} h ${hdx} v ${-epsB} a ${ar},${ar} 0 0 1 ${dx},${dy} h ${epsB} z`;
              return d;
            };
            const pathStroke = app.svg.createPath({
              d: createD(radius.ul),
              fill: color.stroke,
            });
            gElem.appendChild(pathStroke);
            const pathFill = app.svg.createPath({
              d: createD(radius.ul, radius.ul - blockBorderWidth),
              fill: color.fill,
            });
            gElem.appendChild(pathFill);
          } else {
            {
              const rect = app.svg.createRect(blockSize, {
                x,
                y,
                width: radius.ul + eps,
                height: radius.ul + eps,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (!flags[dirs.u]) {
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y,
                width: radius.ul + eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.l]) {
              const rect = app.svg.createRect(blockSize, {
                x,
                y: y - eps,
                width: blockBorderWidth,
                height: radius.ul + eps2,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.ul]) {
              const rect1 = app.svg.createRect(blockSize, {
                x: x - eps,
                y,
                width: blockBorderWidth + eps,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              const rect2 = app.svg.createRect(blockSize, {
                x,
                y: y - eps,
                width: blockBorderWidth,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect1);
              gElem.appendChild(rect2);
            }
          }

          // 右上
          if (!flags[dirs.u] && !flags[dirs.r]) {
            const createD = (r1, r0 = r1) => {
              const r = r1 * blockSize;
              const sx = (x + 1) * blockSize - r - epsB;
              const sy = y * blockSize + r + epsB;
              const ar = r0 * blockSize;
              const vdy = -(ar + epsB);
              const dx = ar;
              const dy = ar;
              const d = `M ${sx},${sy} v ${vdy} h ${epsB} a ${ar},${ar} 0 0 1 ${dx},${dy} v ${epsB} z`;
              return d;
            };
            const pathStroke = app.svg.createPath({
              d: createD(radius.ur),
              fill: color.stroke,
            });
            gElem.appendChild(pathStroke);
            const pathFill = app.svg.createPath({
              d: createD(radius.ur, radius.ur - blockBorderWidth),
              fill: color.fill,
            });
            gElem.appendChild(pathFill);
          } else {
            {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - radius.ur - eps,
                y,
                width: radius.ur + eps,
                height: radius.ur + eps,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (!flags[dirs.u]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - radius.ur - eps,
                y,
                width: radius.ur + eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.r]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y - eps,
                width: blockBorderWidth,
                height: radius.ur + eps2,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.ur]) {
              const rect1 = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y,
                width: blockBorderWidth + eps,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              const rect2 = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y - eps,
                width: blockBorderWidth,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect1);
              gElem.appendChild(rect2);
            }
          }

          // 右下
          if (!flags[dirs.d] && !flags[dirs.r]) {
            const createD = (r1, r0 = r1) => {
              const r = r1 * blockSize;
              const sx = (x + 1) * blockSize - r - epsB;
              const sy = (y + 1) * blockSize - r - epsB;
              const ar = r0 * blockSize;
              const hdx = ar + epsB;
              const dx = -ar;
              const dy = ar;
              const d = `M ${sx},${sy} h ${hdx} v ${epsB} a ${ar},${ar} 0 0 1 ${dx},${dy} h ${-epsB} z`;
              return d;
            };
            const pathStroke = app.svg.createPath({
              d: createD(radius.dr),
              fill: color.stroke,
            });
            gElem.appendChild(pathStroke);
            const pathFill = app.svg.createPath({
              d: createD(radius.dr, radius.dr - blockBorderWidth),
              fill: color.fill,
            });
            gElem.appendChild(pathFill);
          } else {
            {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - radius.dr - eps,
                y: y + 1 - radius.dr - eps,
                width: radius.dr + eps,
                height: radius.dr + eps,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (!flags[dirs.d]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - radius.dr - eps,
                y: y + 1 - blockBorderWidth,
                width: radius.dr + eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.r]) {
              const rect = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y + 1 - radius.dr - eps,
                width: blockBorderWidth,
                height: radius.dr + eps2,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.dr]) {
              const rect1 = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth + eps,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              const rect2 = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect1);
              gElem.appendChild(rect2);
            }
          }

          // 左下
          if (!flags[dirs.d] && !flags[dirs.l]) {
            const createD = (r1, r0 = r1) => {
              const r = r1 * blockSize;
              const sx = x * blockSize + r + epsB;
              const sy = (y + 1) * blockSize - r - epsB;
              const ar = r0 * blockSize;
              const vdy = ar + epsB;
              const dx = -ar;
              const dy = -ar;
              const d = `M ${sx},${sy} v ${vdy} h ${-epsB} a ${ar},${ar} 0 0 1 ${dx},${dy} v ${-epsB} z`;
              return d;
            };
            const pathStroke = app.svg.createPath({
              d: createD(radius.dl),
              fill: color.stroke,
            });
            gElem.appendChild(pathStroke);
            const pathFill = app.svg.createPath({
              d: createD(radius.dl, radius.dl - blockBorderWidth),
              fill: color.fill,
            });
            gElem.appendChild(pathFill);
          } else {
            {
              const rect = app.svg.createRect(blockSize, {
                x,
                y: y + 1 - radius.dl - eps,
                width: radius.dl + eps,
                height: radius.dl + eps,
                fill: color.fill,
              });
              gElem.appendChild(rect);
            }

            if (!flags[dirs.d]) {
              const rect = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + 1 - blockBorderWidth,
                width: radius.dl + eps2,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.l]) {
              const rect = app.svg.createRect(blockSize, {
                x,
                y: y + 1 - radius.dl - eps,
                width: blockBorderWidth,
                height: radius.dl + eps2,
                fill: color.stroke,
              });
              gElem.appendChild(rect);
            } else if (!flags[dirs.dl]) {
              const rect1 = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth + eps,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              const rect2 = app.svg.createRect(blockSize, {
                x,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect1);
              gElem.appendChild(rect2);
            }
          }

          // 上側
          {
            const rect = app.svg.createRect(blockSize, {
              x: x + radius.ul,
              y,
              width: 1 - radius.ul - radius.ur,
              height: 0.5 + eps,
              fill: color.fill,
            });
            gElem.appendChild(rect);
          }
          if (!flags[dirs.u]) {
            const line = app.svg.createRect(blockSize, {
              x: x + radius.ul - eps,
              y,
              width: 1 - radius.ul - radius.ur + eps2,
              height: blockBorderWidth,
              fill: color.stroke,
            });
            gElem.appendChild(line);
          }

          // 右側
          {
            const rect = app.svg.createRect(blockSize, {
              x: x + 0.5 - eps,
              y: y + radius.ur,
              width: 0.5 + eps,
              height: 1 - radius.ur - radius.dr,
              fill: color.fill,
            });
            gElem.appendChild(rect);
          }
          if (!flags[dirs.r]) {
            const line = app.svg.createRect(blockSize, {
              x: x + 1 - blockBorderWidth,
              y: y + radius.ur - eps,
              width: blockBorderWidth,
              height: 1 - radius.ur - radius.dr + eps2,
              fill: color.stroke,
            });
            gElem.appendChild(line);
          }

          // 下側
          {
            const rect = app.svg.createRect(blockSize, {
              x: x + radius.dl,
              y: y + 0.5 - eps,
              width: 1 - radius.dl - radius.dr,
              height: 0.5 + eps,
              fill: color.fill,
            });
            gElem.appendChild(rect);
          }
          if (!flags[dirs.d]) {
            const line = app.svg.createRect(blockSize, {
              x: x + radius.dl - eps,
              y: y + 1 - blockBorderWidth,
              width: 1 - radius.dl - radius.dr + eps2,
              height: blockBorderWidth,
              fill: color.stroke,
            });
            gElem.appendChild(line);
          }

          // 左側
          {
            const rect = app.svg.createRect(blockSize, {
              x,
              y: y + radius.ul,
              width: 0.5 + eps,
              height: 1 - radius.ul - radius.dl,
              fill: color.fill,
            });
            gElem.appendChild(rect);
          }
          if (!flags[dirs.l]) {
            const line = app.svg.createRect(blockSize, {
              x,
              y: y + radius.ul - eps,
              width: blockBorderWidth,
              height: 1 - radius.ul - radius.dl + eps2,
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
            const { srcX, srcY } = this.#getSrc(sX, sY, this.#moveDx, this.#moveDy);
            const moveFlag = this.#moveFlags[srcY] && this.#moveFlags[srcY][srcX];
            const dx = moveFlag ? this.#moveDx * 0.06 : 0;
            const dy = moveFlag ? this.#moveDy * 0.2 : 0;
            const px = moveFlag ? srcX : sX;
            const py = moveFlag ? srcY : sY;

            const prevInfo =
              this.#eyePrevInfo[py] === undefined || this.#eyePrevInfo[py][px] === undefined ? { dx: 0, dy: 0 } : this.#eyePrevInfo[py][px];
            const pdx = prevInfo.dx;
            const pdy = prevInfo.dy;

            if (this.#eyePrevInfo[sY] === undefined) {
              this.#eyePrevInfo[sY] = [];
            }
            this.#eyePrevInfo[sY][sX] = { dx, dy };

            const eyeLeft = createEye(x + 0.3, y + 0.5, dx, dy, pdx, pdy);
            const eyeRight = createEye(x + 0.7, y + 0.5, dx, dy, pdx, pdy);
            if (showCharsFlag) {
              eyeLeft.setAttribute('opacity', 0.2);
              eyeRight.setAttribute('opacity', 0.2);
            }
            gElem.appendChild(eyeLeft);
            gElem.appendChild(eyeRight);
          }
        } else {
          // 操作キャラ以外

          // 中央
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
                const rect1 = app.svg.createRect(blockSize, {
                  x: x - eps,
                  y,
                  width: blockBorderWidth + eps,
                  height: blockBorderWidth,
                  fill: color.stroke,
                });
                const rect2 = app.svg.createRect(blockSize, {
                  x,
                  y: y - eps,
                  width: blockBorderWidth,
                  height: blockBorderWidth + eps,
                  fill: color.stroke,
                });
                gElem.appendChild(rect1);
                gElem.appendChild(rect2);
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
                const rect1 = app.svg.createRect(blockSize, {
                  x: x + 1 - blockBorderWidth,
                  y,
                  width: blockBorderWidth + eps,
                  height: blockBorderWidth,
                  fill: color.stroke,
                });
                const rect2 = app.svg.createRect(blockSize, {
                  x: x + 1 - blockBorderWidth,
                  y: y - eps,
                  width: blockBorderWidth,
                  height: blockBorderWidth + eps,
                  fill: color.stroke,
                });
                gElem.appendChild(rect1);
                gElem.appendChild(rect2);
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
              const rect1 = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth + eps,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              const rect2 = app.svg.createRect(blockSize, {
                x: x + 1 - blockBorderWidth,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect1);
              gElem.appendChild(rect2);
            }
            if (flags[dirs.l] && !flags[dirs.dl]) {
              // 下 左 stroke
              const rect1 = app.svg.createRect(blockSize, {
                x: x - eps,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth + eps,
                height: blockBorderWidth,
                fill: color.stroke,
              });
              const rect2 = app.svg.createRect(blockSize, {
                x,
                y: y + 1 - blockBorderWidth,
                width: blockBorderWidth,
                height: blockBorderWidth + eps,
                fill: color.stroke,
              });
              gElem.appendChild(rect1);
              gElem.appendChild(rect2);
            }
          }

          // 邪魔ブロック
          if (app.states.isOther(state)) {
            const size = blockBorderWidth * 2;
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
        }
      }

      if (showCharsFlag) {
        const text = app.svg.createText(blockSize, {
          x: x + 0.5,
          y: y + 0.5,
          text: app.states.stateToChar[state],
        });
        gElem.appendChild(text);
        if (state === app.states.none || state === app.states.wall || this.#isConnected((s) => s === state)) {
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

      function createEye(x, y, dx, dy, prevDx, prevDy) {
        const cx = x + dx;
        const cy = y + dy;
        const eyeElem = app.svg.createCircle(blockSize, {
          cx,
          cy,
          r: 0.1,
          fill: color.stroke,
        });

        // 目の移動アニメーション
        {
          const mag = dx + dy === 0 ? 1.2 : 1;
          const ddx0 = -(dx - prevDx) * blockSize;
          const ddy0 = -(dy - prevDy) * blockSize;
          const ddx1 = ddx0 * (1 - mag);
          const ddy1 = ddy0 * (1 - mag);
          const translate0 = `translate(${ddx0}px, ${ddy0}px)`;
          const translate1 = `translate(${ddx1}px, ${ddy1}px)`;
          const keyframes = [
            { transform: `scale(1) ${translate0}`, offset: 0 },
            { transform: `scale(${mag}) ${translate1}`, offset: 0.5 },
            { transform: 'scale(1) translate(0px, 0px)', offset: 1 },
          ];
          const options = {
            duration: app.common.MOVE_INTERVAL_MSEC,
          };

          eyeElem.setAttribute('transform-origin', `${cx * blockSize} ${cy * blockSize}`);
          eyeElem.animate(keyframes, options);
        }

        return eyeElem;
      }
    }

    #addOneBlock(
      x,
      y,
      sX,
      sY,
      blockSize,
      symmetryType,
      showCharsFlag,
      smallJumpFlag,
      eyeFlag,
      isSoloUser,
      gShadows,
      gElemsOther,
      gElemsAnimation1,
      gElemsAnimation2
    ) {
      let gElems = gElemsOther;
      const state = this.getState(sX, sY);
      const color = app.colors[state];

      const elem = this.#createOneBlock(x, y, sX, sY, blockSize, showCharsFlag, eyeFlag);

      let child = elem;

      if (symmetryType !== null) {
        // クリア時のアニメーション
        if (app.states.isUser(state)) {
          if (isSoloUser) {
            const g = app.svg.createG();
            g.appendChild(elem);
            child = g;
            const animationClass = animationClasses[symmetryType];
            elem.classList.add(animationClass);
            elem.style.transformOrigin = `${blockSize * (x + 0.5)}px ${blockSize * (y + 0.5)}px`;
            g.classList.add('animation-jump');
          } else {
            elem.classList.add('animation-jump');
          }
          gElems = gElemsAnimation1;
        } else if (app.states.isTarget(state)) {
          const animationClass = animationClasses[symmetryType];
          elem.classList.add(animationClass);
          gElems = gElemsAnimation2;
        }
      } else if (smallJumpFlag) {
        if (app.states.isUser(state)) {
          // 移動しなかったときのアニメーション
          const dx = this.#moveDx;
          const dy = this.#moveDy;
          const { srcX, srcY } = this.#getSrc(sX, sY, dx, dy);
          if (!this.#moveFlags[srcY][srcX]) {
            if (isSoloUser) {
              const g = app.svg.createG();
              g.appendChild(elem);
              child = g;
              if (symmetryType !== null) {
                const animationClass = animationClasses[symmetryType];
                elem.classList.add(animationClass);
              }
              elem.style.transformOrigin = `${blockSize * (x + 0.5)}px ${blockSize * (y + 0.5)}px`;
              g.classList.add('animation-jump-small');
            } else {
              elem.classList.add('animation-jump-small');
            }
            gElems = gElemsAnimation1;
          }
        }
      }

      {
        const flags = [];
        for (let dir = 0; dir < 8; ++dir) {
          const dx = dxs[dir];
          const dy = dys[dir];
          if (this.#isInArea(sX + dx, sY + dy)) {
            flags[dir] = this.getState(sX + dx, sY + dy) === state;
          } else {
            flags[dir] = true;
          }
        }

        // 移動モーション
        const dx = this.#moveDx;
        const dy = this.#moveDy;
        const { srcX, srcY } = this.#getSrc(sX, sY, dx, dy);
        if (this.#xMin - 1 <= srcX && srcX <= this.#xMax && this.#yMin - 1 <= srcY && srcY <= this.#yMax && this.#moveFlags[srcY][srcX]) {
          gElems = gElemsAnimation2;
          if (dx + dy === 0) {
            gElems.style.setProperty('--animation-origin', `${(blockSize * this.#axis.cx) / 2}px ${(blockSize * this.#axis.cy) / 2}px`);

            const animationClass = animationMovingClasses[this.#axis.type];
            const additionalInfo = this.#axis.type === Level.SYMMETRY_TYPE.POINT2 && this.#mirrorFlag ? '-reversed' : '';
            elem.classList.add(animationClass + additionalInfo);
          } else {
            elem.classList.add('animation-move');
            if (app.states.isUser(state)) {
              const g = app.svg.createG();
              g.appendChild(elem);
              child = g;
              g.classList.add('animation-move-sub');
            }

            // 移動時のエフェクト（残像）
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

      gElems.appendChild(child);
    }
  }

  const animationMovingClasses = {
    [Level.SYMMETRY_TYPE.LINE1]: 'animation-move-line1',
    [Level.SYMMETRY_TYPE.LINE2]: 'animation-move-line2',
    [Level.SYMMETRY_TYPE.LINE3]: 'animation-move-line3',
    [Level.SYMMETRY_TYPE.LINE4]: 'animation-move-line4',
    [Level.SYMMETRY_TYPE.POINT1]: 'animation-move-point1',
    [Level.SYMMETRY_TYPE.POINT2]: 'animation-move-point2',
  };

  const animationClasses = {
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

  const jumpCounts = {
    [Level.SYMMETRY_TYPE.LINE1]: 2,
    [Level.SYMMETRY_TYPE.LINE2]: 2,
    [Level.SYMMETRY_TYPE.LINE3]: 2,
    [Level.SYMMETRY_TYPE.LINE4]: 2,
    [Level.SYMMETRY_TYPE.PLUS1]: 4,
    [Level.SYMMETRY_TYPE.PLUS2]: 4,
    [Level.SYMMETRY_TYPE.PLUS3]: 4,
    [Level.SYMMETRY_TYPE.POINT1]: 2,
    [Level.SYMMETRY_TYPE.POINT2]: 4,
    [Level.SYMMETRY_TYPE.SPECIAL1]: 3,
    [Level.SYMMETRY_TYPE.SPECIAL2]: 3,
    [Level.SYMMETRY_TYPE.SPECIAL3]: 8,
  };

  const axisTypeStr = {
    [Level.SYMMETRY_TYPE.LINE1]: 'l1',
    [Level.SYMMETRY_TYPE.LINE2]: 'l2',
    [Level.SYMMETRY_TYPE.LINE3]: 'l3',
    [Level.SYMMETRY_TYPE.LINE4]: 'l4',
    [Level.SYMMETRY_TYPE.POINT1]: 'p1',
    [Level.SYMMETRY_TYPE.POINT2]: 'p2',
  };

  if (isBrowser) {
    window.app = window.app || {};
    window.app.Level = Level;
  } else {
    module.exports = Level;
  }
})();
