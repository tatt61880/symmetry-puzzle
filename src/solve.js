(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  let options;
  let checkMode = null;

  if (isBrowser) {
    app = window.app;
    app.console = console;
    console.assert(app?.states !== undefined);
    console.assert(app?.Level !== undefined);
    options = {};
    window.process = {
      exitCode: 0,
    };
  } else {
    app.console = require('./console.js');
    app.states = require('./states.js');
    app.Level = require('./class-level.js');

    app.levelsLine = require('./levels-line.js');
    app.levelsLineEx = require('./levels-line-ex.js');
    app.levelsPoint = require('./levels-point.js');
    app.levelsPointEx = require('./levels-point-ex.js');
    app.levelsSpecial = require('./levels-special.js');
    app.levelsSpecialEx = require('./levels-special-ex.js');

    const program = require('commander');
    program
      .version('4.0.0')
      .option('--mode <check-mode>', 'symmetry mode')
      .option('-i, --id <id>', 'id of level')
      .option('--all', 'list up all solutions')
      .option('-w, --w <w>', 'levelObj.w', Number)
      .option('-h, --h <h>', 'levelObj.h', Number)
      .option('-s, --s <s>', 'levelObj.s')
      .option('--axis <axis>', 'levelObj.axis')
      .option('-p, --prefixStep <prefix-step>', 'prefixStep step')
      .option('-c, --console', 'console.info step')
      .option('-d, --draw', 'draw target shape')
      .option('-n, --normalize', 'normalize state')
      .option('-m, --max <max-step>', 'max step', Number)
      .option('-t, --time <time-limit>', 'time limit', Number);

    program.parse();
    options = program.opts();
  }

  if (!isBrowser) {
    switch (options.mode) {
      case 'line':
        checkMode = app.Level.CHECK_MODE.LINE;
        break;
      case 'point':
        checkMode = app.Level.CHECK_MODE.POINT;
        break;
      case 'special':
        checkMode = app.Level.CHECK_MODE.SPECIAL;
        break;
    }
  }

  const levelId = options.id;
  if (isBrowser) {
    1;
  } else if (levelId !== undefined) {
    const levels = {};

    let levelsList;
    let levelsExList;
    switch (checkMode) {
      case app.Level.CHECK_MODE.LINE:
        levelsList = app.levelsLine;
        levelsExList = app.levelsLineEx;
        break;
      case app.Level.CHECK_MODE.POINT:
        levelsList = app.levelsPoint;
        levelsExList = app.levelsPointEx;
        break;
      case app.Level.CHECK_MODE.SPECIAL:
        levelsList = app.levelsSpecial;
        levelsExList = app.levelsSpecialEx;
        break;
      default:
        app.console.error('mode error');
        return;
    }

    for (const levelId in levelsList) {
      const levelObj = levelsList[levelId];
      levels[levelId] = levelObj;
    }
    for (const levelId in levelsExList) {
      const levelObj = levelsExList[levelId];
      levels[levelId] = levelObj;
    }

    if (levelId === 'all') {
      for (const levelId in levels) {
        if (levelId === '0') continue;
        const levelObj = levels[levelId];
        solveLevelObj(levelId, levelObj);
      }
    } else {
      const levelObj = levels[levelId];
      solveLevelObj(levelId, levelObj);
    }
  } else if (options.w !== undefined) {
    if (options.w === undefined) {
      app.console.error('Error: w === undefined');
      process.exitCode = 1;
      return;
    }
    if (options.h === undefined) {
      app.console.error('Error: h === undefined');
      process.exitCode = 1;
      return;
    }
    if (options.s === undefined) {
      app.console.error('Error: s === undefined');
      process.exitCode = 1;
      return;
    }
    const w = options.w;
    const h = options.h;
    const s = options.s;
    const axis = options.axis;
    if (isNaN(w)) {
      app.console.error('Error: w is NaN');
      process.exitCode = 1;
      return;
    }
    if (isNaN(h)) {
      app.console.error('Error: h is NaN');
      process.exitCode = 1;
      return;
    }
    const levelObj = { w, h, s, axis };
    solveLevelObj(null, levelObj);
  }

  function solveLevelObj(levelId, levelObj) {
    if (levelObj === undefined) {
      app.console.error(`Error: [LEVEL ${levelId}] levelObj === undefined`);
      process.exitCode = 1;
      return;
    }
    if (checkMode === null) {
      app.console.error('check mode error');
      process.exitCode = 1;
      return;
    }
    const level = new app.Level({ levelObj, checkMode });

    const maxStep = (() => {
      let res = options.max;
      if (res === undefined) {
        res = 1000;
      }
      return res;
    })();

    if (isNaN(maxStep)) {
      app.console.error(
        `Error: [LEVEL ${levelId}] maxStep is NaN. maxStep === ${maxStep}`
      );
      process.exitCode = 1;
      return;
    }

    const prefixStep = options.prefixStep;
    const timeLimit = options.time;

    solveLevel(levelId, level, { maxStep, timeLimit, prefixStep });
  }

  function solveLevel(
    levelId,
    level,
    { maxStep = 1000, timeLimit, prefixStep = '' }
  ) {
    if (prefixStep !== '') {
      for (const c of prefixStep) {
        if (c === '0') continue;
        if (c === '1') continue;
        if (c === '2') continue;
        if (c === '3') continue;
        app.console.error('Error: invalid step. chars in step should be 0-3.');
        process.exitCode = 1;
        return;
      }
    }
    const startTime = performance.now();
    let prevTime = startTime;
    const prefixStepInfo =
      prefixStep === ''
        ? ''
        : `[prefix-step: ${prefixStep.length} steps ('${prefixStep}')]`;
    if (!isBrowser) {
      if (prefixStepInfo !== '') app.console.warn(`${prefixStepInfo}`);
    }

    const result = solve(levelId, level);

    if (!isBrowser) {
      if (result.replayStr === null) {
        app.console.error(`[LEVEL ${levelId}] ${result.errorMessage}`);
      } else {
        const r = result.replayStr;
        const completedLevelObj = getCompletedLevelObj(r);
        app.console.log(`/* [LEVEL ${levelId}] */ ${completedLevelObj}`);
        if (result.replayStr.length < level.getLevelObj().step) {
          app.console.log('===== New record! =====');
        }
      }
      const endTime = performance.now();
      app.console.info(`[Time: ${msToSecStr(endTime - startTime)}]`);
      if (prefixStepInfo !== '') app.console.warn(`${prefixStepInfo}`);

      process.exitCode = 0;
    }

    return result;

    function solve(levelId, level) {
      const dxs = [0, 1, 0, -1, 0];
      const dys = [-1, 0, 1, 0, 0];

      const userMax = level.getMaxValue(app.states.isUser);

      const completedFlag = level.isCompleted();
      if (completedFlag) {
        app.console.warn('Warning: Completed on start.');
        return { replayStr: '' };
      }

      const shapeStrMap = new Map();
      const stateStrMap = new Map();
      let replayStr = '';
      {
        const stateStr = level.getS();
        stateStrMap.set(stateStr, replayStr);
      }
      let step = 0;
      for (const dirChar of prefixStep) {
        step++;
        const dir = Number(dirChar);
        const dx = dxs[dir];
        const dy = dys[dir];

        const moveFlag = level.move(dx, dy, userMax);
        if (!moveFlag) {
          const errorMessage = 'Error: moveFlag failed on prefix-step.';
          return { replayStr: null, errorMessage };
        }

        const stateStr = level.getS();
        if (stateStrMap.has(stateStr)) {
          app.console.warn('Warning: Same state exists.');
        }

        const completedFlag = level.isCompleted();
        if (completedFlag) {
          const errorMessage = `Error: Completed on prefix-step. (${step} steps)`;
          return { replayStr: null, errorMessage };
        }
        replayStr += dirChar;
        stateStrMap.set(stateStr, replayStr);
      }

      let stateCount = 0;

      let nextStateStrSet = new Set();
      {
        const stateStr = level.getS();
        nextStateStrSet.add(stateStr);
      }

      let solutionNum = 0;
      let solutionStepFirst;
      let solutionStepSecond;
      const shapeStrInfoArray = [];
      const maxDir = level.hasAxis() ? 5 : 4;
      for (; step < maxStep; ) {
        const currentStateStrSet = nextStateStrSet;
        nextStateStrSet = new Set();
        for (const currentStateStr of currentStateStrSet) {
          if (timeLimit !== undefined && ++stateCount % 1000 === 0) {
            const time = performance.now();
            if (time - startTime > timeLimit * 1000) {
              const errorMessage = `Time limit over. [Time: ${msToSecStr(
                time - startTime
              )}] [Time limit: ${msToSecStr(
                Number(timeLimit) * 1000
              )}] [map.size: ${stateStrMap.size}] [step: ${step}]`;
              return { replayStr: null, errorMessage };
            }
          }

          const currentReplyStr = stateStrMap.get(currentStateStr);
          for (let dir = 0; dir < maxDir; ++dir) {
            level.applyStateStr(currentStateStr);

            const dx = dxs[dir];
            const dy = dys[dir];
            const moveFlag = level.move(dx, dy, userMax);
            if (!moveFlag) continue;

            if (options.normalize) level.normalize();
            const stateStr = level.getS();
            if (stateStrMap.has(stateStr)) continue;

            const replayStr = currentReplyStr + dir;
            stateStrMap.set(stateStr, replayStr);

            const completedFlag = level.isCompleted();
            if (completedFlag) {
              if (options.all) {
                solutionNum++;
                switch (solutionNum) {
                  case 1:
                    solutionStepFirst = step + 1;
                    break;
                  case 2:
                    solutionStepSecond = step + 1;
                    break;
                }
                const r = replayStr;
                const prefixStepInfo =
                  prefixStep === ''
                    ? ''
                    : ` [prefix-step: ${prefixStep.length} steps ('${prefixStep}')]`;
                const completedLevelObj = getCompletedLevelObj(r);
                app.console.log(
                  `/* [LEVEL ${levelId}][map.size: ${stateStrMap.size}] */ ${completedLevelObj}${prefixStepInfo}`
                );
                const shapeStr = level
                  .getShapeStr(app.states.isTarget)
                  .replace(/\n$/, '');
                if (!shapeStrMap.has(shapeStr)) {
                  shapeStrInfoArray.push({
                    str: shapeStr,
                    step: step + 1,
                    obj: completedLevelObj,
                  });
                  const shapeId = shapeStrMap.size + 1;
                  shapeStrMap.set(shapeStr, shapeId);
                  if (options.draw) {
                    app.console.info(`/* Target shape #${shapeId}`);
                    app.console.log(shapeStr);
                    app.console.info('*/');
                  }
                } else {
                  if (options.draw) {
                    const shapeId = shapeStrMap.get(shapeStr);
                    app.console.info(`/* Target shape #${shapeId} */`);
                  }
                }
              } else {
                return { replayStr };
              }
            } else {
              nextStateStrSet.add(stateStr);
            }
          }
        }

        if (nextStateStrSet.size === 0) {
          if (options.all) {
            app.console.log('----------------------------------------');
            if (solutionNum > 0) {
              app.console.log(` First solution: ${solutionStepFirst} steps`);
              if (solutionNum > 1) {
                app.console.log(
                  `Second solution: ${solutionStepSecond} steps (+${
                    solutionStepSecond - solutionStepFirst
                  })`
                );
              }
            }

            // 最短ステップの登録情報が間違っているときに気付けるように。
            if (level.getBestStep() !== undefined) {
              if (solutionStepFirst < level.getBestStep()) {
                console.error(
                  `Error: Level-${levelId}. Best step should be ${solutionStepFirst} steps`
                );
              }
            }
            for (const shapeStrInfo of shapeStrInfoArray) {
              app.console.info(`${shapeStrInfo.step} steps`);
              app.console.log(shapeStrInfo.str);
              app.console.log(shapeStrInfo.obj);
            }
            const errorMessage = `${solutionNum} solutions found. [Step: ${step}] [Step limit: ${maxStep}] [Shape variation: ${shapeStrMap.size}]`;
            return { replayStr: null, errorMessage };
          }
          const errorMessage = `No solution. [Step: ${step}] [Step limit: ${maxStep}]`;
          return { replayStr: null, errorMessage };
        }
        step++;
        if (options.console) {
          const time = performance.now();
          app.console.info(
            `// ${step} steps completed. [Time: ${msToSecStr(
              time - startTime
            )}] (+${msToSecStr(time - prevTime)}) [map.size: ${
              stateStrMap.size
            }]`
          );
          prevTime = time;
        }
      }

      const errorMessage = `Step limit over. [Step limit: ${maxStep}]`;
      return { replayStr: null, errorMessage };
    }

    function getCompletedLevelObj(r) {
      const levelObj = level.getLevelObj();
      const w = levelObj.w;
      const h = levelObj.h;
      const s = levelObj.s;
      const subject =
        levelObj.subject !== undefined
          ? `, subject: '${levelObj.subject}'`
          : '';
      const axis = level.hasAxis() ? ` axis: '${level.getA()}',` : '';
      const res = `{ w: ${w}, h: ${h}, s: '${s}',${axis} r: '${r}', step: ${r.length}${subject} },`;
      return res;
    }
  }

  function msToSecStr(ms) {
    return `${(ms / 1000).toFixed(2)} sec.`;
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.solveLevel = solveLevel;
  } else {
    module.exports = solveLevel;
  }
})();
