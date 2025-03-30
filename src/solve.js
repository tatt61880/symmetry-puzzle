(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  let options;

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
    app.Levels = require('./class-levels.js');
    app.Savedata = require('./class-savedata.js');

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
      .option('-t, --time <time-limit>', 'time limit', Number)
      .option('--backup', 'create backup');

    program.parse();
    options = program.opts();
  }

  let savedata;
  if (!isBrowser) {
    savedata = new app.Savedata();
  }

  const levelId = options.id;
  if (isBrowser) {
    1;
  } else if (levelId !== undefined) {
    const checkModes = [];

    switch (options.mode) {
      case 'line':
        checkModes.push(app.Level.CHECK_MODE.LINE);
        break;
      case 'point':
        checkModes.push(app.Level.CHECK_MODE.POINT);
        break;
      case 'special':
        checkModes.push(app.Level.CHECK_MODE.SPECIAL);
        break;
      case 'all':
        checkModes.push(app.Level.CHECK_MODE.LINE);
        checkModes.push(app.Level.CHECK_MODE.POINT);
        checkModes.push(app.Level.CHECK_MODE.SPECIAL);
        break;
    }

    for (const checkMode of checkModes) {
      let levelsList;
      let levelsListEx;
      switch (checkMode) {
        case app.Level.CHECK_MODE.LINE:
          levelsList = app.levelsLine;
          levelsListEx = app.levelsLineEx;
          break;
        case app.Level.CHECK_MODE.POINT:
          levelsList = app.levelsPoint;
          levelsListEx = app.levelsPointEx;
          break;
        case app.Level.CHECK_MODE.SPECIAL:
          levelsList = app.levelsSpecial;
          levelsListEx = app.levelsSpecialEx;
          break;
        default:
          app.console.error('mode error');
          return;
      }

      const levels = new app.Levels({ levelsList, levelsListEx });

      if (levelId === 'all') {
        const allLevels = levels.getAllLevels();
        for (const { levelId, levelObj } of allLevels) {
          if (levelId === 0) continue;
          solveLevelObj(levelId, levelObj, checkMode);
        }
      } else {
        const levelObj = levels.getLevelObj(levelId);
        solveLevelObj(levelId, levelObj, checkMode);
      }
    }
  } else if (options.w === undefined) {
    // test.js から呼ぶとここを通ります。
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

    let checkMode = null;

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

    solveLevelObj(null, levelObj, checkMode);
  }

  if (!isBrowser) {
    if (options.backup) {
      savedata.saveLang('ja');
      const yyyymmdd = getYyyymmdd();

      const data = {
        yyyymmdd,
        backupData: savedata.getBackupData(),
      };

      const savedataText = JSON.stringify(data);

      const fs = require('fs');
      fs.writeFileSync(`symmetry-puzzle-solve-${yyyymmdd}.json`, savedataText);
    }
  }

  function getYyyymmdd() {
    const yyyymmdd = (() => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + month + day;
    })();
    return yyyymmdd;
  }

  function solveLevelObj(levelId, levelObj, checkMode) {
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
      app.console.error(`Error: [LEVEL ${levelId}] maxStep is NaN. maxStep === ${maxStep}`);
      process.exitCode = 1;
      return;
    }

    const prefixStep = options.prefixStep;
    const timeLimit = options.time;

    solveLevel(levelId, level, { maxStep, timeLimit, prefixStep });
  }

  function solveLevel(levelId, level, { maxStep = 1000, timeLimit, prefixStep = '' }) {
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
    const prefixStepInfo = prefixStep === '' ? '' : `[prefix-step: ${prefixStep.length} steps ('${prefixStep}')]`;
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
        const completedLevelObjStr = levelObjToStr(completedLevelObj);
        app.console.log(`/* [LEVEL ${levelId}] */ ${completedLevelObjStr}`);
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
              const errorMessage = `Time limit over. [Time: ${msToSecStr(time - startTime)}] [Time limit: ${msToSecStr(
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
                const prefixStepInfo = prefixStep === '' ? '' : ` [prefix-step: ${prefixStep.length} steps ('${prefixStep}')]`;
                const completedLevelObj = getCompletedLevelObj(r);
                const completedLevelObjStr = levelObjToStr(completedLevelObj);
                app.console.log(`/* [LEVEL ${levelId}][map.size: ${stateStrMap.size}] */ ${completedLevelObjStr}${prefixStepInfo}`);
                const shapeStr = level.getShapeStr(app.states.isTarget).replace(/\n$/, '');
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

                  if (options.backup) {
                    if (shapeStrMap.size === 1) {
                      // ステップデータを記録
                      savedata.saveSteps(level, replayStr);
                    }

                    // 形状データを記録
                    const shape = level.getTargetShapeForSavedata();
                    savedata.saveShape(level, shape, replayStr);
                  }
                } else {
                  if (options.draw) {
                    const shapeId = shapeStrMap.get(shapeStr);
                    app.console.info(`/* Target shape #${shapeId} */`);
                  }
                }
              } else {
                if (options.backup) {
                  // ステップデータを記録
                  savedata.saveSteps(level, replayStr);

                  // 形状データを記録
                  const shape = level.getTargetShapeForSavedata();
                  savedata.saveShape(level, shape, replayStr);
                }
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
                app.console.log(`Second solution: ${solutionStepSecond} steps (+${solutionStepSecond - solutionStepFirst})`);
              }
            }

            // 最短ステップの登録情報が間違っているときに気付けるように。
            if (level.getBestStep() !== undefined) {
              if (solutionStepFirst < level.getBestStep()) {
                console.error(`Error: Level-${levelId}. Best step should be ${solutionStepFirst} steps`);
              }
            }

            const shapes = shapeStrMap.size;
            for (const shapeStrInfo of shapeStrInfoArray) {
              shapeStrInfo.obj.shapes = shapes;
              app.console.info(`${shapeStrInfo.step} steps`);
              app.console.log(shapeStrInfo.str);
              app.console.log(levelObjToStr(shapeStrInfo.obj));
            }

            const levelShapes = level.getShapes();
            if (level.getR() !== undefined && shapes !== levelShapes) {
              app.console.error(`       ↓[level.getShapes(): ${levelShapes}] !== [Shapes: ${shapes}]`);
            }

            // エラーではないですが、目立つようにエラー扱いします。
            const errorMessage = `${solutionNum} solutions found. [Step: ${step}] [Shapes: ${shapes}] [map.size: ${stateStrMap.size}]`;
            return { replayStr: null, errorMessage };
          }
          const errorMessage = `No solution. [Step: ${step}]`;
          return { replayStr: null, errorMessage };
        }
        step++;
        if (options.console) {
          const time = performance.now();
          app.console.info(
            `// ${step} steps completed. [Time: ${msToSecStr(time - startTime)}] (+${msToSecStr(time - prevTime)}) [map.size: ${
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
      const levelObj = structuredClone(level.getLevelObj());
      levelObj.r = r;
      return levelObj;
    }

    function levelObjToStr(levelObj) {
      const w = levelObj.w;
      const h = levelObj.h;
      const s = levelObj.s;
      const r = levelObj.r;
      const axis = level.hasAxis() ? ` axis: '${level.getA()}',` : '';
      const subject = levelObj.subject !== undefined ? `, subject: '${levelObj.subject}'` : '';
      const shapes = levelObj.shapes ? `, shapes: ${levelObj.shapes}` : '';
      const res = `{ w: ${w}, h: ${h}, s: '${s}',${axis} r: '${r}', step: ${r.length}${subject}${shapes} },`;
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
