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
  };

  const elems = app.elems;

  function show() {
    const table = createRecordsTable();
    elems.records.tableDiv.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = `${elems.appTitle.textContent} ${elems.version.textContent}`;
    elems.records.tableDiv.appendChild(span);
    elems.records.tableDiv.appendChild(table);
    elems.records.dialog.showModal();
  }

  function createRecordsTable() {
    const table = document.createElement('table');
    const thead = createRecordsThead();
    const tbody = createRecordsTbody();
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  function createRecordsThead() {
    const thead = document.createElement('thead');

    const tr = document.createElement('tr');
    thead.appendChild(tr);

    const imgSize = '50';
    {
      const th = document.createElement('th');
      tr.appendChild(th);
    }
    {
      const th = document.createElement('th');
      tr.appendChild(th);
      const img = document.createElement('img');
      img.src = './images/logo-line.png';
      img.setAttribute('width', imgSize);
      img.setAttribute('height', imgSize);
      th.appendChild(img);
    }
    {
      const th = document.createElement('th');
      tr.appendChild(th);
      const img = document.createElement('img');
      img.src = './images/logo-point.png';
      img.setAttribute('width', imgSize);
      img.setAttribute('height', imgSize);
      th.appendChild(img);
    }
    {
      const th = document.createElement('th');
      tr.appendChild(th);
      const img = document.createElement('img');
      img.src = './images/logo-special.png';
      img.setAttribute('width', imgSize);
      img.setAttribute('height', imgSize);
      th.appendChild(img);
    }
    {
      const th = document.createElement('th');
      tr.appendChild(th);
      th.innerText = 'Total';
      th.classList.add('total-col');
    }

    return thead;
  }

  function createRecordsTbody() {
    const tbody = document.createElement('tbody');
    const crownSize = 35;

    let numLineNotSolved = 0;
    let numLineSolvedNormal = 0;
    let numLineSolvedBest = 0;

    {
      const levelsList = app.levelsLine;
      const levelsListEx = app.levelsLineEx;
      const levelObjs = [];
      for (let i = 1; i < levelsList.length; ++i) {
        const levelObj = levelsList[i];
        levelObjs.push(levelObj);
      }

      for (const id of Object.keys(levelsListEx)) {
        if (String(id) === 'NaN') continue;
        const levelObj = levelsListEx[id];
        levelObjs.push(levelObj);
      }
      for (let i = 0; i < levelObjs.length; ++i) {
        const levelObj = levelObjs[i];
        const playerScore = app.savedata.getHighestScore(
          levelObj,
          app.Level.CHECK_MODE.LINE
        );
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
      const levelObjs = [];
      for (let i = 1; i < levelsList.length; ++i) {
        const levelObj = levelsList[i];
        levelObjs.push(levelObj);
      }

      for (const id of Object.keys(levelsListEx)) {
        if (String(id) === 'NaN') continue;
        const levelObj = levelsListEx[id];
        levelObjs.push(levelObj);
      }
      for (let i = 0; i < levelObjs.length; ++i) {
        const levelObj = levelObjs[i];
        const playerScore = app.savedata.getHighestScore(
          levelObj,
          app.Level.CHECK_MODE.POINT
        );
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
      const levelObjs = [];
      for (let i = 1; i < levelsList.length; ++i) {
        const levelObj = levelsList[i];
        levelObjs.push(levelObj);
      }

      for (const id of Object.keys(levelsListEx)) {
        if (String(id) === 'NaN') continue;
        const levelObj = levelsListEx[id];
        levelObjs.push(levelObj);
      }
      for (let i = 0; i < levelObjs.length; ++i) {
        const levelObj = levelObjs[i];
        const playerScore = app.savedata.getHighestScore(
          levelObj,
          app.Level.CHECK_MODE.SPECIAL
        );
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

    const numTotalNotSolved =
      numLineNotSolved + numPointNotSolved + numSpecialNotSolved;
    const numTotalSolvedNormal =
      numLineSolvedNormal + numPointSolvedNormal + numSpecialSolvedNormal;
    const numTotalSolvedBest =
      numLineSolvedBest + numPointSolvedBest + numSpecialSolvedBest;

    const numLineTotal =
      numLineSolvedBest + numLineSolvedNormal + numLineNotSolved;

    const numPointTotal =
      numPointSolvedBest + numPointSolvedNormal + numPointNotSolved;

    const numSpecialTotal =
      numSpecialSolvedBest + numSpecialSolvedNormal + numSpecialNotSolved;

    const numTotalTotal = numLineTotal + numPointTotal + numSpecialTotal;

    {
      const tr = document.createElement('tr');
      tbody.appendChild(tr);

      // 最短記録達成
      {
        const th = document.createElement('th');
        const svg = app.svg.createSvg();
        svg.setAttribute('width', crownSize);
        svg.setAttribute('height', crownSize);
        const crown = app.common.createCrown(crownSize, 0, 0, 1, 1);
        tr.appendChild(th);
        th.appendChild(svg);
        svg.appendChild(crown);
      }
      {
        const td = document.createElement('td');
        td.innerText = numLineSolvedBest;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numPointSolvedBest;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numSpecialSolvedBest;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numTotalSolvedBest;
        td.classList.add('total-col');
        tr.appendChild(td);
      }
    }

    // クリア済み
    {
      const tr = document.createElement('tr');
      tbody.appendChild(tr);
      {
        const th = document.createElement('th');
        const svg = app.svg.createSvg();
        svg.setAttribute('width', crownSize);
        svg.setAttribute('height', crownSize);
        const crown = app.common.createCrown(crownSize, 0, 0, 1, 0);
        tr.appendChild(th);
        th.appendChild(svg);
        svg.appendChild(crown);
      }
      {
        const td = document.createElement('td');
        td.innerText = numLineSolvedNormal;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numPointSolvedNormal;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numSpecialSolvedNormal;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numTotalSolvedNormal;
        td.classList.add('total-col');
        tr.appendChild(td);
      }
    }

    // 未クリア
    {
      const tr = document.createElement('tr');
      tbody.appendChild(tr);
      {
        const th = document.createElement('th');
        const svg = app.svg.createSvg();
        svg.setAttribute('width', crownSize);
        svg.setAttribute('height', crownSize);
        const crown = app.common.createCrown(crownSize, 0, 0, null, 1);
        tr.appendChild(th);
        th.appendChild(svg);
        svg.appendChild(crown);
      }
      {
        const td = document.createElement('td');
        td.innerText = numLineNotSolved;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numPointNotSolved;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numSpecialNotSolved;
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numTotalNotSolved;
        td.classList.add('total-col');
        tr.appendChild(td);
      }
    }

    // 合計
    {
      const tr = document.createElement('tr');
      tbody.appendChild(tr);
      {
        const th = document.createElement('th');
        th.innerText = 'Total';
        th.classList.add('total-row');
        tr.appendChild(th);
      }
      {
        const td = document.createElement('td');
        td.innerText = numLineTotal;
        td.classList.add('total-row');
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numPointTotal;
        td.classList.add('total-row');
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numSpecialTotal;
        td.classList.add('total-row');
        tr.appendChild(td);
      }
      {
        const td = document.createElement('td');
        td.innerText = numTotalTotal;
        td.classList.add('total-row');
        td.classList.add('total-col');
        tr.appendChild(td);
      }
    }

    return tbody;
  }

  function close() {
    elems.records.dialog.close();
  }
})();
