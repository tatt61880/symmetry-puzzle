(function () {
  'use strict';

  const digitRows = [
    '000111001111111101111111111111111',
    '000101001001001101100100001101101',
    '111101001111111111111111001111111',
    '000101001100001001001101001101001',
    '000111001111111001111111001111111',
  ];

  function parseNumber(value) {
    const text = String(value).trim();
    return /^[+-]?\d+$/.test(text) ? BigInt(text) : NaN;
  }

  function createLevel(value) {
    const num = parseNumber(value);
    if (typeof num !== 'bigint' || num === 0n) throw new RangeError('Expected a nonzero sequence number.');
    const digits = String(num);
    let nextBlock = 1;
    const rows = digitRows.map((row) => {
      let result = '0';
      for (const char of digits) {
        const start = char === '-' ? 0 : (Number(char) + 1) * 3;
        for (const cell of row.slice(start, start + 3)) {
          if (cell === '0') {
            result += '0';
          } else {
            const block = nextBlock++;
            result += block < 10 ? String(block) : `(${block})`;
          }
        }
        result += '0';
      }
      return result;
    });
    return { w: digits.length * 4 + 1, h: 7, s: `s-${rows.join('-')}-` };
  }

  const sequence = Object.freeze({ parseNumber, createLevel });
  if (typeof window !== 'undefined') {
    window.app = window.app || {};
    window.app.sequence = sequence;
  } else {
    module.exports = sequence;
  }
})();
