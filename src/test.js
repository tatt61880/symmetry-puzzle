(function() {
  'use strict';

  const showkoban = {};
  showkoban.states = require('./states.js');
  showkoban.levels = require('./levels.js');
  showkoban.Level = require('./class-level.js');

  /*
  for (const levelObj of showkoban.levels) {
    const level = showkoban.Level();
    level.applyObj(levelObj, true);
    console.log(level);
  }
  */
})();
