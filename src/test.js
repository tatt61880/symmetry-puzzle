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
      testLineLevel6Hints();
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
      testSpecialLevel1Hints();
      break;
    default:
      testsOther();
      testMirroredAxis();
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

  function testLineLevel6Hints() {
    const assert = require('node:assert/strict');
    for (const mirrorFlag of [false, true]) {
      for (let rotateNum = 0; rotateNum < 4; rotateNum++) {
        const level = new app.Level({ levelObj: app.levels[6], checkMode, mirrorFlag, rotateNum });
        assert.equal(level.getHint().dir, 4);
        assert.ok(level.move(0, 0));
        assert.equal(level.getHint().dir, ((mirrorFlag ? 3 : 1) + rotateNum) % 4);
        assert.ok(level.move(0, 0));
        assert.equal(level.getHint().dir, 4);
      }
    }
  }

  function testSpecialLevel1Hints() {
    const assert = require('node:assert/strict');
    const level = new app.Level({ levelObj: app.levels[1], checkMode });

    function checkArrow(x, y, dir) {
      const hint = level.getHint();
      assert.deepEqual([hint.x, hint.y, hint.dir], [x, y, dir]);
    }

    checkArrow(4, 0, 2);
    for (let i = 0; i < 4; i++) assert.ok(level.move(1, 0));
    assert.ok(level.move(0, 1)); // 小さいブロックを隅に押します。
    checkArrow(1, 1, 1);

    assert.ok(level.move(-1, 0)); // L字を左へ1マス押しても、まだ解けます。
    checkArrow(0, 1, 1);
    assert.ok(level.move(-1, 0)); // もう1マス押すと手詰まりです。
    assert.equal(level.getHint().undo, true);
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

  function testMirroredAxis() {
    const assert = require('node:assert/strict');
    const levelObj = require('./levels-line.js')[9];
    const mirrored = new app.Level({ levelObj, mirrorFlag: true });
    const edited = new app.Level({ levelObj });
    edited.mirror();
    assert.equal(mirrored.getA(), 'l4-x8');
    assert.equal(edited.getA(), mirrored.getA());
    edited.mirror();
    assert.equal(edited.getA(), levelObj.axis);

    // 鏡映後のレベル9は、左・下・下・対称軸操作・右の5手で解けます。
    for (const [dx, dy] of [
      [-1, 0],
      [0, 1],
      [0, 1],
      [0, 0],
      [1, 0],
    ]) {
      assert.ok(mirrored.move(dx, dy));
    }
    assert.ok(mirrored.isCompleted());
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
