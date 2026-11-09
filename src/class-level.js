(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  if (isBrowser) {
    app = window.app;
    console.assert(app?.states !== undefined);
    console.assert(app?.common !== undefined);
    console.assert(app?.Stack !== undefined);
  } else {
    app.states = require('./states.js');
    app.common = require('./common.js');
    app.Stack = require('./class-stack.js');
  }

  const axisOffset = 2;

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

  function transformHint(hint, position, direction) {
    const transform = (stage) => {
      const result = { ...stage };
      // 盤上の矢印だけを鏡映・回転します。対称軸操作のボタンは常に中央です。
      if (stage.x !== undefined) Object.assign(result, position(stage), { dir: direction(stage.dir) });
      if (stage.when) result.when = { ...stage.when, ...position(stage.when) };
      if (stage.wallDirs) result.wallDirs = stage.wallDirs.map(direction);
      return result;
    };
    return hint.stages ? { ...hint, stages: hint.stages.map(transform) } : transform(hint);
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

      // 線点対称の分類
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
    #pushingUsers = new Set();
    #bumpDirections = new Map();
    #moveDx;
    #moveDy;
    #renderer;
    #yMin;
    #xMin;
    #yMax;
    #xMax;
    #getSymmetryType;
    #axis;
    #reverseRotation;

    constructor({ levelObj, checkMode = Level.CHECK_MODE.LINE, mirrorFlag = false, rotateNum = 0, reverseRotation = mirrorFlag }) {
      this.#checkMode = null;
      this.#levelObj = null;
      this.#width = null;
      this.#height = null;
      this.#states = [];
      this.#moveDx = null;
      this.#moveDy = null;
      this.#yMin = 1;
      this.#xMin = 1;
      this.#yMax = null;
      this.#xMax = null;
      this.#getSymmetryType = null;
      this.#axis = null;
      this.#reverseRotation = reverseRotation;

      this.#setCheckMode(checkMode);
      let obj = levelObj;
      this.applyAxis(obj.axis);
      if (mirrorFlag) {
        obj = this.#mirrorLevel(obj);
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

    getHint() {
      const hint = this.#levelObj.hint;
      if (!hint?.stages) return hint;

      const stage = hint.stages.find(
        ({ when }) => this.getState(this.#xMin + when.x, this.#yMin + when.y) === app.states.charToState[when.block]
      );
      if (stage) return { ...stage, afterSteps: hint.afterSteps };
      if (hint.stuck) return { ...hint.stuck, undo: true, afterSteps: hint.afterSteps };
      return null;
    }

    createReplayLevel(initialState) {
      // 初期盤面はすでに鏡映・回転済みです。鏡映時の軸操作の回転方向も引き継ぎます。
      return new Level({ levelObj: { ...initialState }, checkMode: this.#checkMode, reverseRotation: this.#reverseRotation });
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

    // 同じ壁配置の探索内で使うキー。占有マスの位置とブロックの識別番号を1文字ずつ格納します。
    createSearchStateCodec() {
      const cells = [];
      for (let y = this.#yMin; y < this.#yMax; ++y) {
        const row = this.#states[y];
        for (let x = this.#xMin; x < this.#xMax; ++x) {
          if (row[x] !== app.states.wall) cells.push({ row, x });
        }
      }

      const codes = new Map();
      const states = [];
      const entries = [];
      return {
        encode() {
          let offset = 0;
          for (let i = 0; i < cells.length; ++i) {
            const { row, x } = cells[i];
            const state = row[x];
            if (state === app.states.none) continue;
            let code = codes.get(state);
            if (code === undefined) {
              code = states.length;
              states.push(state);
              codes.set(state, code);
            }
            entries[offset++] = i;
            entries[offset++] = code;
          }
          entries.length = offset;
          return String.fromCharCode(...entries);
        },
        restore(key) {
          for (const { row, x } of cells) row[x] = app.states.none;
          for (let i = 0; i < key.length; i += 2) {
            const { row, x } = cells[key.charCodeAt(i)];
            row[x] = states[key.charCodeAt(i + 1)];
          }
        },
      };
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

    getSolverCommand() {
      const w = this.getW();
      const h = this.getH();
      const s = this.getS();

      const checkModeStr = this.#getCheckModeStr();
      const axis = this.hasAxis() ? ` --axis ${this.getA()}` : '';
      const rotation = this.#reverseRotation && this.getAxisType() === Level.SYMMETRY_TYPE.POINT2 ? ' --reverse-rotation' : '';
      return `node src/solve.js --mode ${checkModeStr} -w ${w} -h ${h} --s="${s}" --all --console --draw${axis}${rotation}`;
    }

    printSolveJsStr() {
      console.log(this.getSolverCommand());
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
    #mirrorAxis(width) {
      if (!this.hasAxis()) return;
      this.#axis.cx = width * 2 - this.#axis.cx;
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

    #getAxisNormalization() {
      const { type, cx, cy } = this.#axis;
      const center = this.#getNormalizedAxisCenter();

      // 盤面を縮めたり鏡映したりすると、基準点が盤面の外に残ることがあります。
      // 文字列には軸上の代表点を使いますが、正規化ボタンは従来の移動方向と停止位置に従います。
      if (type === Level.SYMMETRY_TYPE.LINE3 && (cx < axisOffset || cy < axisOffset)) {
        return { center: { cx, cy }, isNormalized: cx === axisOffset || cy === axisOffset };
      }
      if (type === Level.SYMMETRY_TYPE.LINE4) {
        if (cx < axisOffset || cy < axisOffset) return { center: { cx, cy }, isNormalized: false };
        if (cx > center.cx || center.cy > this.#yMax * 2) {
          // 右上に進んでも上辺・右辺に届かないときは、上辺の半マス先で止まります。
          const distance = cy - axisOffset + 1;
          return { center: { cx: cx + distance, cy: axisOffset - 1 }, isNormalized: false };
        }
      }

      return { center, isNormalized: cx === center.cx && cy === center.cy };
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
      this.#renderer = null; // 盤面を戻したら、目の向きも初期化します。
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

      if (this.hasAxis()) {
        Object.assign(this.#axis, this.#getAxisNormalization().center);
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

      return !this.hasAxis() || this.#getAxisNormalization().isNormalized;
    }

    isSymmetry(isX) {
      return this.#getSymmetryType(isX) !== null;
    }

    isCompleted() {
      if (!this.#exist(app.states.isTarget)) return false;
      if (!this.isSymmetry(app.states.isTarget)) return false;
      if (!this.isConnected(app.states.isTarget)) return false;
      return true;
    }

    getCheckMode() {
      return this.#checkMode;
    }

    #resetMoveFlags(holdBumpFace = false) {
      this.#pushingUsers.clear();
      if (!holdBumpFace) this.#bumpDirections.clear();
      for (const row of this.#moveFlags) row.fill(false);
    }

    #updateMoveFlags(dx, dy, userMax) {
      this.#resetMoveFlags();
      if (!this.hasAxis() && dx + dy === 0) {
        return false;
      }

      let moveFlag = false;

      if (this.hasAxis() && dx + dy === 0) {
        loop: for (let i = app.states.userMin; i <= userMax; ++i) {
          if (!this.#exist((x) => x === i)) continue;

          const moveState = new Set([i]); // 移動予定の状態番号

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
                } else if (!moveState.has(dstState)) {
                  moveState.add(dstState);
                  st.push(dstState);
                }
              }
            }
          }

          // 各座標に移動フラグを設定
          for (let y = this.#yMin; y < this.#yMax; ++y) {
            for (let x = this.#xMin; x < this.#xMax; ++x) {
              if (moveState.has(this.#states[y][x])) {
                this.#moveFlags[y][x] = true;
              }
            }
          }
          moveFlag = true;
        }
      } else {
        loop: for (let i = app.states.userMin; i <= userMax; ++i) {
          if (!this.#exist((x) => x === i)) continue;

          const moveState = new Set([i]); // 移動予定の状態番号

          let pushingTarget = false;
          const st = new app.Stack(); // 移動可能か検証必要な状態番号
          st.push(i);
          while (!st.empty()) {
            const state = st.pop();
            for (let y = this.#yMin; y < this.#yMax; ++y) {
              for (let x = this.#xMin; x < this.#xMax; ++x) {
                if (this.#states[y][x] !== state) continue;
                const dstState = this.#states[y + dy][x + dx];
                if (dstState === app.states.none) continue;

                if (state === i && app.states.isTarget(dstState)) pushingTarget = true;
                if (dstState === app.states.wall) {
                  // 自分が壁に当たったか、直接押したターゲットの先が詰まっているとき。
                  if (state === i || pushingTarget) this.#bumpDirections.set(i, { dx, dy });
                  continue loop;
                } else if (!moveState.has(dstState)) {
                  moveState.add(dstState);
                  st.push(dstState);
                }
              }
            }
          }

          // 各座標に移動フラグを設定
          for (let y = this.#yMin; y < this.#yMax; ++y) {
            for (let x = this.#xMin; x < this.#xMax; ++x) {
              const state = this.#states[y][x];
              if (!moveState.has(state)) continue;
              this.#moveFlags[y][x] = true;

              if (app.states.isUser(state)) {
                const ahead = this.#states[y + dy][x + dx];
                if (app.states.isTarget(ahead) || app.states.isOther(ahead)) {
                  this.#pushingUsers.add(state);
                }
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
          if (!this.#reverseRotation) {
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
          if (!this.#reverseRotation) {
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

    move(dx, dy, userMax = app.states.userMax) {
      this.#renderer?.resetIdleBlink();
      const moveFlag = this.#updateMoveFlags(dx, dy, userMax);
      if (moveFlag) {
        this.#execMoveFlags();
      }
      return moveFlag;
    }

    // 移動後のマスから、移動元の座標と、そのブロックが動いたかを調べます。
    getMoveInfo(x, y) {
      const dx = this.#moveDx;
      const dy = this.#moveDy;
      const { srcX, srcY } = this.#getSrc(x, y, dx, dy);
      const moved = this.#isInArea(srcX, srcY) && this.#moveFlags[srcY][srcX];
      const state = this.getState(x, y);
      const pushing = moved && this.#pushingUsers.has(state);
      const bump = this.#bumpDirections.get(state);
      return { dx, dy, srcX, srcY, moved, pushing, bump, mirrored: this.#reverseRotation };
    }

    releaseBumpFaces() {
      this.#bumpDirections.clear();
      this.#renderer?.releaseBumpFaces();
    }

    createSvgG(options) {
      this.#renderer ??= new app.BoardRenderer(this);
      const g = this.#renderer.createSvgG(options);
      this.#resetMoveFlags(options.holdBumpFace);
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
      this.#mirrorAxis(w + 2);
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
      const hint = levelObj.hint;
      if (hint) {
        newLevelObj.hint = transformHint(
          hint,
          ({ x, y }) => ({ x: w - 1 - x, y }),
          (dir) => (4 - dir) % 4
        );
      }
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
        const hint = newLevelObj.hint;
        newLevelObj = { w, h, s, r };
        if (hint) {
          newLevelObj.hint = transformHint(
            hint,
            ({ x, y }) => ({ x: w - 1 - y, y: x }),
            (dir) => (dir + 1) % 4
          );
        }
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
      this.#moveFlags = Array.from({ length: this.#height }, () => new Array(this.#width).fill(false));
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
    isConnected(isX) {
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

      if (x0 === undefined) return false;

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
  }

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
