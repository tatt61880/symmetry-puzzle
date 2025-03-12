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
    backup,
    restore,
  };

  const elems = app.elems;

  function show() {
    updateTable();
    elems.records.dialog.showModal();
  }

  function updateTable() {
    let numLineNotSolved = 0;
    let numLineSolvedNormal = 0;
    let numLineSolvedBest = 0;

    {
      const levelsList = app.levelsLine;
      const levelsListEx = app.levelsLineEx;
      const levels = new app.Levels({ levelsList, levelsListEx });
      const allLevels = levels.getAllLevels();
      for (const { levelId, levelObj } of allLevels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;

        const playerScore = app.savedata.getHighestScore(levelObj, app.Level.CHECK_MODE.LINE);
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

    {
      const levelsList = app.levelsPoint;
      const levelsListEx = app.levelsPointEx;
      const levels = new app.Levels({ levelsList, levelsListEx });
      const allLevels = levels.getAllLevels();
      for (const { levelId, levelObj } of allLevels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;

        const playerScore = app.savedata.getHighestScore(levelObj, app.Level.CHECK_MODE.POINT);
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

    {
      const levelsList = app.levelsSpecial;
      const levelsListEx = app.levelsSpecialEx;
      const levels = new app.Levels({ levelsList, levelsListEx });
      const allLevels = levels.getAllLevels();
      for (const { levelId, levelObj } of allLevels) {
        if (levelId === 0) continue;
        if (levelId === 'NaN') continue;

        const playerScore = app.savedata.getHighestScore(levelObj, app.Level.CHECK_MODE.SPECIAL);
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
    elems.records.dialog.close();
  }

  async function backup() {
    const dataText = JSON.stringify(app.savedata.getBackupData());
    const encodedData = btoa(encodeURIComponent(dataText));
    const obj = {
      confirm: 'yyyymmdd',
      data: encodedData,
    };
    const clipboardText = JSON.stringify(obj);

    try {
      await navigator.clipboard.writeText(clipboardText);
      alert('バックアップデータをクリップボードにコピーしました。\nCopied the backup data to clipboard.');
    } catch (error) {
      alert(error);
    }
  }

  async function restore() {
    const clipboardText = await navigator.clipboard.readText();
    try {
      const yyyymmdd = (() => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return year + month + day;
      })();

      const parsedObj = JSON.parse(clipboardText);
      if (parsedObj?.confirm === yyyymmdd && parsedObj?.data !== undefined) {
        const decodedText = decodeURIComponent(atob(parsedObj.data));
        const restoreData = JSON.parse(decodedText);
        app.savedata.restoreBackupData(restoreData);
        updateTable();
        alert('リストアを実行しました。\nData restored.');
      } else if (parsedObj?.confirm !== undefined && typeof parsedObj.confirm === 'string' && parsedObj?.data !== undefined) {
        alert(`失敗しました。\nFailed.\n\nconfirm の値を '${parsedObj?.confirm}' から '${yyyymmdd}' に書き換えて再実行してください。`);
      } else {
        alert('データ形式が想定外です。\nThe data format is invalid.');
      }
    } catch (error) {
      alert(`Error: ${error}`);
    }
  }
})();
