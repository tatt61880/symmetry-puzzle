(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.elems !== undefined);
  console.assert(app?.common !== undefined);

  window.app = window.app || {};
  window.app.dialog = window.app.dialog || {};
  window.app.dialog.records = {
    show,
    close,
    cancel,
    backup,
    restore,
  };

  const elems = app.elems;
  const restoreInput = document.createElement('input');
  restoreInput.type = 'file';
  restoreInput.accept = '.json';
  restoreInput.hidden = true;
  restoreInput.addEventListener('change', restoreSelectedFile);
  document.body.appendChild(restoreInput);
  let restoreRequest = 0;
  let dismissAlert = null;

  function show() {
    updateTable();
    app.sound.playUiOpen();
    elems.records.dialog.showModal();
  }

  function updateTable() {
    const { shortest, cleared, uncleared } = elems.records.icon;
    drawCrown(shortest, 1, 1);
    drawCrown(cleared, 1, 0);
    drawCrown(uncleared, null, 1);

    const { LINE, POINT, SPECIAL } = app.Level.CHECK_MODE;
    updateModeColumn(LINE, app.levelsLine, app.levelsLineEx);
    updateModeColumn(POINT, app.levelsPoint, app.levelsPointEx);
    updateModeColumn(SPECIAL, app.levelsSpecial, app.levelsSpecialEx);
  }

  function drawCrown(th, step, bestStep) {
    const size = Number(th.dataset.crownSize);
    const svg = app.svg.createSvg();
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.appendChild(app.common.createCrown(size, 0, 0, step, bestStep));
    th.replaceChildren(svg);
  }

  function countModeRecords(checkMode, levelsList, levelsListEx) {
    const counts = { shortest: 0, cleared: 0, uncleared: 0, shapes: 0, knownShapeTotal: 0, hasUnknownShapes: false };
    const levels = new app.Levels({ levelsList, levelsListEx });
    for (const { levelObj } of levels.getListedLevels()) {
      const level = new app.Level({ levelObj, checkMode });
      const playerScore = app.savedata.getHighestScore(level);
      if (playerScore === null) {
        counts.uncleared++;
      } else if (playerScore > levelObj.step) {
        counts.cleared++;
      } else {
        counts.shortest++;
      }

      const shapes = app.savedata.getShapesObj(level);
      if (shapes) {
        counts.shapes += Object.keys(shapes).length;
        counts.knownShapeTotal += levelObj.shapes;
      } else {
        counts.hasUnknownShapes = true;
      }
    }
    return counts;
  }

  function updateModeColumn(checkMode, levelsList, levelsListEx) {
    const cells = elems.records[app.Level.getCheckModeStr(checkMode)];
    const counts = countModeRecords(checkMode, levelsList, levelsListEx);
    const total = counts.shortest + counts.cleared + counts.uncleared;
    updateCountCell(cells.shortest, counts.shortest, total);
    updateCountCell(cells.cleared, counts.cleared, total);
    updateCountCell(cells.uncleared, counts.uncleared, total, 'rgb(230, 230, 230)');

    let denominator = counts.knownShapeTotal;
    if (counts.hasUnknownShapes) {
      denominator = counts.knownShapeTotal ? `${counts.knownShapeTotal}+?` : '?';
    }
    const { numerator, line, denumerator: denominatorText } = cells.shapes;
    numerator.textContent = counts.shapes;
    denominatorText.textContent = denominator;
    const allShapesFound = !counts.hasUnknownShapes && counts.shapes === counts.knownShapeTotal;
    const fill = allShapesFound ? app.colors.shapeNumPerfect : app.colors.shapeNumNormal;
    for (const elem of [numerator, line, denominatorText]) {
      elem.setAttribute('fill', fill);
    }

    cells.num.textContent = app.savedata.getUnsolvedMinNum(checkMode) - 1;
  }

  function updateCountCell(td, count, total, color = 'rgb(250, 250, 150)') {
    td.textContent = count;
    const percent = (count / total) * 100;
    td.setAttribute('style', `width: 80px; background: linear-gradient(to right, ${color} ${percent}%, transparent ${percent}%);`);
  }

  function close() {
    dismissAlert?.();
    app.sound.playUiClose();
    elems.records.dialog.close();
  }

  function cancel(event) {
    if (dismissAlert === null) return;
    event?.preventDefault();
    app.sound.playButton();
    dismissAlert();
  }

  function getYyyymmdd() {
    const yyyymmdd = (() => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + month + day;
    })();
    return yyyymmdd;
  }

  async function backup() {
    const backupData = app.savedata.getBackupData();
    const yyyymmdd = getYyyymmdd();
    const obj = {
      yyyymmdd,
      backupData,
    };
    const backupJsonText = JSON.stringify(obj);
    app.sound.playButton();

    const filename = `symmetry-puzzle-backup-${yyyymmdd}.json`;
    const lang = app.savedata.getLang();
    const confirmed = await customAlert(
      lang === 'ja' ? `バックアップファイルを作成します。\n${filename}` : `Backup file will be created.\n${filename}`,
      { cancelable: true }
    );
    if (!confirmed) return;
    downloadJsonAsFile(filename, backupJsonText);

    function downloadJsonAsFile(fileName, fileContent) {
      app.sound.playButton();

      const blob = new Blob([fileContent], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      URL.revokeObjectURL(link.href);
    }
  }

  function restore() {
    app.sound.playButton();
    restoreInput.value = ''; // 同じファイルも選び直せるようにします。
    restoreInput.click();
  }

  async function restoreSelectedFile() {
    const file = restoreInput.files[0];
    if (!file) return;
    const request = ++restoreRequest;
    const ja = app.savedata.getLang() === 'ja';
    const invalidFile = ja ? 'バックアップの形式が正しくありません。' : 'Invalid backup format.';
    try {
      const text = await file.text();
      if (request !== restoreRequest) return;
      const backup = JSON.parse(text);
      if (typeof backup?.yyyymmdd !== 'string' || !app.savedata.restoreBackupData(backup.backupData)) {
        customAlert(invalidFile);
        return;
      }
    } catch (error) {
      if (request !== restoreRequest) return;
      const message = ja ? '復元できませんでした。元の記録はそのままです。' : 'Restore failed. Your records are unchanged.';
      customAlert(error instanceof SyntaxError ? invalidFile : message);
      return;
    }

    try {
      app.common.applyLangAll(app.savedata.getLang());
      app.common.updateTitleSeqModeButton();
      updateTable();
    } catch {
      customAlert(ja ? '記録を復元しました。画面を再読み込みしてください。' : 'Records restored. Please reload the page.');
      return;
    }
    customAlert(ja ? 'リストアを実行しました。' : 'Data restored.');
  }

  function customAlert(message, { cancelable = false } = {}) {
    dismissAlert?.();
    const previousFocus = document.activeElement;
    elems.records.alert.message.innerText = message;
    elems.records.alert.cancel.parentElement.hidden = !cancelable;
    elems.records.alert.backdrop.style.display = 'flex';

    return new Promise((resolve) => {
      const handler = () => {
        app.sound.playButton();
        finish(true);
      };
      function finish(confirmed) {
        elems.records.alert.backdrop.style.display = 'none';
        elems.records.alert.button.removeEventListener('click', handler);
        elems.records.alert.cancel.removeEventListener('click', cancel);
        dismissAlert = null;
        if (elems.records.alert.backdrop.contains(document.activeElement)) previousFocus?.focus({ preventScroll: true });
        resolve(confirmed);
      }
      dismissAlert = () => finish(false);
      elems.records.alert.button.addEventListener('click', handler);
      elems.records.alert.cancel.addEventListener('click', cancel);
      elems.records.alert.button.focus({ preventScroll: true });
    });
  }
})();
