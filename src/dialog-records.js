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
    window.sound.playUiOpen();
    elems.records.dialog.showModal();
  }

  function updateTable() {
    let numLineNotSolved = 0;
    let numLineSolvedNormal = 0;
    let numLineSolvedBest = 0;
    let numLineShapes = 0;
    let numLineShapesTotal = 0;
    let numLineShapesUnknownFlag = false;

    {
      const levelsList = app.levelsLine;
      const levelsListEx = app.levelsLineEx;
      const levels = new app.Levels({ levelsList, levelsListEx });
      const allLevels = levels.getAllLevels();
      for (const { levelId, levelObj } of allLevels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;

        const level = new app.Level({
          levelObj,
          checkMode: app.Level.CHECK_MODE.LINE,
        });
        const playerScore = app.savedata.getHighestScore(level);
        const shapesObj = app.savedata.getShapesObj(level);
        if (shapesObj) {
          numLineShapes += Object.keys(shapesObj).length;
          numLineShapesTotal += levelObj.shapes;
        } else {
          numLineShapesUnknownFlag = true;
        }
        const appScore = levelObj.step;
        if (playerScore === null) {
          ++numLineNotSolved;
        } else if (playerScore > appScore) {
          ++numLineSolvedNormal;
        } else {
          ++numLineSolvedBest;
        }
      }
    }

    let numPointNotSolved = 0;
    let numPointSolvedNormal = 0;
    let numPointSolvedBest = 0;
    let numPointShapes = 0;
    let numPointShapesTotal = 0;
    let numPointShapesUnknownFlag = false;

    {
      const levelsList = app.levelsPoint;
      const levelsListEx = app.levelsPointEx;
      const levels = new app.Levels({ levelsList, levelsListEx });
      const allLevels = levels.getAllLevels();
      for (const { levelId, levelObj } of allLevels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;

        const level = new app.Level({
          levelObj,
          checkMode: app.Level.CHECK_MODE.POINT,
        });
        const playerScore = app.savedata.getHighestScore(level);
        const shapesObj = app.savedata.getShapesObj(level);
        if (shapesObj) {
          numPointShapes += Object.keys(shapesObj).length;
          numPointShapesTotal += levelObj.shapes;
        } else {
          numPointShapesUnknownFlag = true;
        }
        const appScore = levelObj.step;
        if (playerScore === null) {
          ++numPointNotSolved;
        } else if (playerScore > appScore) {
          ++numPointSolvedNormal;
        } else {
          ++numPointSolvedBest;
        }
      }
    }

    let numSpecialNotSolved = 0;
    let numSpecialSolvedNormal = 0;
    let numSpecialSolvedBest = 0;
    let numSpecialShapes = 0;
    let numSpecialShapesTotal = 0;
    let numSpecialShapesUnknownFlag = false;

    {
      const levelsList = app.levelsSpecial;
      const levelsListEx = app.levelsSpecialEx;
      const levels = new app.Levels({ levelsList, levelsListEx });
      const allLevels = levels.getAllLevels();
      for (const { levelId, levelObj } of allLevels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;

        const level = new app.Level({
          levelObj,
          checkMode: app.Level.CHECK_MODE.SPECIAL,
        });
        const playerScore = app.savedata.getHighestScore(level);
        const shapesObj = app.savedata.getShapesObj(level);
        if (shapesObj) {
          numSpecialShapes += Object.keys(shapesObj).length;
          numSpecialShapesTotal += levelObj.shapes;
        } else {
          numSpecialShapesUnknownFlag = true;
        }
        const appScore = levelObj.step;
        if (playerScore === null) {
          ++numSpecialNotSolved;
        } else if (playerScore > appScore) {
          ++numSpecialSolvedNormal;
        } else {
          ++numSpecialSolvedBest;
        }
      }
    }

    const numLineTotal = numLineSolvedBest + numLineSolvedNormal + numLineNotSolved;

    const numPointTotal = numPointSolvedBest + numPointSolvedNormal + numPointNotSolved;

    const numSpecialTotal = numSpecialSolvedBest + numSpecialSolvedNormal + numSpecialNotSolved;

    const setBackgroundBar = (td, ratio) => {
      const percent = ratio * 100;
      const style = `width: 80px; background: linear-gradient(to right, rgb(250, 250, 150) ${percent}%, transparent ${percent}%);`;
      td.setAttribute('style', style);
    };

    {
      // 最短記録達成
      {
        const crownSize = Number(elems.records.icon.shortest.dataset.crownSize);
        const th = elems.records.icon.shortest;
        th.innerText = '';
        const svg = app.svg.createSvg();
        svg.setAttribute('width', crownSize);
        svg.setAttribute('height', crownSize);
        const crown = app.common.createCrown(crownSize, 0, 0, 1, 1);
        th.appendChild(svg);
        svg.appendChild(crown);
      }
      {
        const td = elems.records.line.shortest;
        td.innerText = numLineSolvedBest;
        setBackgroundBar(td, numLineSolvedBest / numLineTotal);
      }
      {
        const td = elems.records.point.shortest;
        td.innerText = numPointSolvedBest;
        setBackgroundBar(td, numPointSolvedBest / numPointTotal);
      }
      {
        const td = elems.records.special.shortest;
        td.innerText = numSpecialSolvedBest;
        setBackgroundBar(td, numSpecialSolvedBest / numSpecialTotal);
      }
    }

    // クリア済み
    {
      {
        const crownSize = Number(elems.records.icon.cleared.dataset.crownSize);
        const th = elems.records.icon.cleared;
        th.innerText = '';
        const svg = app.svg.createSvg();
        svg.setAttribute('width', crownSize);
        svg.setAttribute('height', crownSize);
        const crown = app.common.createCrown(crownSize, 0, 0, 1, 0);
        th.appendChild(svg);
        svg.appendChild(crown);
      }
      {
        const td = elems.records.line.cleared;
        td.innerText = numLineSolvedNormal;
        setBackgroundBar(td, numLineSolvedNormal / numLineTotal);
      }
      {
        const td = elems.records.point.cleared;
        td.innerText = numPointSolvedNormal;
        setBackgroundBar(td, numPointSolvedNormal / numPointTotal);
      }
      {
        const td = elems.records.special.cleared;
        td.innerText = numSpecialSolvedNormal;
        setBackgroundBar(td, numSpecialSolvedNormal / numSpecialTotal);
      }
    }

    // 未クリア
    {
      {
        const crownSize = Number(elems.records.icon.uncleared.dataset.crownSize);
        const th = elems.records.icon.uncleared;
        th.innerText = '';
        const svg = app.svg.createSvg();
        svg.setAttribute('width', crownSize);
        svg.setAttribute('height', crownSize);
        const crown = app.common.createCrown(crownSize, 0, 0, null, 1);
        th.appendChild(svg);
        svg.appendChild(crown);
      }
      {
        const td = elems.records.line.uncleared;
        td.innerText = numLineNotSolved;
        setBackgroundBar(td, numLineNotSolved / numLineTotal);
      }
      {
        const td = elems.records.point.uncleared;
        td.innerText = numPointNotSolved;
        setBackgroundBar(td, numPointNotSolved / numPointTotal);
      }
      {
        const td = elems.records.special.uncleared;
        td.innerText = numSpecialNotSolved;
        setBackgroundBar(td, numSpecialNotSolved / numSpecialTotal);
      }
    }

    // 形状数
    {
      {
        elems.records.line.shapes.numerator.textContent = numLineShapes;
        let denumerator = numLineShapesTotal;
        if (numLineShapesUnknownFlag) {
          if (numLineShapesTotal) {
            denumerator += '+?';
          } else {
            denumerator = '?';
          }
        }
        elems.records.line.shapes.denumerator.textContent = denumerator;

        const fill = numLineShapes === denumerator ? app.colors.shapeNumPerfect : app.colors.shapeNumNormal;
        elems.records.line.shapes.numerator.setAttribute('fill', fill);
        elems.records.line.shapes.line.setAttribute('fill', fill);
        elems.records.line.shapes.denumerator.setAttribute('fill', fill);
      }
      {
        elems.records.point.shapes.numerator.textContent = numPointShapes;
        let denumerator = numPointShapesTotal;
        if (numPointShapesUnknownFlag) {
          if (numPointShapesTotal) {
            denumerator += '+?';
          } else {
            denumerator = '?';
          }
        }
        elems.records.point.shapes.denumerator.textContent = denumerator;

        const fill = numPointShapes === denumerator ? app.colors.shapeNumPerfect : app.colors.shapeNumNormal;
        elems.records.point.shapes.numerator.setAttribute('fill', fill);
        elems.records.point.shapes.line.setAttribute('fill', fill);
        elems.records.point.shapes.denumerator.setAttribute('fill', fill);
      }
      {
        elems.records.special.shapes.numerator.textContent = numSpecialShapes;
        let denumerator = numSpecialShapesTotal;
        if (numSpecialShapesUnknownFlag) {
          if (numSpecialShapesTotal) {
            denumerator += '+?';
          } else {
            denumerator = '?';
          }
        }
        elems.records.special.shapes.denumerator.textContent = denumerator;

        const fill = numSpecialShapes === denumerator ? app.colors.shapeNumPerfect : app.colors.shapeNumNormal;
        elems.records.special.shapes.numerator.setAttribute('fill', fill);
        elems.records.special.shapes.line.setAttribute('fill', fill);
        elems.records.special.shapes.denumerator.setAttribute('fill', fill);
      }
    }

    // 連番モード
    {
      {
        const td = elems.records.line.num;
        const num = app.savedata.getUnsolvedMinNum(app.Level.CHECK_MODE.LINE) - 1;
        td.innerText = num;
      }
      {
        const td = elems.records.point.num;
        const num = app.savedata.getUnsolvedMinNum(app.Level.CHECK_MODE.POINT) - 1;
        td.innerText = num;
      }
      {
        const td = elems.records.special.num;
        const num = app.savedata.getUnsolvedMinNum(app.Level.CHECK_MODE.SPECIAL) - 1;
        td.innerText = num;
      }
    }
  }

  function close() {
    window.sound.playUiClose();
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
    window.sound.playButton();

    const filename = `symmetry-puzzle-backup-${yyyymmdd}.json`;
    const lang = app.savedata.getLang();
    if (lang === 'ja') {
      await customAlert(`バックアップファイルを作成します。\n${filename}`);
    } else {
      await customAlert(`Backup file will be created.\n${filename}`);
    }
    downloadJsonAsFile(filename, backupJsonText);

    function downloadJsonAsFile(fileName, fileContent) {
      window.sound.playButton();

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
    window.sound.playButton();

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
        window.sound.playButton();
        resolve();
      };
      elems.records.alert.button.addEventListener('click', handler);
    });
  }
})();
