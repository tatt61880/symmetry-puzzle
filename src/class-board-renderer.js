(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const app = window.app;
  const { Level, common } = app;
  const frameBorderWidth = 5;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pushSquintOffset = 0.15;
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

  class BoardRenderer {
    #level;
    #eyePrevInfo = [];
    #heldBumpAnimations = null;

    constructor(level) {
      this.#level = level;
    }

    // 通常プレイとリプレイは、同じ順序で盤面・格子・外枠を描きます。
    static drawBoard(svg, level, { layout, isSeqMode, lang, edit, score, ...blockOptions }) {
      const { blockSize, frameSizeW, frameSizeH } = layout;
      const isCompleted = blockOptions.symmetryAnimationFlag;
      const frameColor = isSeqMode ? app.colors.frameFillSeqMode : app.colors.frameFill;
      const g = app.svg.createG();
      svg.replaceChildren(g);

      const sleepMarks = blockOptions.idleAnimationFlag ? app.svg.createG('group-sleep-marks') : null;
      const boardOffset = `translate(${frameSizeW},${frameSizeH})`;
      const blocks = level.createSvgG({ blockSize, ...blockOptions, edgeColor: frameColor, sleepMarks });
      blocks.classList.add('group-level-main');
      blocks.setAttribute('transform', boardOffset);
      blocks.style.setProperty('pointer-events', 'none'); // タッチで連続して編集できるようにします。
      g.appendChild(blocks);
      drawDotLines(g, level, layout);
      if (sleepMarks) {
        sleepMarks.setAttribute('transform', boardOffset);
        sleepMarks.setAttribute('pointer-events', 'none');
        g.appendChild(sleepMarks); // 枠を越えた「Z」も隣のブロックや格子の手前に表示します。
      }

      const frame = app.svg.createG('group-frame');
      g.appendChild(frame);
      drawFrame(frame, level, layout, frameColor, isSeqMode);
      if (edit) {
        drawEditControls(frame, level, layout, edit, lang);
      } else {
        drawScore(frame, level, layout, score, isCompleted, isSeqMode, lang);
      }

      if (isCompleted) {
        const confetti = app.svg.createG();
        svg.appendChild(confetti);
        app.playSvgConfetti(confetti, blockSize * level.getWidth() + 2 * frameSizeW, blockSize * level.getHeight() + 2 * frameSizeH);
      }
    }

    releaseBumpFaces() {
      this.#heldBumpAnimations?.forEach((animation) => animation.play());
      this.#heldBumpAnimations = null;
    }

    createSvgG({
      blockSize,
      symmetryAnimationFlag = false,
      showCharsFlag = false,
      smallJumpFlag = false,
      idleAnimationFlag = false,
      holdBumpFace = false,
      sleepMarks = null,
      drawBackground = true,
      x0 = 0,
      y0 = 0,
      width = this.#level.getWidth(),
      height = this.#level.getHeight(),
      edgeColor = null,
    }) {
      this.#heldBumpAnimations = holdBumpFace ? [] : null;
      const g = app.svg.createG();
      g.style.setProperty('--animation-jump-small', `translate(0, ${-0.25 * blockSize}px)`);
      g.style.setProperty('--animation-jump', `translate(0, ${-0.5 * blockSize}px)`);

      const symmetryType = symmetryAnimationFlag ? this.#level.getSymmetryType(app.states.isTarget) : null;

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
          const state = this.#level.getState(x, y);
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
            if (this.#level.getState(x + 1, y) === state) return false;
            if (this.#level.getState(x, y + 1) === state) return false;
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
            idleAnimationFlag,
            eyeFlag,
            isSoloUser,
            gShadows,
            gElemsOther,
            gElemsAnimation1,
            gElemsAnimation2
          );
          if (eyeFlag && idleAnimationFlag) {
            const z = app.svg.createText(blockSize, { x: x - x0 + 0.74, y: y - y0 + 0.27, text: 'Z', fill: app.colors.sleepZ.fill });
            z.classList.add('player-sleep-z');
            z.setAttribute('stroke', app.colors.sleepZ.stroke);
            z.setAttribute('paint-order', 'stroke');
            z.setAttribute('font-size', blockSize * 0.26);
            z.setAttribute('opacity', 0);
            z.setAttribute('aria-hidden', 'true');
            (sleepMarks ?? g).appendChild(z);
          }
        }
      }

      if (this.#level.hasAxis()) {
        const { cx, cy } = this.#level.getAxisCenter();
        const center = { x: cx / 2, y: cy / 2 };
        const gg = app.svg.createG();
        g.appendChild(gg);

        const fill = app.colors.levelSymmetryAxis;
        const stroke = app.colors.levelSymmetryAxis;
        switch (this.#level.getAxisType()) {
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
        const center = this.#level.getCenter(app.states.isTarget);
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
      const radius = radiuses[common.checkMode];

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
        const sx = this.#level.getWidth() * blockSize + eps;
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
        const sx = this.#level.getWidth() * blockSize + eps;
        const sy = this.#level.getHeight() * blockSize + eps;
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
        const sy = this.#level.getHeight() * blockSize + eps;
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

    #getNeighborFlags(x, y, state) {
      const width = this.#level.getWidth();
      const height = this.#level.getHeight();
      return dxs.map((dx, dir) => {
        const xx = x + dx;
        const yy = y + dys[dir];
        return xx < 0 || yy < 0 || xx >= width || yy >= height || this.#level.getState(xx, yy) === state;
      });
    }

    #createOneBlock(x, y, sX, sY, blockSize, showCharsFlag, eyeFlag, idleAnimationFlag, flags, move) {
      const state = this.#level.getState(sX, sY);
      const color = app.colors[state];
      const showPushMotion = eyeFlag && move.pushing && !reducedMotion.matches;

      const gElem = app.svg.createG('group-elem');

      {
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
          const radius = radiuses[this.#level.getCheckMode()];
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
            const dx = move.moved ? move.dx * 0.06 : 0;
            const dy = move.moved ? move.dy * 0.2 : 0;
            const px = move.moved ? move.srcX : sX;
            const py = move.moved ? move.srcY : sY;

            const prevInfo =
              this.#eyePrevInfo[py] === undefined || this.#eyePrevInfo[py][px] === undefined ? { dx: 0, dy: 0 } : this.#eyePrevInfo[py][px];
            const pdx = prevInfo.dx;
            const pdy = prevInfo.dy;

            if (this.#eyePrevInfo[sY] === undefined) {
              this.#eyePrevInfo[sY] = [];
            }
            this.#eyePrevInfo[sY][sX] = { dx, dy };

            const pushAngle = move.dy > 0 ? 24 : 16;
            const leftPushAngle = move.dy < 0 ? -pushAngle : pushAngle;
            const eyeLeft = createEye(x + 0.3, y + 0.5, dx, dy, pdx, pdy, leftPushAngle);
            const eyeRight = createEye(x + 0.7, y + 0.5, dx, dy, pdx, pdy, -leftPushAngle);
            if (showCharsFlag) {
              eyeLeft.setAttribute('opacity', 0.2);
              eyeRight.setAttribute('opacity', 0.2);
            }
            gElem.appendChild(eyeLeft);
            gElem.appendChild(eyeRight);
            if (move.bumpDx !== undefined && !showCharsFlag && !reducedMotion.matches) {
              showBumpFace(eyeLeft, eyeRight, this.#heldBumpAnimations);
            }
            if (showPushMotion && !showCharsFlag) gElem.appendChild(createSweatDrop());
            if (idleAnimationFlag) {
              const centerX = -dx * blockSize;
              const centerY = -dy * blockSize;
              const glance = 0.075 * blockSize;
              gElem.style.setProperty('--idle-eye-left', `${centerX - glance}px ${centerY}px`);
              gElem.style.setProperty('--idle-eye-right', `${centerX + glance}px ${centerY}px`);
              gElem.style.setProperty('--idle-eye-center', `${centerX}px ${centerY}px`);
              eyeLeft.classList.add('player-idle-eye');
              eyeRight.classList.add('player-idle-eye');
            }
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
        if (state === app.states.none || state === app.states.wall || this.#level.isConnected((s) => s === state)) {
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

      function createSweatDrop() {
        const g = app.svg.createG('push-sweat');
        const side = move.dx > 0 ? -1 : 1;
        // 上を押すときは、しずくの先端が右目の中央の少し下から流れるようにします。
        const { startX, startY, angle, driftY, startOffset } =
          move.dy < 0
            ? { startX: 0.85, startY: 0.65, angle: 90, driftY: 0.1, startOffset: pushSquintOffset }
            : { startX: 0.5 + side * 0.28, startY: 0.24, angle: 0, driftY: -0.11, startOffset: 0 };
        const cx = (x + startX) * blockSize;
        const cy = (y + startY) * blockSize;
        const drop = app.svg.createPath({
          d: 'M -0.07,0.12 Q -0.08,-0.01 0,-0.11 C 0.09,-0.21 0.19,-0.08 0.12,0.01 Q 0.06,0.08 -0.07,0.12 Z',
          fill: app.colors.pushSweat.fill,
        });
        drop.setAttribute('transform', `translate(${cx},${cy}) scale(${side * blockSize},${blockSize}) rotate(${angle})`);
        drop.setAttribute('stroke', app.colors.pushSweat.stroke);
        drop.setAttribute('stroke-width', 0.035);
        drop.setAttribute('stroke-linejoin', 'round');
        g.appendChild(drop);
        g.setAttribute('aria-hidden', 'true');
        g.setAttribute('opacity', 0);
        g.animate(
          [
            { opacity: 0, transform: 'translate(0, 0)', offset: startOffset },
            { opacity: 1, offset: startOffset + 0.12 },
            { opacity: 1, offset: 0.65 },
            { opacity: 0, transform: `translate(${side * blockSize * 0.14}px, ${blockSize * driftY}px)`, offset: 1 },
          ],
          { duration: app.common.MOVE_INTERVAL_MSEC * 1.5 }
        );
        return g;
      }

      function showBumpFace(eyeLeft, eyeRight, heldAnimations) {
        // 片目をぎゅっと閉じます。左右にぶつかったときは、ぶつかった側の目を閉じます。
        const face = app.svg.createPath({ d: 'M .23 .36 L .40 .49 L .22 .57 M .62 .50 Q .68 .42 .78 .46', fill: 'none' });
        const mirror = move.bumpDx > 0;
        const originX = (mirror ? x + 1 : x) * blockSize;
        face.setAttribute('transform', `translate(${originX},${y * blockSize}) scale(${mirror ? -blockSize : blockSize},${blockSize})`);
        face.setAttribute('stroke', color.stroke);
        face.setAttribute('stroke-width', '0.075');
        face.setAttribute('stroke-linecap', 'round');
        face.setAttribute('stroke-linejoin', 'round');
        face.setAttribute('opacity', 0);
        gElem.appendChild(face);

        const options = { duration: app.common.MOVE_INTERVAL_MSEC * 1.5 };
        const openEyes = [{ opacity: 0 }, { opacity: 0, offset: 0.75 }, { opacity: 1 }];
        const animations = [
          eyeLeft.animate(openEyes, options),
          eyeRight.animate(openEyes, options),
          face.animate([{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], options),
        ];
        if (heldAnimations) {
          for (const animation of animations) {
            animation.pause();
            heldAnimations.push(animation);
          }
        }
      }

      function createEye(x, y, dx, dy, prevDx, prevDy, pushAngle) {
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
          const keyframes = [{ transform: `scale(1) ${translate0}`, offset: 0 }];
          if (showPushMotion) {
            const squint = `rotate(${pushAngle}deg) scale(1.32, 0.32)`;
            keyframes.push({ transform: squint, offset: pushSquintOffset }, { transform: squint, offset: 0.7 });
          } else {
            keyframes.push({ transform: `scale(${mag}) ${translate1}`, offset: 0.5 });
          }
          keyframes.push({ transform: 'scale(1) translate(0px, 0px)', offset: 1 });
          const options = {
            duration: app.common.MOVE_INTERVAL_MSEC * (showPushMotion ? 1.5 : 1),
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
      idleAnimationFlag,
      eyeFlag,
      isSoloUser,
      gShadows,
      gElemsOther,
      gElemsAnimation1,
      gElemsAnimation2
    ) {
      let gElems = gElemsOther;
      const state = this.#level.getState(sX, sY);
      const color = app.colors[state];

      const flags = this.#getNeighborFlags(sX, sY, state);
      const move = this.#level.getMoveInfo(sX, sY);
      const elem = this.#createOneBlock(x, y, sX, sY, blockSize, showCharsFlag, eyeFlag, idleAnimationFlag, flags, move);

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
          if (!move.moved) {
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
        // 移動モーション
        const { dx, dy } = move;
        if (move.moved) {
          gElems = gElemsAnimation2;
          if (dx + dy === 0) {
            const { cx, cy } = this.#level.getAxisCenter();
            gElems.style.setProperty('--animation-origin', `${(blockSize * cx) / 2}px ${(blockSize * cy) / 2}px`);

            const animationClass = animationMovingClasses[this.#level.getAxisType()];
            const additionalInfo = this.#level.getAxisType() === Level.SYMMETRY_TYPE.POINT2 && move.mirrored ? '-reversed' : '';
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

  function drawDotLines(mainSvgG, level, { blockSize, frameSizeW, frameSizeH }) {
    const dotRatio = 1 / 40;
    const size = blockSize * dotRatio;
    const strokeDasharray = `${size} ${4 * size}`;
    const g = app.svg.createG('group-dot-lines');
    mainSvgG.appendChild(g);
    // 横線
    for (let y = 1; y < level.getHeight(); ++y) {
      const line = app.svg.createLine(blockSize, {
        x1: -0.5 * dotRatio,
        y1: y,
        x2: level.getWidth(),
        y2: y,
        stroke: app.colors.line,
      });
      line.setAttribute('stroke-dasharray', strokeDasharray);
      g.appendChild(line);
    }
    // 縦線
    for (let x = 1; x < level.getWidth(); ++x) {
      const line = app.svg.createLine(blockSize, {
        x1: x,
        y1: -0.5 * dotRatio,
        x2: x,
        y2: level.getHeight(),
        stroke: app.colors.line,
      });
      line.setAttribute('stroke-dasharray', strokeDasharray);
      g.appendChild(line);
    }
    g.setAttribute('transform', `translate(${frameSizeW},${frameSizeH})`);
  }

  function drawFrame(g, level, { blockSize, frameSizeW, frameSizeH }, frameColor, isSeqMode) {
    const rectU = app.svg.createRect(1, {
      x: 0,
      y: 0,
      width: level.getWidth() * blockSize + 2 * frameSizeW,
      height: frameSizeH,
      fill: frameColor,
    });
    const rectR = app.svg.createRect(1, {
      x: level.getWidth() * blockSize + frameSizeW,
      y: 0,
      width: frameSizeW,
      height: level.getHeight() * blockSize + 2 * frameSizeH,
      fill: frameColor,
    });
    const rectD = app.svg.createRect(1, {
      x: 0,
      y: level.getHeight() * blockSize + frameSizeH,
      width: level.getWidth() * blockSize + 2 * frameSizeW,
      height: frameSizeH,
      fill: frameColor,
    });
    const rectL = app.svg.createRect(1, {
      x: 0,
      y: 0,
      width: frameSizeW,
      height: level.getHeight() * blockSize + 2 * frameSizeH,
      fill: frameColor,
    });
    g.appendChild(rectU);
    g.appendChild(rectR);
    g.appendChild(rectD);
    g.appendChild(rectL);

    const borderColor = isSeqMode ? app.colors.frameStrokeSeqMode : app.colors.frameStroke;
    const rectUb = app.svg.createRect(1, {
      x: 0,
      y: 0,
      width: level.getWidth() * blockSize + 2 * frameSizeW,
      height: frameBorderWidth,
      fill: borderColor,
    });
    const rectRb = app.svg.createRect(1, {
      x: level.getWidth() * blockSize + 2 * frameSizeW - frameBorderWidth,
      y: 0,
      width: frameBorderWidth,
      height: level.getHeight() * blockSize + 2 * frameSizeH,
      fill: borderColor,
    });
    const rectDb = app.svg.createRect(1, {
      x: 0,
      y: level.getHeight() * blockSize + 2 * frameSizeH - frameBorderWidth,
      width: level.getWidth() * blockSize + 2 * frameSizeW,
      height: frameBorderWidth,
      fill: borderColor,
    });
    const rectLb = app.svg.createRect(1, {
      x: 0,
      y: 0,
      width: frameBorderWidth,
      height: level.getHeight() * blockSize + 2 * frameSizeH,
      fill: borderColor,
    });
    g.appendChild(rectUb);
    g.appendChild(rectRb);
    g.appendChild(rectDb);
    g.appendChild(rectLb);
  }

  function drawEditControls(g, level, { blockSize, frameSizeW, frameSizeH }, { normalized, moveAxis, resizeLevel }, lang) {
    if (!normalized) {
      const fontSize = `${frameSizeH * 0.7}px`;
      const text = app.svg.createText(frameSizeH, {
        x: 0,
        y: 0.5,
        text: '',
        fill: '#663300',
      });
      text.classList.add('translatable-toggle');
      text.dataset.ja = '正規化されていません。';
      text.dataset.en = 'Not normalized.';
      common.applyLang(text, lang);

      const width = (level.getWidth() * blockSize + 2 * frameSizeW) / 2;
      const height = frameBorderWidth;
      text.setAttribute('font-size', fontSize);
      text.setAttribute('transform', `translate(${width},${height})`);
      g.appendChild(text);
    }

    const pointsR = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 1],
      [-1, -1],
    ];
    const pointsL = [
      [0, -1],
      [1, -1],
      [1, 1],
      [0, 1],
      [-1, 0],
    ];
    const pointsD = [
      [1, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
      [-1, -1],
    ];
    const pointsU = [
      [0, -1],
      [1, 0],
      [1, 1],
      [-1, 1],
      [-1, 0],
    ];

    const cx1 = frameSizeW / blockSize + 0.5;
    const cx2 = frameSizeW / blockSize + level.getWidth() * 0.3;
    const cx3 = frameSizeW / blockSize + level.getWidth() * 0.7;
    const cx4 = frameSizeW / blockSize + level.getWidth() - 0.5;
    const cxM = frameSizeW / blockSize + level.getWidth() * 0.5;

    const cy1 = frameSizeH / blockSize + 0.5;
    const cy2 = frameSizeH / blockSize + level.getHeight() * 0.3;
    const cy3 = frameSizeH / blockSize + level.getHeight() * 0.7;
    const cy4 = frameSizeH / blockSize + level.getHeight() - 0.5;
    const cyM = frameSizeH / blockSize + level.getHeight() * 0.5;

    // 軸位置変更ボタンの追加
    if (level.hasAxis()) {
      const buttons = [
        { cx: cxM, cy: cy1, points: pointsU, dx: +0, dy: -1 },
        { cx: cx4, cy: cyM, points: pointsR, dx: +1, dy: +0 },
        { cx: cxM, cy: cy4, points: pointsD, dx: +0, dy: +1 },
        { cx: cx1, cy: cyM, points: pointsL, dx: -1, dy: +0 },
      ];

      buttons.forEach((button) => {
        if (button.dx === -1 && !level.axisCxDecAble()) return;
        if (button.dy === -1 && !level.axisCyDecAble()) return;
        if (button.dx === 1 && !level.axisCxIncAble()) return;
        if (button.dy === 1 && !level.axisCyIncAble()) return;

        addEditButton(button, moveAxis.bind(null, button.dx, button.dy), app.colors[app.states.userMin]);
      });
    }

    // 盤面サイズ変更ボタンの追加
    {
      const buttons = [
        // 左右
        { cx: cx1, cy: cy2, points: pointsR, dx: -1, dy: 0, flag: true },
        { cx: cx1, cy: cy3, points: pointsL, dx: +1, dy: 0, flag: true },
        { cx: cx4, cy: cy2, points: pointsL, dx: -1, dy: 0, flag: false },
        { cx: cx4, cy: cy3, points: pointsR, dx: +1, dy: 0, flag: false },

        // 上下
        { cx: cx2, cy: cy1, points: pointsD, dx: 0, dy: -1, flag: true },
        { cx: cx3, cy: cy1, points: pointsU, dx: 0, dy: +1, flag: true },
        { cx: cx2, cy: cy4, points: pointsU, dx: 0, dy: -1, flag: false },
        { cx: cx3, cy: cy4, points: pointsD, dx: 0, dy: +1, flag: false },
      ];

      buttons.forEach((button) => {
        if (button.dx === -1 && level.getW() <= common.minEditW) return;
        if (button.dy === -1 && level.getH() <= common.minEditH) return;
        if (button.dx === 1 && level.getW() >= common.maxEditW) return;
        if (button.dy === 1 && level.getH() >= common.maxEditH) return;

        addEditButton(button, resizeLevel.bind(null, button.dx, button.dy, button.flag), app.colors.editButton);
      });
    }

    function addEditButton(button, onClick, color) {
      const points = [];
      for (const point of button.points) {
        points.push([button.cx + 0.45 * point[0], button.cy + 0.45 * point[1]]);
      }

      const polygon = app.svg.createPolygon(blockSize, {
        points,
        fill: color.fill,
        stroke: color.stroke,
        strokeWidth: 0.1,
      });
      polygon.classList.add('button', 'active-hover');
      polygon.addEventListener('click', onClick);
      g.appendChild(polygon);

      const char = button.dx + button.dy > 0 ? '+' : '-';
      const text = app.svg.createText(blockSize, {
        x: button.cx,
        y: button.cy,
        text: char,
        fill: color.stroke,
      });
      text.setAttribute('font-size', `${blockSize * 0.7}px`);
      g.appendChild(text);
    }
  }

  function drawScore(g, level, { blockSize, frameSizeW, frameSizeH }, score, isCompleted, isSeqMode, lang) {
    const { currentStep, bestStep, highestScore, highestScorePrev } = score;
    const wallStrShift = app.colors[app.states.wall].fill === app.colors[app.states.wall].stroke ? 0 : 0.05;
    const fontSize = `${frameSizeH * 0.7}px`;
    const fontSize2 = `${blockSize * 0.65}px`;

    // クリア時のメッセージ
    if (isCompleted) {
      const width = (level.getWidth() * blockSize + 2 * frameSizeW) / 2;
      const height = (level.getHeight() - 0.5 + wallStrShift) * blockSize + frameSizeH;
      const text = app.svg.createText(blockSize, {
        x: width / blockSize,
        y: height / blockSize,
        text: 'Congratulations!',
        fill: app.colors.congratulations,
      });
      text.classList.add('translatable-toggle');
      text.dataset.ja = currentStep === bestStep ? 'お見事！' : 'クリア！';
      text.dataset.en = currentStep === bestStep ? 'Well done!' : 'Cleared!';
      common.applyLang(text, lang);
      text.setAttribute('font-size', fontSize2);

      const gg = app.svg.createG();
      gg.setAttribute('transform-origin', `${width}px ${height}px`);
      gg.classList.add('animation-congratulations');

      gg.appendChild(text);
      g.appendChild(gg);
      score.onClearMessageDrawn?.();
    }

    // 今回の手数
    {
      let color = isSeqMode ? app.colors.stepNum : app.colors.stepNormal;
      if (isCompleted) {
        if (!highestScorePrev || currentStep <= highestScorePrev) {
          color = common.getStepColor(currentStep, bestStep);
        }
      }
      const text = app.svg.createText(frameSizeH, {
        x: 0,
        y: 0.5,
        text: '',
        fill: color,
      });
      text.classList.add('translatable-toggle');
      text.dataset.ja = `${currentStep}手目`;
      text.dataset.en = `${currentStep} step${currentStep === 1 ? '' : 's'}`; // 0 steps, 1 step, 2 steps, ......
      common.applyLang(text, lang);

      text.setAttribute('font-size', fontSize);
      const width = (level.getWidth() * blockSize + 2 * frameSizeW) / 2;
      const height = level.getHeight() * blockSize + frameSizeH - frameBorderWidth / 2;
      text.setAttribute('transform', `translate(${width},${height})`);
      g.appendChild(text);
    }

    // 自己最高記録
    if (highestScore !== undefined) {
      {
        const crown = common.createCrown(frameSizeH, frameBorderWidth / frameSizeH, frameBorderWidth / frameSizeH, highestScore, bestStep);
        g.appendChild(crown);
        if (isCompleted) {
          const animationNewRecordCrownClass = 'animation-new-record-crown';
          if (highestScorePrev === null) {
            console.log('初回クリア');
            crown.classList.add(animationNewRecordCrownClass);
          } else if (highestScore === bestStep && highestScorePrev !== bestStep) {
            console.log('初回金冠');
            crown.classList.add(animationNewRecordCrownClass);
          }
        }
      }

      if (highestScore !== null) {
        const color = common.getStepColor(highestScore, bestStep);

        const text = app.svg.createText(frameSizeH, {
          x: 0,
          y: 0.5,
          text: '',
          fill: color,
        });
        text.classList.add('translatable-toggle');
        text.dataset.ja = `自己ベスト: ${highestScore}手`;
        text.dataset.en = `Your best: ${highestScore} step${highestScore === 1 ? '' : 's'}`; // 0 steps, 1 step, 2 steps, ......
        common.applyLang(text, lang);

        const width = (level.getWidth() * blockSize + 2 * frameSizeW) / 2;
        const height = frameBorderWidth / 2;
        text.setAttribute('font-size', fontSize);
        text.setAttribute('transform', `translate(${width},${height})`);
        g.appendChild(text);
      }

      // 記録更新？
      if (highestScore !== null && highestScorePrev !== null && highestScore < highestScorePrev) {
        const width = (level.getWidth() * blockSize + 2 * frameSizeW) / 2;
        const height = frameSizeH + (0.5 - wallStrShift) * blockSize;
        const text = app.svg.createText(blockSize, {
          x: width / blockSize,
          y: height / blockSize,
          text: '',
          fill: app.colors.newRecords,
        });
        text.setAttribute('font-size', fontSize2);
        text.classList.add('translatable-toggle');
        text.dataset.ja = '記録更新!';
        text.dataset.en = 'New record!';
        common.applyLang(text, lang);

        const gg = app.svg.createG();
        gg.setAttribute('transform-origin', `${width}px ${height}px`);
        gg.classList.add('animation-new-record');

        gg.appendChild(text);
        g.appendChild(gg);
      }
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

  app.BoardRenderer = BoardRenderer;
})();
