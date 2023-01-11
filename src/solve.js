(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  let options;
  if (isBrowser) {
    app = window.app;
    app.console = console;
    if (app?.states === undefined) app.console.error('app.states is undefined.');
    if (app?.Level === undefined) app.console.error('app.Level is undefined.');
    options = {
      prefix: '',
      time: 10, // 時間制限を10秒に設定。
      max: undefined,
    };
    window.process = {
      exitCode: 0,
    };
  } else {
    app.console = require('./console.js');
    app.states = require('./states.js');
    app.levelsPoint = require('./levels-point.js');
    app.levelsPointEx = require('./levels-point-ex.js');
    app.levelsReflection = require('./levels-reflection.js');
    app.levelsReflectionEx = require('./levels-reflection-ex.js');
    app.Level = require('./class-level.js');

    const program = require('commander');
    program
      .version('2.2.0')
      .option('-i, --id <id>', 'id of level')
      .option('-a, --all', 'list up all solutions')
      .option('-c, --console', 'console.info step')
      .option('-w, --w <w>', 'levelObj.w')
      .option('-h, --h <h>', 'levelObj.h')
      .option('-s, --s <s>', 'levelObj.s')
      .option('-r, --reflection', 'reflection symmetry mode')
      .option('-n, --normalize', 'normalize state')
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
      app.console.error('Error: invalid step. chars in step should be 0-3.');
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
    const w = Number(options.w);
    const h = Number(options.h);
    const s = options.s;
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
    const levelObj = { w, h, s };
    solveLevelObj(null, levelObj);
  }

  function solveLevelObj(levelId, levelObj) {
    if (levelObj === undefined) {
      app.console.error(`Error: [LEVEL ${levelId}] levelObj === undefined`);
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
      app.console.error(`Error: [LEVEL ${levelId}] maxStep is NaN. maxStep === ${maxStep}`);
      process.exitCode = 1;
      return;
    }

    const prefixStepInfo = prefixStep === '' ? '' : `[prefix-step: ${prefixStep.length} steps ('${prefixStep}')]`;
    if (!isBrowser) {
      if (prefixStepInfo !== '') app.console.warn(`${prefixStepInfo}`);
    }
    const result = solveLevel(levelId, levelObj);

    if (!isBrowser) {
      if (result.replayStr === null) {
        app.console.error(`[LEVEL ${levelId}] ${result.errorMessage}`);
      } else {
        const r = result.replayStr;
        const completedLevelObj = getCompletedLevelObj(r);
        app.console.log(`/* [LEVEL ${levelId}] */ ${completedLevelObj}`);
        if (result.replayStr.length < levelObj.step) {
          app.console.log('===== New record! =====');
        }
      }
      const endTime = performance.now();
      app.console.info(`[Time: ${msToSecStr(endTime - startTime)}]`);
      if (prefixStepInfo !== '') app.console.warn(`${prefixStepInfo}`);

      process.exitCode = 0;
    }

    return result;

    function solveLevel(levelId, levelObj) {
      const level = new app.Level();
      if (options.reflection) {
        level.setCheckMode(app.Level.CHECK_MODE.REFLECTION);
      } else {
        level.setCheckMode(app.Level.CHECK_MODE.POINT);
      }
      level.applyObj(levelObj, { init: true });

      const dxs = [0, 1, 0, -1];
      const dys = [-1, 0, 1, 0];
      let step = 0;
      const stateStrMap = new Map;

      const completedFlag = level.isCompleted();
      if (completedFlag) {
        app.console.warn('Warning: Completed on start.');
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
          app.console.warn('Warning: Same state exists.');
        }

        const completedFlag = level.isCompleted();
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
              const errorMessage = `Time limit over. [Time: ${msToSecStr(time - startTime)}] [Time limit: ${msToSecStr(Number(options.time) * 1000)}] [map.size: ${stateStrMap.size}]`;
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

            if (options.normalize) level.normalize();
            const stateStr = level.getStateStr();
            if (stateStrMap.has(stateStr)) continue;

            const replayStr = currentReplyStr + dir;
            stateStrMap.set(stateStr, replayStr);

            const completedFlag = level.isCompleted();
            if (completedFlag) {
              if (options.all) {
                solutionNum++;
                const r = replayStr;
                const prefixStepInfo = prefixStep === '' ? '' : ` [prefix-step: ${prefixStep.length} steps ('${prefixStep}')]`;
                const completedLevelObj = getCompletedLevelObj(r);
                app.console.log(`/* [LEVEL ${levelId}] */ ${completedLevelObj}${prefixStepInfo}`);
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
          app.console.info(`${step} steps completed. [Time: ${msToSecStr(time - startTime)}] (+${msToSecStr(time - prevTime)}) [map.size: ${stateStrMap.size}]`);
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
