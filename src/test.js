(function() {
  'use strict';

  const showkoban = {};
  showkoban.states = require('./states.js');
  showkoban.levels = require('./levels.js');
  showkoban.Level = require('./class-level.js');

  const dys = [-1, 0, 1, 0];
  const dxs = [0, 1, 0, -1];

  for (const idx in showkoban.levels) {
    const levelObj = showkoban.levels[idx];
    const levelId = Number(idx) + 1;
    const res = testLevel(levelObj);
    if (!res) {
      console.error(`Error: Level-${levelId} Test failed.`);
      process.exitCode = 1;
      return;
    }
  }

  process.exitCode = 0;
  return;

  function testLevel(levelObj) {
    const level = showkoban.Level();
    level.applyObj(levelObj, true);

    const r = level.getLevelObj()?.r;
    if (r === null) return false;
    for (const dirChar of r) {
      const dir = Number(dirChar);
      const dx = dxs[dir];
      const dy = dys[dir];
      const moveFlag = level.updateMoveFlags(dx, dy);
      if (!moveFlag) {
        console.error('Error: moveFlag failed.');
        return false;
      }
      const center = level.getRotateCenter(showkoban.states.isTarget);
      const clearFlag = center !== null;
      if (clearFlag) {
        console.error('Error: Cleared on the way.');
        return false;
      }
      level.move();
    }
    const center = level.getRotateCenter(showkoban.states.isTarget);
    const clearFlag = center !== null;
    if (!clearFlag) {
      console.error('Error: clearFlag failed.');
      return false;
    }
    return true;
  }
})();