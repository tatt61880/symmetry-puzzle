(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  console.assert(!isBrowser);

  const program = require('commander');
  program.version('3.0.0').option('--mode <check-mode>', 'check mode');

  program.parse();
  const options = program.opts();

  const app = {};
  app.console = require('./console.js');
  app.states = require('./states.js');
  app.Level = require('./class-level.js');
  app.solveLevel = require('./solve.js');

  process.exitCode = 0;

  let checkMode = null;
  switch (options.mode) {
    case 'line':
      checkMode = app.Level.CHECK_MODE.LINE;
      app.levels = require('./levels-line.js');
      app.levelsEx = require('./levels-line-ex.js');
      checkLevels();
      break;
    case 'point':
      checkMode = app.Level.CHECK_MODE.POINT;
      app.levels = require('./levels-point.js');
      app.levelsEx = require('./levels-point-ex.js');
      checkLevels();
      break;
    case 'special':
      checkMode = app.Level.CHECK_MODE.SPECIAL;
      app.levels = require('./levels-special.js');
      app.levelsEx = require('./levels-special-ex.js');
      checkLevels();
      break;
    default:
      testsOther();
      testsSolve();
  }

  return;
  // -------------------------------------------------------------------------

  function checkLevels() {
    const levelSet = new Set();
    const levels = [];

    for (const idx in app.levels) {
      const levelObj = app.levels[idx];
      const levelId = Number(idx);
      levels.push({ levelId, levelObj });
    }
    for (const levelId in app.levelsEx) {
      const levelObj = app.levelsEx[levelId];
      levels.push({ levelId, levelObj });
    }

    for (const level of levels) {
      const levelId = level.levelId;
      const levelObj = level.levelObj;
      const key = `w=${levelObj.w}, h=${levelObj.h}, s=${levelObj.s}, axis=${levelObj.axis}`;
      if (levelSet.has(key)) {
        app.console.error(`Error: There are same levels. [${key}]`);
        process.exitCode = 1;
        return;
      }
      levelSet.add(key);
      const res = testLevel(levelId, levelObj);
      if (!res) {
        app.console.error('Error: Test failed.');
        process.exitCode = 1;
        return;
      }
    }
  }

  function testLevel(levelId, levelObj) {
    const level = new app.Level({ levelObj, checkMode });

    if (!level.isNormalized()) {
      app.console.error(`Error: ${levelInfo()} isNormalized check failed.`);
      return false;
    }

    if (level.getWidth() < level.getHeight()) {
      app.console.error(`: ${levelInfo()} x < y.`);
      return false;
    }

    const stateStrMap = {};
    const dys = [-1, 0, 1, 0, 0];
    const dxs = [0, 1, 0, -1, 0];
    if (levelObj.r === undefined) {
      app.console.error(`Error: ${levelInfo()} r === undefined.`);
      return false;
    }

    if (levelObj.r.length !== levelObj.step) {
      app.console.error(`Error: ${levelInfo()} Step check failed. step: ${levelObj.step} (r.length = ${levelObj.r.length})`);
      return false;
    }

    let index = 0;
    for (const dirChar of levelObj.r) {
      if (level.isCompleted()) {
        app.console.error(`Error: ${levelInfo()} Completed on the way.`);
        return false;
      }

      index++;
      const dir = Number(dirChar);
      const dx = dxs[dir];
      const dy = dys[dir];

      const moveFlag = level.move(dx, dy);
      if (!moveFlag) {
        app.console.error(`Error: ${levelInfo()} moveFlag failed.`);
        return false;
      }

      const stateStr = level.getS();
      if (stateStrMap[stateStr] !== undefined) {
        app.console.warn(`Warning: ${levelInfo()} Same state exists. [index: ${index}]`);
      }
      stateStrMap[stateStr] = true;
    }

    if (!level.isCompleted()) {
      app.console.error(`Error: ${levelInfo()} Not completed.`);
      return false;
    }
    return true;

    function levelInfo() {
      return `[LEVEL ${levelId}] [subject: ${levelObj.subject}]`;
    }
  }

  function testsOther() {
    if (
      app.states.wall !== -1 ||
      app.states.none !== 0 ||
      app.states.targetMin !== 1 ||
      app.states.targetMax < app.states.targetMin ||
      app.states.otherMin <= app.states.targetMax ||
      app.states.otherMax < app.states.otherMin ||
      app.states.userMin <= app.states.otherMax ||
      app.states.userMax < app.states.userMin
    ) {
      app.console.error('Error: Invalid states setting.');
      process.exitCode = 1;
    }
  }

  function testsSolve() {
    {
      const levelObj = {
        w: 5,
        h: 3,
        s: 's0001-00211',
      };
      const checkMode = app.Level.CHECK_MODE.LINE;
      const level = new app.Level({ levelObj, checkMode });
      const result = app.solveLevel('Test-2', level, {
        maxStep: 1000,
        timeLimit: 10,
      });
      if (result.replayStr !== '1123211') {
        app.console.error(`Error: Unexpected solve function's result. result.replayStr = ${result.replayStr}`);
        process.exitCode = 1;
      }
    }
    {
      const levelObj = {
        w: 5,
        h: 3,
        s: 's001-00211',
      };
      const checkMode = app.Level.CHECK_MODE.POINT;
      const level = new app.Level({ levelObj, checkMode });
      const result = app.solveLevel('Test-1', level, {
        maxStep: 1000,
        timeLimit: 10,
      });
      if (result.replayStr !== '12210') {
        app.console.error(`Error: Unexpected solve function's result. result.replayStr = ${result.replayStr}`);
        process.exitCode = 1;
      }
    }
  }
})();
