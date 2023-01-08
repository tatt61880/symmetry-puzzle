(function () {
  'use strict';

  const app = {};
  app.states = require('./states.js');
  app.Level = require('./class-level.js');

  const program = require('commander');
  program
    .version('2.1.0')
    .option('-p, --point', 'point symmetry mode')
    .option('-r, --reflection', 'reflection symmetry mode');

  program.parse();
  const options = program.opts();

  process.exitCode = 0;

  if (options.point) {
    // 点対称
    app.levels = require('./levels-point.js');
    app.levelsEx = require('./levels-point-ex.js');
    checkLevels();
  } else if (options.reflection) {
    // 線対称
    app.levels = require('./levels-reflection.js');
    app.levelsEx = require('./levels-reflection-ex.js');
    checkLevels();
  } else {
    // その他
    if (app.states.wall !== -1
      || app.states.none !== 0
      || app.states.targetMin !== 1
      || app.states.targetMax < app.states.targetMin
      || app.states.otherMin <= app.states.targetMax
      || app.states.otherMax < app.states.otherMin
      || app.states.userMin <= app.states.otherMax
      || app.states.userMax < app.states.userMin
    ) {
      console.error('Error: Invalid states setting.');
      process.exitCode = 1;
    }
  }

  return;

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
      levelSet.add(`${levelObj.w},${levelObj.h},${levelObj.s}`);
      const res = testLevel(levelId, levelObj);
      if (!res) {
        console.error('Error: Test failed.');
        process.exitCode = 1;
        return;
      }
    }

    if (levelSet.size !== app.levels.length + Object.keys(app.levelsEx).length) {
      console.error('Error: There are same levels.');
      process.exitCode = 1;
      return;
    }
  }

  function testLevel(levelId, levelObj) {
    const level = new app.Level();
    level.applyObj(levelObj, { init: true });

    if (!level.isNormalized()) {
      console.error(`Error: ${levelInfo()} isNormalized check failed.`);
      return false;
    }

    const stateStrMap = {};
    const dys = [-1, 0, 1, 0];
    const dxs = [0, 1, 0, -1];
    if (levelObj.r === undefined) {
      console.error(`Error: ${levelInfo()} r === undefined.`);
      return false;
    }

    if (levelObj.r.length !== levelObj.step) {
      console.error(`Error: ${levelInfo()} Step check failed. step: ${levelObj.step} (r.length = ${levelObj.r.length})`);
      return false;
    }

    let index = 0;
    for (const dirChar of levelObj.r) {
      index++;
      const dir = Number(dirChar);
      const dx = dxs[dir];
      const dy = dys[dir];
      const moveFlag = level.updateMoveFlags(dx, dy);

      if (!moveFlag) {
        console.error(`Error: ${levelInfo()} moveFlag failed.`);
        return false;
      }

      if (isCompleted(level)) {
        console.error(`Error: ${levelInfo()} Completed on the way.`);
        return false;
      }

      level.move();

      const stateStr = level.getStateStr();
      if (stateStrMap[stateStr] !== undefined) {
        console.warn(`Warning: ${levelInfo()} Same state on ${index} step`);
      }
      stateStrMap[stateStr] = true;
    }

    if (!isCompleted(level)) {
      console.error(`Error: ${levelInfo()} Not completed.`);
      return false;
    }
    return true;

    function levelInfo() {
      return `Level-${levelId} [subject: ${levelObj.subject}]`;
    }
  }

  function isCompleted(level) {
    if (options.reflection) {
      return level.isCompleted2();
    } else {
      return level.isCompleted();
    }
  }
})();
