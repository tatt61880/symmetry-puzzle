(function () {
  'use strict';

  const isBrowser = typeof window !== 'undefined';

  let app = {};
  let options;
  if (isBrowser) {
    app = window.app;
    if (app?.states === undefined) console.error('app.states is undefined.');
    if (app?.levels === undefined) console.error('app.levels is undefined.');
    if (app?.levelsEx === undefined) console.error('app.levelsEx is undefined.');
    if (app?.Level === undefined) console.error('app.Level is undefined.');
    options = {
      prefix: '',
      time: 10, // 時間制限を10秒に設定。
    };
    window.process = {
      exitCode: 0,
    };
  } else {
    app.states = require('./states.js');
    app.levels = require('./levels.js');
    app.levelsEx = require('./levels-ex.js');
    app.Level = require('./class-level.js');

    const program = require('commander');
    program
      .version('1.4.0')
      .option('-c, --console', 'console.log step')
      .option('-i, --id <id>', 'id of level')
      .option('-w, --w <w>', 'levelObj.w')
      .option('-h, --h <h>', 'levelObj.h')
      .option('-s, --s <s>', 'levelObj.s')
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
      console.error('Error: invalid step. chars in step should be 0-3.');
      process.exitCode = 1;
      return;
    }
  }

  const levelId = options.id;
  if (isBrowser) {
    1;
  } else if (levelId !== undefined) {
    const levels = {};

    for (const levelId in app.levels) {
      const levelObj = app.levels[levelId];
      levels[levelId] = levelObj;
    }
    for (const levelId in app.levelsEx) {
      const levelObj = app.levelsEx[levelId];
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
  } else {
    if (options.w === undefined) {
      console.error('Error: w === undefined');
      process.exitCode = 1;
      return;
    }
    if (options.h === undefined) {
      console.error('Error: h === undefined');
      process.exitCode = 1;
      return;
    }
    if (options.s === undefined) {
      console.error('Error: s === undefined');
      process.exitCode = 1;
      return;
    }
    const w = Number(options.w);
    const h = Number(options.h);
    const s = options.s;
    if (isNaN(w)) {
      console.error('Error: w is NaN');
      process.exitCode = 1;
      return;
    }
    if (isNaN(h)) {
      console.error('Error: h is NaN');
      process.exitCode = 1;
      return;
    }
    const levelObj = { w, h, s };
    solveLevelObj(null, levelObj);
  }

  function solveLevelObj(levelId, levelObj) {
    const startTime = performance.now();
    let prevTime = startTime;
    if (levelObj === undefined) {
      console.error(`Error: [LEVEL ${levelId}] levelObj === undefined`);
      process.exitCode = 1;
      return;
    }
    const maxStep = options.max !== undefined ? options.max : levelObj.step;

    const replayStr = solveLevel(levelId, levelObj);

    if (replayStr === null) {
      console.warn(`No solution. [maxStep = ${maxStep}]`);
    }
    if (!isBrowser) {
      if (replayStr !== null) {
        if (replayStr.length < levelObj.step) {
          console.log('===== New record! =====');
        }
        const prefixStepInfo = prefixStep === '' ? '' : ` [prefix-step: ${prefixStep.length} steps (${prefixStep})]`;
        console.log(`[LEVEL ${levelId}] ${replayStr.length} steps: ${replayStr}${prefixStepInfo}`);
      }
      const endTime = performance.now();
      console.log(`Time: ${Math.floor(endTime - startTime)} msec`);
      process.exitCode = 0;
    }

    return replayStr;

    function solveLevel(levelId, levelObj) {
      const level = new app.Level();
      level.applyObj(levelObj, { init: true });

      const dxs = [0, 1, 0, -1];
      const dys = [-1, 0, 1, 0];
      let step = 0;
      const stateStrMap = new Map;

      const completedFlag = level.isCompleted();
      if (completedFlag) {
        console.error('Warning: Completed on start.');
        return false;
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
          console.error('Error: moveFlag failed.');
          return false;
        }

        level.move();
        const stateStr = level.getStateStr();
        if (stateStrMap.has(stateStr)) {
          console.warn('Warning: Same state exists.');
        }

        const completedFlag = level.isCompleted();
        if (completedFlag) {
          console.error('Error: Completed on prefix-step.');
          return false;
        }
        dirs += dirChar;
        stateStrMap.set(stateStr, dirs);
      }

      let count = 0;

      let nextStateStrSet = new Set;
      {
        const stateStr = level.getStateStr();
        nextStateStrSet.add(stateStr);
      }

      for (; step < maxStep; ++step) {
        if (options.console) {
          const time = performance.now();
          const timeStr = ((time - startTime) / 1000).toFixed(2);
          const diffTimeStr = ((time - prevTime) / 1000).toFixed(2);
          console.log(`${step} steps. [Time: ${timeStr} sec. (+${diffTimeStr} sec.)]`);
          prevTime = time;
        }
        const currentStateStrSet = nextStateStrSet;
        nextStateStrSet = new Set;
        for (const currentStateStr of currentStateStrSet) {
          if (options.time !== undefined && ++count % 10000 === 0) {
            const time = performance.now();
            if (time - startTime > options.time * 1000) {
              console.error(`[LEVEL ${levelId}] TLE (count = ${count / 1000} K)`);
              return;
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
            if (!stateStrMap.has(stateStr)) {
              const replayStr = currentReplyStr + dir;
              stateStrMap.set(stateStr, replayStr);
              nextStateStrSet.add(stateStr);

              const completedFlag = level.isCompleted();
              if (completedFlag) {
                return replayStr;
              }
            }
          }
        }
      }

      return null;
    }
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.solveLevelObj = solveLevelObj;
  } else {
    module.exports = solveLevelObj;
  }
})();
