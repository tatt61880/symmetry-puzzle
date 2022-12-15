(function() {
  'use strict';

  const app = {};
  app.states = require('./states.js');
  app.levels = require('./levels.js');
  app.Level = require('./class-level.js');

  const levelSet = new Set();

  for (const idx in app.levels) {
    const levelObj = app.levels[idx];
    levelSet.add(`${levelObj.w},${levelObj.h},${levelObj.s}`);
    const levelId = Number(idx);
    const res = testLevel(levelId, levelObj);
    if (!res) {
      console.error('Error: Test failed.');
      process.exitCode = 1;
      return;
    }
  }

  if (levelSet.size !== app.levels.length) {
    console.error('Error: There are same levels.');
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
  return;

  function testLevel(levelId, levelObj) {
    const level = app.Level();
    level.applyObj(levelObj, {init: true});

    if (!level.isNormalized()) {
      console.error('Error: isNormalized check failed.');
      return false;
    }

    const stateStrMap = {};
    const dys = [-1, 0, 1, 0];
    const dxs = [0, 1, 0, -1];
    const r = level.getLevelObj()?.r;
    if (r === undefined) return false;
    let index = 0;
    for (const dirChar of r) {
      index++;
      const dir = Number(dirChar);
      const dx = dxs[dir];
      const dy = dys[dir];
      const moveFlag = level.updateMoveFlags(dx, dy);
      if (!moveFlag) {
        console.error(`Error: ${levelInfo(levelId, levelObj)} moveFlag failed.`);
        return false;
      }
      const clearFlag = isClear(level);
      if (clearFlag) {
        console.error(`Error: ${levelInfo(levelId, levelObj)} Cleared on the way.`);
        return false;
      }
      level.move();
      const stateStr = level.getStateStr();
      if (stateStrMap[stateStr] !== undefined) {
        console.warn(`Warning: ${levelInfo(levelId, levelObj)} Same state on ${index} step`);
      }
      stateStrMap[stateStr] = true;
    }
    const clearFlag = isClear(level);
    if (!clearFlag) {
      console.error(`Error: ${levelInfo(levelId, levelObj)} clearFlag failed.`);
      return false;
    }
    return true;
  }

  function levelInfo(levelId, levelObj) {
    return `Level-${levelId} [subject: ${levelObj.subject}]`;
  }

  function isClear(level) {
    const isConnected = level.isConnected(app.states.isTarget);
    const center = level.getRotateCenter(app.states.isTarget);
    const clearFlag = isConnected && center !== null;
    return clearFlag;
  }
})();
