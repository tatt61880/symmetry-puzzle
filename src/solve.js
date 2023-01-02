(function () {
  'use strict';

  const { performance } = require('perf_hooks');

  const app = {};
  app.states = require('./states.js');
  app.levels = require('./levels.js');
  app.levelsEx = require('./levels-ex.js');
  app.Level = require('./class-level.js');
  app.UndoInfo = require('./class-undo-info.js');

  const program = require('commander');
  program
    .version('1.1.0')
    .requiredOption('-i, --id <id>', 'Level id')
    .option('-m, --max <max step>', 'Max step')
    .option('-s, --step <step>', 'Step for prefix');

  program.parse();
  const options = program.opts();

  const levelId = options.id;

  const startTime = performance.now();

  const levels = {};

  for (const levelId in app.levels) {
    const levelObj = app.levels[levelId];
    levels[levelId] = levelObj;
  }
  for (const levelId in app.levelsEx) {
    const levelObj = app.levelsEx[levelId];
    levels[levelId] = levelObj;
  }

  const levelObj = levels[levelId];
  let maxStep = options.max !== undefined ? options.max : levelObj.step; // ※途中により短い解が見つかり次第、更新する値です。
  const prefixStep = options.step !== undefined ? options.step : '';
  solveLevel(levelId, levelObj);

  const endTime = performance.now();
  console.log(`Time: ${Math.floor(endTime - startTime)} msec`);

  process.exitCode = 0;
  return;

  function solveLevel(levelId, levelObj) {
    const level = new app.Level();
    level.applyObj(levelObj, { init: true });

    const dxs = [0, 1, 0, -1];
    const dys = [-1, 0, 1, 0];
    let step = 0;
    const undoInfo = new app.UndoInfo();
    const stateStrMap = new Map;

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
      const clearFlag = isClear(level);
      if (clearFlag) {
        console.error('Error: Cleared on the way.');
        return false;
      }

      undoInfo.pushData({
        dir,
        w: level.getW(),
        h: level.getH(),
        s: level.getStateStr(),
      });
      level.move();

      const stateStr = level.getStateStr();
      if (stateStrMap.has(stateStr)) {
        console.warn('Warning: Same state exists.');
      }
      stateStrMap.set(stateStr, step);
    }
    let solveStep = null;
    dfs();
    if (solveStep !== null) {
      if (solveStep < levelObj.step) {
        console.log('===== New record! =====');
      } else if (solveStep === levelObj.step) {
        console.log('Same steps.');
      }
    }

    function dfs() {
      if (step >= maxStep) return;
      step++;
      for (let dir = 0; dir < 4; ++dir) {
        const dx = dxs[dir];
        const dy = dys[dir];
        const moveFlag = level.updateMoveFlags(dx, dy);
        if (!moveFlag) continue;

        undoInfo.pushData({
          dir,
          w: level.getW(),
          h: level.getH(),
          s: level.getStateStr(),
        });
        level.move();

        const stateStr = level.getStateStr();
        if (!stateStrMap.has(stateStr) || step < stateStrMap.get(stateStr)) {
          stateStrMap.set(stateStr, step);
          const clearFlag = isClear(level);
          if (clearFlag) {
            const replayStr = undoInfo.getReplayStr();
            console.log(`${step} steps: ${replayStr}`);
            solveStep = step;
            maxStep = step - 1;
          }
          dfs();
        }
        const levelObj = undoInfo.undo();
        level.applyObj(levelObj, { init: false });
      }
      step--;
    }
    return true;
  }

  function isClear(level) {
    const isConnected = level.isConnected(app.states.isTarget);
    const center = level.getRotateCenter(app.states.isTarget);
    const clearFlag = isConnected && center !== null;
    return clearFlag;
  }
})();
