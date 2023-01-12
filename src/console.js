(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    console.error("Error: console.js isn't for browser.");
    return;
  }

  function colorizedText(text, r, g, b) {
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
  }

  const appConsole = {
    log(message) {
      console.log(message);
    },

    info(message) {
      for (const line of message.split('\n')) {
        console.info(colorizedText(line, 120, 120, 120));
      }
    },

    warn(message) {
      for (const line of message.split('\n')) {
        console.warn(colorizedText(line, 200, 200, 0));
      }
    },

    error(message) {
      for (const line of message.split('\n')) {
        console.error(colorizedText(line, 200, 0, 0));
      }
    },
  };

  module.exports = appConsole;
})();
