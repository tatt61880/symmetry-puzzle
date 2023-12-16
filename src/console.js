(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  console.assert(!isBrowser);

  function colorizedText(text, r, g, b) {
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
  }

  const appConsole = {
    log(message) {
      console.log(message);
    },

    info(message_) {
      const message = new String(message_);
      for (const line of message.split('\n')) {
        console.info(colorizedText(line, 120, 120, 120));
      }
    },

    warn(message_) {
      const message = new String(message_);
      for (const line of message.split('\n')) {
        console.warn(colorizedText(line, 200, 200, 0));
      }
    },

    error(message_) {
      const message = new String(message_);
      for (const line of message.split('\n')) {
        console.error(colorizedText(line, 200, 0, 0));
      }
    },
  };

  module.exports = appConsole;
})();
