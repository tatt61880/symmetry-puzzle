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
      testLineLevel9Hints();
      break;
    case 'point':
      checkMode = app.Level.CHECK_MODE.POINT;
      app.levels = require('./levels-point.js');
      app.levelsEx = require('./levels-point-ex.js');
      checkLevels();
      testPointLevel6Hints();
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
      testSymmetryTypes();
      testAxisNormalization();
      testLongReplayRecords();
      testLevelRecordSelection();
      testRestoreBackup();
      testRestoreStorageFailure();
      testMirroredAxis();
      testSearchStateCodec();
      testsSolve();
      testInvalidSolverModePreservesBackup();
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

  function testSymmetryTypes() {
    const assert = require('node:assert/strict');
    const { LINE, POINT, SPECIAL } = app.Level.CHECK_MODE;
    const types = app.Level.SYMMETRY_TYPE;
    for (const [s, line, point, special, connected] of [
      ['111-01', types.LINE1, null, null, true],
      ['1-11-1', types.LINE2, null, null, true],
      ['11-1', types.LINE3, null, null, true],
      ['11-01', types.LINE4, null, null, true],
      ['111-01-111', types.PLUS1, types.POINT1, types.SPECIAL1, true],
      ['11-111-011', types.PLUS2, types.POINT1, types.SPECIAL2, true],
      ['12-21', types.PLUS3, types.POINT2, types.SPECIAL3, true],
      ['11-01-011', null, types.POINT1, null, true],
      ['01-0111-111-001', null, types.POINT2, null, true],
      ['1-01', types.PLUS2, types.POINT1, types.SPECIAL2, false],
    ]) {
      const level = new app.Level({ levelObj: { w: 4, h: 4, s } });
      for (const [mode, expected] of [
        [LINE, line],
        [POINT, point],
        [SPECIAL, special],
      ]) {
        level.setCheckMode(mode);
        assert.equal(level.getSymmetryType(app.states.isTarget), expected, s);
        assert.equal(level.isSymmetry(app.states.isTarget), expected !== null, s);
        assert.equal(level.isCompleted(), connected && expected !== null, s);
      }
    }
  }

  function testLineLevel6Hints() {
    const assert = require('node:assert/strict');
    for (const mirrorFlag of [false, true]) {
      for (let rotateNum = 0; rotateNum < 4; rotateNum++) {
        const level = new app.Level({ levelObj: app.levels[6], checkMode, mirrorFlag, rotateNum });
        const rightDir = ((mirrorFlag ? 3 : 1) + rotateNum) % 4;
        assert.equal(level.getHint().dir, 4);
        assert.deepEqual(level.getHint().wallDirs, [rightDir]);
        assert.ok(level.move(0, 0));
        assert.equal(level.getHint().dir, rightDir);
        assert.equal(level.getHint().wallDirs, undefined);
        assert.ok(level.move(0, 0));
        assert.equal(level.getHint().dir, 4);
      }
    }
  }

  function testLineLevel9Hints() {
    const assert = require('node:assert/strict');
    const levelObj = app.levels[9];
    const level = new app.Level({ levelObj, checkMode });
    for (const [state, arrow] of [
      [levelObj.s, [1, 1, 2]], // 対称軸操作を使うマスへ
      ['001-2011x-0s', [undefined, undefined, 4]], // 中央ボタン
      ['001s-2011x', [3, 0, 3]], // 回り込んだ後のひと押し
      ['-201sx-0011', [3, 1, 3]], // L字を下に押した場合
      ['01s-0110x-2', [3, 1, 3]], // 小さいブロックを下に押してからL字を左に押した場合
      ['-21s0x-011', [0, 0, 2]], // 小さいブロックを押して完成させる配置
    ]) {
      level.applyStateStr(state);
      const { x, y, dir } = level.getHint();
      assert.deepEqual([x, y, dir], arrow);
    }
    for (const state of ['201-s011x', '-2001x-00s11']) {
      level.applyStateStr(state);
      assert.equal(level.getHint().undo, true);
    }
  }

  function testPointLevel6Hints() {
    const assert = require('node:assert/strict');
    const moves = [[0, -1], [1, 0], [0, 1], [-1, 0], [0, 0]];
    for (const mirrorFlag of [false, true]) {
      for (let rotateNum = 0; rotateNum < 4; rotateNum++) {
        const level = new app.Level({ levelObj: app.levels[6], checkMode, mirrorFlag, rotateNum });
        assert.deepEqual(new Set(level.getHint().wallDirs), new Set([0, 1, 2, 3]));
        for (const step of level.getR()) {
          const hint = level.getHint();
          assert.equal(hint.dir, Number(step));
          if (hint.dir !== 4) assert.deepEqual([hint.x, hint.y], [hint.when.x, hint.when.y]);
          assert.ok(level.move(...moves[hint.dir]));
        }
        assert.ok(level.isCompleted());
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

  function testRestoreBackup() {
    const assert = require('node:assert/strict');
    const Savedata = require('./class-savedata.js');
    const savedata = new Savedata();
    savedata.saveLang('ja');
    const key = 'mode=line&num=1';
    const backup = { version: 2, lang: 'en', steps: { [key]: '4' }, shapes: { [key]: { '#-#': 10000 } } };
    assert.equal(savedata.restoreBackupData(backup), true);
    for (const invalid of [
      null,
      { version: 1, steps: {} },
      { shapes: {} },
      { ...backup, version: 3 },
      { ...backup, lang: 'unknown' },
      { ...backup, steps: [] },
      { ...backup, steps: { [key]: '4x' } },
      { ...backup, shapes: { [key]: null } },
      { ...backup, shapes: { [key]: { '#': -1 } } },
    ]) {
      assert.equal(savedata.restoreBackupData(invalid), false);
      assert.deepEqual(savedata.getBackupData(), backup);
    }
    const records = { steps: { [key]: '' }, shapes: { [key]: { '#': '' } } };
    assert.equal(savedata.restoreBackupData(records), true);
    assert.deepEqual(savedata.getBackupData(), { version: 1, lang: 'en', ...records });
  }

  function testRestoreStorageFailure() {
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const vm = require('node:vm');
    const original = { version: 1, lang: 'ja', steps: { 'mode=line&num=1': '1121' }, shapes: {} };
    const localStorage = {
      getItem: () => JSON.stringify(original),
      setItem() {
        throw new Error('Storage full');
      },
    };
    const window = { app: { Level: app.Level } };
    vm.runInNewContext(fs.readFileSync(require.resolve('./class-savedata.js'), 'utf8'), { window, localStorage });
    const savedata = window.app.savedata;
    assert.throws(() => savedata.restoreBackupData({ version: 1, steps: {}, shapes: {} }), /Storage full/);
    assert.deepEqual(JSON.parse(JSON.stringify(savedata.getBackupData())), original);
  }

  function testLevelRecordSelection() {
    const assert = require('node:assert/strict');
    const Savedata = require('./class-savedata.js');
    const savedata = new Savedata();
    const levelObj = require('./levels-line.js')[1];
    const line = new app.Level({ levelObj, checkMode: app.Level.CHECK_MODE.LINE });
    const point = new app.Level({ levelObj, checkMode: app.Level.CHECK_MODE.POINT });
    const shape = '##';
    const boardKey = line.getUrlQuery();
    savedata.restoreBackupData({
      version: 1,
      steps: { [boardKey]: '1121' },
      shapes: { [boardKey]: { [shape]: '1121' }, 'mode=line&num=1': { [shape]: '21' } },
    });

    assert.equal(savedata.getHighestScore(line), 4);
    assert.equal(savedata.getHighestScore(line, 1), 2);
    savedata.saveSteps(point, '123', 1);
    savedata.saveShape(point, shape, '123', 1);
    assert.equal(savedata.getHighestScore(point, 1), 3);
    assert.deepEqual(savedata.getShapeRecords(point, 1), [{ shapeStr: shape, steps: 3, replay: '123' }]);
    assert.deepEqual(savedata.getShapesObj(line, 1), { [shape]: '21' });
    assert.equal(savedata.getHighestScore(point), null);
    assert.equal(savedata.getHighestScore(point, 2), null);
    assert.equal(savedata.getUnsolvedMinNum(app.Level.CHECK_MODE.POINT), 2);
    const { steps, shapes } = savedata.getBackupData();
    assert.deepEqual(steps, { [boardKey]: '1121', 'mode=point&num=1': '123' });
    assert.deepEqual(shapes['mode=point&num=1'], { [shape]: '123' });
  }

  function testLongReplayRecords() {
    const assert = require('node:assert/strict');
    const Savedata = require('./class-savedata.js');
    const savedata = new Savedata();
    const level = new app.Level({ levelObj: require('./levels-line.js')[1] });
    const shape = '##-##';
    const replay = '1'.repeat(9999);
    const longReplay = replay + '2';

    savedata.saveShape(level, shape, longReplay + '3');
    assert.equal(savedata.getHighestScore(level), 10001); // 形状別の記録だけがある場合
    savedata.saveShape(level, shape, longReplay);
    savedata.saveSteps(level, longReplay);
    const restored = new Savedata();
    restored.restoreBackupData(JSON.parse(JSON.stringify(savedata.getBackupData())));
    assert.deepEqual(restored.getShapeRecords(level), [{ shapeStr: shape, steps: 10000, replay: undefined }]);
    assert.equal(restored.getHighestScore(level), 10000);

    restored.saveSteps(level, replay);
    restored.saveShape(level, shape, replay);
    restored.saveSteps(level, longReplay);
    assert.equal(restored.saveShape(level, shape, longReplay), false);
    assert.equal(restored.getHighestScore(level), 9999);
    assert.deepEqual(restored.getShapeRecords(level), [{ shapeStr: shape, steps: 9999, replay }]);
  }

  function testAxisNormalization() {
    const assert = require('node:assert/strict');
    const makeLevel = (axis) => new app.Level({ levelObj: { w: 5, h: 3, s: 's', axis } });
    for (const [axis, expected] of [
      ['l1-x3-y5', 'l1-x3'],
      ['l2-x3-y5', 'l2-y5'],
      ['l3-x3-y5', 'l3-y2'],
      ['l3-x5-y3', 'l3-x2'],
      ['l4-x3-y5', 'l4-x8'],
      ['l4-x9-y5', 'l4-x10-y4'],
      ['l4-x10', 'l4-x10'],
      ['p1-x3-y5', 'p1-x3-y5'],
      ['p2-x3-y5', 'p2-x3-y5'],
      [undefined, undefined],
    ]) {
      const level = makeLevel(axis);
      const before = level.getAxisCenter();
      assert.equal(level.getA(), expected);
      assert.equal(level.isNormalized(), axis === expected);
      assert.deepEqual(level.getAxisCenter(), before);
      level.normalize();
      assert.deepEqual(level.getAxisCenter(), makeLevel(expected).getAxisCenter());
      assert.equal(level.isNormalized(), true);
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

  function testInvalidSolverModePreservesBackup() {
    const assert = require('node:assert/strict');
    const { execFileSync, spawnSync } = require('node:child_process');
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'symmetry-puzzle-solver-'));
    const args = [require.resolve('./solve.js'), '--id', '1', '--backup', '--mode'];
    try {
      execFileSync(process.execPath, [...args, 'line'], { cwd });
      const [filename] = fs.readdirSync(cwd);
      const backup = fs.readFileSync(path.join(cwd, filename), 'utf8');
      assert.equal(Object.keys(JSON.parse(backup).backupData.steps).length, 1);

      const result = spawnSync(process.execPath, [...args, 'lnie'], { cwd, encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /lnie/);
      assert.deepEqual(fs.readdirSync(cwd), [filename]);
      assert.equal(fs.readFileSync(path.join(cwd, filename), 'utf8'), backup);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  }

  function testSearchStateCodec() {
    const assert = require('node:assert/strict');
    // 内壁・飛び番のブロック・255を超えるマス番号を含む盤面で、複数の局面を行き来します。
    const s = 'sx(256)h-w------(17)';
    const level = new app.Level({ levelObj: { w: 50, h: 8, s } });
    const board = level.createSearchStateCodec();
    const original = board.encode();
    assert.ok(level.move(0, 1));
    const movedState = level.getS();
    const moved = board.encode();
    level.normalize();
    const normalizedState = level.getS();
    const normalized = board.encode();
    assert.equal(new Set([original, moved, normalized]).size, 3);
    for (const [key, expected] of [
      [moved, movedState],
      [original, s],
      [normalized, normalizedState],
    ]) {
      board.restore(key);
      assert.equal(level.getS(), expected);
      assert.equal(board.encode(), key);
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
    {
      const assert = require('node:assert/strict');
      const levelObj = require('./levels-line.js')[6];
      const level = new app.Level({ levelObj, checkMode: app.Level.CHECK_MODE.LINE });
      const result = app.solveLevel('Line-6', level, { prefixStep: '24' });
      assert.equal(result?.replayStr, '241');
    }
    {
      const assert = require('node:assert/strict');
      const levelObj = require('./levels-line.js')[1];
      const level = new app.Level({ levelObj, checkMode: app.Level.CHECK_MODE.LINE });
      // 4手目で先頭手順の2手目と同じ盤面に戻ると、8手でクリアできます。
      const result = app.solveLevel('Line-1', level, { prefixStep: '103', maxStep: 8 });
      assert.equal(result.replayStr, '10311221');
    }
  }
})();
