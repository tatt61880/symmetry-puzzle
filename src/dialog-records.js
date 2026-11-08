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
    for (const { levelId, levelObj } of levels.getAllLevels()) {
      if (levelId === 0 || levelId === 'NaN') continue;

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
    app.sound.playUiClose();
    elems.records.dialog.close();
  }

  function cancel() {
    if (elems.records.alert.backdrop.style.display !== 'none') {
      elems.records.alert.backdrop.style.display = 'none';
    }
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
    if (lang === 'ja') {
      await customAlert(`バックアップファイルを作成します。\n${filename}`);
    } else {
      await customAlert(`Backup file will be created.\n${filename}`);
    }
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

  async function restore() {
    const hiddenFileInput = document.createElement('input');
    hiddenFileInput.type = 'file';
    hiddenFileInput.accept = '.json';
    hiddenFileInput.style.display = 'none';
    app.sound.playButton();

    function readLocalFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    }

    hiddenFileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const jsonText = await readLocalFile(file);

        const obj = JSON.parse(jsonText);
        if (obj?.yyyymmdd !== undefined && obj?.backupData !== undefined) {
          const langPrev = app.savedata.getLang();
          app.savedata.restoreBackupData(obj.backupData);
          const lang = app.savedata.getLang();
          app.common.applyLangAll(lang);
          app.common.updateTitleSeqModeButton();
          updateTable();

          setTimeout(() => {
            if (langPrev === 'ja') {
              customAlert('リストアを実行しました。');
            } else {
              customAlert('Data restored.');
            }
          }, 10);
        } else {
          const lang = app.savedata.getLang();
          if (lang === 'ja') {
            await customAlert('データ形式が想定外です。');
          } else {
            await customAlert('The data format is invalid.');
          }
        }
      } catch (error) {
        await customAlert(`Error: ${error}`);
      } finally {
        // 同じファイルを再度選択しても change イベントが発火するようにするために初期化します。
        hiddenFileInput.value = '';
      }
    });

    document.body.appendChild(hiddenFileInput);
    hiddenFileInput.click();
  }

  function customAlert(message) {
    elems.records.alert.message.innerText = message;
    elems.records.alert.backdrop.style.display = 'flex';

    return new Promise((resolve) => {
      const handler = () => {
        elems.records.alert.backdrop.style.display = 'none';
        elems.records.alert.button.removeEventListener('click', handler);
        app.sound.playButton();
        resolve();
      };
      elems.records.alert.button.addEventListener('click', handler);
    });
  }
})();
