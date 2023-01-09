(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  let options;
  if (isBrowser) {
    app = window.app;
    if (app?.states === undefined) consoleError('app.states is undefined.');
    if (app?.Level === undefined) consoleError('app.Level is undefined.');
    options = {
      prefix: '',
      time: 10, // 時間制限を10秒に設定。
      max: undefined,
    };
    window.process = {
      exitCode: 0,
    };
  } else {
    app.states = require('./states.js');
    app.levelsPoint = require('./levels-point.js');
    app.levelsPointEx = require('./levels-point-ex.js');
    app.levelsReflection = require('./levels-reflection.js');
    app.levelsReflectionEx = require('./levels-reflection-ex.js');
    app.Level = require('./class-level.js');

    const program = require('commander');
    program
      .version('2.0.0')
      .option('-i, --id <id>', 'id of level')
      .option('-a, --all', 'list up all solutions')
      .option('-c, --console', 'consoleLog step')
      .option('-w, --w <w>', 'levelObj.w')
      .option('-h, --h <h>', 'levelObj.h')
      .option('-s, --s <s>', 'levelObj.s')
      .option('-r, --reflection', 'reflection symmetry mode')
      .option('-m, --max <max-step>', 'max step')
      .option('-p, --prefix <prefix-step>', 'prefix step')
      .option('-t, --time <time-limit>', 'time limit');

    program.parse();
    options = program.opts();
  }

  const prefixStep = options.prefix !== undefined ? options.prefix : '';
  if (prefixStep !== '') {
    for (const c of prefixStep) {
      if (c === '0') continue;
      if (c === '1') continue;
      if (c === '2') continue;
      if (c === '3') continue;
      consoleError('Error: invalid step. chars in step should be 0-3.');
      process.exitCode = 1;
      return;
    }
  }

  const levelId = options.id;
  if (isBrowser) {
    1;
  } else if (levelId !== undefined) {
    const levels = {};
    const levelsList = options.reflection ? app.levelsReflection : app.levelsPoint;
    const levelsExList = options.reflection ? app.levelsReflectionEx : app.levelsPointEx;

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
        solveLevelObj(levelId, levelObj, options.reflection);
      }
    } else {
      const levelObj = levels[levelId];
      solveLevelObj(levelId, levelObj, options.reflection);
    }
  } else {
    if (options.w === undefined) {
      consoleError('Error: w === undefined');
      process.exitCode = 1;
      return;
    }
    if (options.h === undefined) {
      consoleError('Error: h === undefined');
      process.exitCode = 1;
      return;
    }
    if (options.s === undefined) {
      consoleError('Error: s === undefined');
      process.exitCode = 1;
      return;
    }
    const w = Number(options.w);
    const h = Number(options.h);
    const s = options.s;
    if (isNaN(w)) {
      consoleError('Error: w is NaN');
      process.exitCode = 1;
      return;
    }
    if (isNaN(h)) {
      consoleError('Error: h is NaN');
      process.exitCode = 1;
      return;
    }
    const levelObj = { w, h, s };
    solveLevelObj(null, levelObj, options.reflection);
  }

  function solveLevelObj(levelId, levelObj, isReflectionMode) {
    if (levelObj === undefined) {
      consoleError(`Error: [LEVEL ${levelId}] levelObj === undefined`);
      process.exitCode = 1;
      return;
    }

    const startTime = performance.now();
    let prevTime = startTime;

    const maxStep = (() => {
      let res = options.max;
      if (res === undefined) {
        res = levelObj.step;
      }
      if (res === undefined) {
        res = 1000;
      }
      return res;
    })();

    if (isNaN(maxStep)) {
      consoleError(`Error: [LEVEL ${levelId}] maxStep is NaN. maxStep === ${maxStep}`);
      process.exitCode = 1;
      return;
    }

    const prefixStepInfo = prefixStep === '' ? '' : `[prefix-step: ${prefixStep.length} steps ('${prefixStep}')]`;
    if (!isBrowser) {
      if (prefixStepInfo !== '') consoleWarn(`${prefixStepInfo}`);
    }
    const result = solveLevel(levelId, levelObj, isReflectionMode);

    if (!isBrowser) {
      if (result.replayStr === null) {
        consoleError(`[LEVEL ${levelId}] ${result.errorMessage}`);
      } else {
        const r = result.replayStr;
        const completedLevelObj = getCompletedLevelObj(r);
        consoleLog(`/* [LEVEL ${levelId}] */ ${completedLevelObj}`);
        if (result.replayStr.length < levelObj.step) {
          consoleLog('===== New record! =====');
        }
      }
      const endTime = performance.now();
      consoleInfo(`[Time: ${msToSecStr(endTime - startTime)}]`);
      if (prefixStepInfo !== '') consoleWarn(`${prefixStepInfo}`);

      process.exitCode = 0;
    }

    return result;

    function solveLevel(levelId, levelObj, isReflectionMode) {
      const level = new app.Level();
      level.applyObj(levelObj, { init: true });

      const dxs = [0, 1, 0, -1];
      const dys = [-1, 0, 1, 0];
      let step = 0;
      const stateStrMap = new Map;

      const completedFlag = isCompletedPoint(level, isReflectionMode);
      if (completedFlag) {
        consoleWarn('Warning: Completed on start.');
        return { replayStr: '' };
      }

      let dirs = '';
      {
        const stateStr = level.getStateStr();
        stateStrMap.set(stateStr, dirs);
      }
      for (const dirChar of prefixStep) {
        step++;
        const dir = Number(dirChar);
        const dx = dxs[dir];
        const dy = dys[dir];

        const moveFlag = level.updateMoveFlags(dx, dy);
        if (!moveFlag) {
          const errorMessage = 'Error: moveFlag failed on prefix-step.';
          return { replayStr: null, errorMessage };
        }

        level.move();
        const stateStr = level.getStateStr();
        if (stateStrMap.has(stateStr)) {
          consoleWarn('Warning: Same state exists.');
        }

        const completedFlag = isCompletedPoint(level, isReflectionMode);
        if (completedFlag) {
          const errorMessage = `Error: Completed on prefix-step. (${step} steps)`;
          return { replayStr: null, errorMessage };
        }
        dirs += dirChar;
        stateStrMap.set(stateStr, dirs);
      }

      let stateCount = 0;

      let nextStateStrSet = new Set;
      {
        const stateStr = level.getStateStr();
        nextStateStrSet.add(stateStr);
      }

      let solutionNum = 0;
      for (; step < maxStep;) {
        const currentStateStrSet = nextStateStrSet;
        nextStateStrSet = new Set;
        for (const currentStateStr of currentStateStrSet) {
          if (options.time !== undefined && ++stateCount % 10000 === 0) {
            const time = performance.now();
            if (time - startTime > options.time * 1000) {
              const errorMessage = `Time limit over. [Time: ${msToSecStr(time - startTime)}] [Time limit: ${msToSecStr(Number(options.time) * 1000)}] [State count: ${stateCount}]`;
              return { replayStr: null, errorMessage };
            }
          }

          const currentReplyStr = stateStrMap.get(currentStateStr);
          for (let dir = 0; dir < 4; ++dir) {
            level.applyStateStr(currentStateStr);

            const dx = dxs[dir];
            const dy = dys[dir];
            const moveFlag = level.updateMoveFlags(dx, dy);
            if (!moveFlag) continue;

            level.move();

            const stateStr = level.getStateStr();
            if (stateStrMap.has(stateStr)) continue;

            const replayStr = currentReplyStr + dir;
            stateStrMap.set(stateStr, replayStr);

            const completedFlag = isCompletedPoint(level, isReflectionMode);
            if (completedFlag) {
              if (options.all) {
                solutionNum++;
                const r = replayStr;
                const prefixStepInfo = prefixStep === '' ? '' : ` [prefix-step: ${prefixStep.length} steps ('${prefixStep}')]`;
                const completedLevelObj = getCompletedLevelObj(r);
                consoleLog(`/* [LEVEL ${levelId}] */ ${completedLevelObj}${prefixStepInfo}`);
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
            const errorMessage = `${solutionNum} solutions found. [Step: ${step}] [Step limit: ${maxStep}]`;
            return { replayStr: null, errorMessage };
          }
          const errorMessage = `No solution. [Step: ${step}] [Step limit: ${maxStep}]`;
          return { replayStr: null, errorMessage };
        }
        step++;
        if (options.console) {
          const time = performance.now();
          consoleInfo(`${step} steps completed. [Time: ${msToSecStr(time - startTime)}] (+${msToSecStr(time - prevTime)})`);
          prevTime = time;
        }
      }

      const errorMessage = `Step limit over. [Step limit: ${maxStep}]`;
      return { replayStr: null, errorMessage };
    }

    function getCompletedLevelObj(r) {
      const w = levelObj.w;
      const h = levelObj.h;
      const s = levelObj.s;
      const subject = levelObj.subject !== undefined ? `, subject: '${levelObj.subject}'` : '';
      const res = `{ w: ${w}, h: ${h}, s: '${s}', r: '${r}', step: ${r.length}${subject} },`;
      return res;
    }
  }

  function isCompletedPoint(level, isReflectionMode) {
    if (isReflectionMode) {
      return level.isCompletedReflection();
    } else {
      return level.isCompletedPoint();
    }
  }

  function consoleLog(message) {
    console.log(message);
  }

  function consoleInfo(message) {
    if (isBrowser) {
      console.info(message);
    } else {
      for (const line of message.split('\n')) {
        console.info(`\x1b[38;2;120;120;120m${line}\x1b[0m`);
      }
    }
  }

  function consoleWarn(message) {
    if (isBrowser) {
      console.warn(message);
    } else {
      for (const line of message.split('\n')) {
        console.warn(`\x1b[38;2;200;200;0m${line}\x1b[0m`);
      }
    }
  }

  function consoleError(message) {
    if (isBrowser) {
      console.error(message);
    } else {
      for (const line of message.split('\n')) {
        console.error(`\x1b[38;2;200;0;0m${line}\x1b[0m`);
      }
    }
  }

  function msToSecStr(ms) {
    return `${(ms / 1000).toFixed(2)} sec.`;
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.solveLevelObj = solveLevelObj;
  } else {
    module.exports = solveLevelObj;
  }
})();
