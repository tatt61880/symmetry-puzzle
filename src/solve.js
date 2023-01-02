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
    .requiredOption('-i, --id <id>', 'id of level')
    .option('-m, --max <max-step>', 'max step')
    .option('-p, --prefix <prefix-step>', 'prefix step')
    .option('-t, --time <time-limit>', 'time limit');

  program.parse();

  const levels = {};

  for (const levelId in app.levels) {
    const levelObj = app.levels[levelId];
    levels[levelId] = levelObj;
  }
  for (const levelId in app.levelsEx) {
    const levelObj = app.levelsEx[levelId];
    levels[levelId] = levelObj;
  }

  const options = program.opts();
  const levelId = options.id;

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

  if (levelId === 'all') {
    for (const levelId in levels) {
      if (levelId === '0') continue;
      solve(levelId);
    }
  } else {
    solve(levelId);
  }

  function solve(levelId) {
    const startTime = performance.now();
    const levelObj = levels[levelId];
    if (levelObj === undefined) {
      console.error(`Error: [LEVEL ${levelId}] levelObj === undefined`);
      process.exitCode = 1;
      return;
    }
    let maxStep = options.max !== undefined ? options.max : levelObj.step; // ※途中により短い解が見つかり次第、更新する値です。

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
      const w = level.getW();
      const h = level.getH();

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

        const s = level.getStateStr();
        undoInfo.pushData({
          dir,
          w,
          h,
          s,
        });
        level.move();

        const stateStr = level.getStateStr();
        if (stateStrMap.has(stateStr)) {
          console.warn('Warning: Same state exists.');
        }

        const clearFlag = level.isCompleted();
        if (clearFlag) {
          console.error('Error: Cleared on prefix-step.');
          return false;
        }
        stateStrMap.set(stateStr, step);
      }

      let solveStep = null;
      let count = 0;
      let isTle = false;
      dfs();

      if (solveStep !== null) {
        if (solveStep < levelObj.step) {
          console.log('===== New record! =====');
        }
      }

      function dfs() {
        if (step >= maxStep) return;

        if (options.time !== undefined && ++count % 10000 === 0) {
          const time = performance.now();
          if (time - startTime > options.time * 1000) {
            isTle = true;
            console.error(`[LEVEL ${levelId}] TLE (count = ${count / 1000} K)`);
            return;
          }
        }

        step++;
        for (let dir = 0; dir < 4; ++dir) {
          const dx = dxs[dir];
          const dy = dys[dir];
          const moveFlag = level.updateMoveFlags(dx, dy);
          if (!moveFlag) continue;

          const s = level.getStateStr();
          undoInfo.pushData({
            dir,
            w,
            h,
            s,
          });
          level.move();

          const stateStr = level.getStateStr();
          if (!stateStrMap.has(stateStr) || step < stateStrMap.get(stateStr)) {
            stateStrMap.set(stateStr, step);

            const clearFlag = level.isCompleted();
            if (clearFlag) {
              const replayStr = undoInfo.getReplayStr();
              console.log(`[LEVEL ${levelId}] ${step} steps: ${replayStr}`);
              solveStep = step;
              maxStep = step - 1;
            }
            dfs();
            if (isTle) return false;
          }
          const levelObj = undoInfo.undo();
          level.applyObj(levelObj, { init: false });
        }
        step--;
      }
      return true;
    }
  }
})();
