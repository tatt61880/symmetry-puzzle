(function () {
  'use strict';

  const app = {};
  app.states = require('./states.js');
  app.levels = require('./levels.js');
  app.levelsEx = require('./levels-ex.js');
  app.Level = require('./class-level.js');
  app.UndoInfo = require('./class-undo-info.js');

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

  {
    const id = 1;
    const levelId = levels[id].levelId;
    const levelObj = levels[id].levelObj;
    solveLevel(levelId, levelObj);
  }

  process.exitCode = 0;
  return;

  function solveLevel(levelId, levelObj) {
    const level = new app.Level();
    level.applyObj(levelObj, { init: true });

    const dxs = [0, 1, 0, -1];
    const dys = [-1, 0, 1, 0];
    let maxStep = 7; // 途中により短い解が見つかり次第、更新します。
    let step = 0;
    const undoInfo = new app.UndoInfo();
    dfs();

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
        const clearFlag = isClear(level);
        if (clearFlag) {
          const replayStr = undoInfo.getReplayStr();
          console.log(`${step} ${replayStr}`);
          maxStep = Math.min(maxStep, step);
        }
        dfs();
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
