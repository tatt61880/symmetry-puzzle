(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.Elems !== undefined);

  const elems = new app.Elems({
    viewport: 'viewport',
    header: 'header',
    footer: 'footer',
    top: 'top',

    iconTitle: 'icon-title',
    iconLine: 'icon-line',
    iconPoint: 'icon-point',
    iconSpecial: 'icon-special',

    iconTitle123: 'icon-title-123',
    iconLine123: 'icon-line-123',
    iconPoint123: 'icon-point-123',
    iconSpecial123: 'icon-special-123',

    appTitle: 'app-title',
    version: 'title-version',

    contents: 'contents',

    // ヘルプダイアログ
    help: {
      button: 'button-help',
      dialog: 'dialog-help',
      dialogDiv: 'dialog-help-div',

      close: 'dialog-help-close',
      sound: 'setting-sound-toggle',
      langJa: 'setting-lang-ja',
      langEn: 'setting-lang-en',

      tabApp: 'help-tab-app',
      tabLine: 'help-tab-line',
      tabPoint: 'help-tab-point',
      tabSpecial: 'help-tab-special',

      version: 'dialog-help-version',
    },

    // 記録ダイアログ
    records: {
      version: 'record-dialog-version',
      button: 'button-records',
      buttonSvg: 'button-records-svg',
      dialog: 'dialog-records',
      dialogDiv: 'dialog-records-div',
      close: 'dialog-records-close',
      tableDiv: 'records-table-div',

      icon: {
        shortest: 'records-icon-shortest',
        cleared: 'records-icon-cleared',
        uncleared: 'records-icon-uncleared',
      },

      line: {
        shortest: 'records-line-shortest',
        cleared: 'records-line-cleared',
        uncleared: 'records-line-uncleared',
        shapes: {
          numerator: 'records-line-shapes-numerator',
          line: 'records-line-shapes-line',
          denumerator: 'records-line-shapes-denumerator',
        },
        num: 'records-line-seq',
      },

      point: {
        shortest: 'records-point-shortest',
        cleared: 'records-point-cleared',
        uncleared: 'records-point-uncleared',
        shapes: {
          numerator: 'records-point-shapes-numerator',
          line: 'records-point-shapes-line',
          denumerator: 'records-point-shapes-denumerator',
        },
        num: 'records-point-seq',
      },

      special: {
        shortest: 'records-special-shortest',
        cleared: 'records-special-cleared',
        uncleared: 'records-special-uncleared',
        shapes: {
          numerator: 'records-special-shapes-numerator',
          line: 'records-special-shapes-line',
          denumerator: 'records-special-shapes-denumerator',
        },
        num: 'records-special-seq',
      },

      seqMode: 'record-seq-mode',

      backup: 'record-button-backup',
      restore: 'record-button-restore',

      alert: {
        backdrop: 'dialog-records-alert-backdrop',
        message: 'dialog-records-alert-message',
        button: 'dialog-records-alert-button',
      },
    },

    // 実績ダイアログ
    achievements: {
      version: 'record-dialog-version',
      button: 'button-achievements',
      buttonSvg: 'button-achievements-svg',
      dialog: 'dialog-achievements',
      dialogDiv: 'dialog-achievements-div',
      close: 'dialog-achievements-close',
      tableDiv: 'achievements-table-div',
      line: {
        solved: 'achievements-line-solved',
      },
      point: {
        solved: 'achievements-point-solved',
      },
      special: {
        solved: 'achievements-special-solved',
      },
    },

    category: {
      title: 'title',
      game: 'game',
    },

    // タイトル画面
    title: {
      inner: 'title-inner',
      buttonNormalsTr: 'button-normals-tr',
      buttonNormalLine: 'button-normal-line',
      buttonNormalPoint: 'button-normal-point',
      buttonNormalSpecial: 'button-normal-special',
      buttonSeqsTr: 'button-seqs-tr',
      buttonSeqLine: 'button-seq-line',
      buttonSeqPoint: 'button-seq-point',
      buttonSeqSpecial: 'button-seq-special',
      buttonToggleToNormalDiv: 'button-toggle-to-normal-div',
      buttonToggleToSeqDiv: 'button-toggle-to-seq-div',
      buttonToggleToNormal: 'button-toggle-to-normal',
      buttonToggleToSeq: 'button-toggle-to-seq',
      // buttonEdit: 'button-edit',
    },

    // レベル
    level: {
      widget: 'level-widget',
      retry: 'button-level-retry',
      retryArrow: 'button-level-retry-arrow',
      prev: 'button-level-prev',
      id: 'level-id',
      next: 'button-level-next',
      edit: 'button-level-edit',
    },

    // レベルダイアログ
    levels: {
      button: 'button-levels',
      dialog: 'dialog-levels',
      dialogDiv: 'dialog-levels-div',
      close: 'dialog-levels-close',
      display: {
        button: 'display-button',
        checkbox: 'display-checkbox',
        crown: 'display-crown',
      },
      toggleDiv: 'toggle-div',
      dialogSvg: 'dialog-levels-svg',
      buttonSvg: 'button-levels-svg',
      prev: 'button-levels-prev',
      next: 'button-levels-next',
    },

    // メニューダイアログ
    menu: {
      button: 'controller-buttons-menu',
      dialog: 'dialog-menu',
      dialogDiv: 'dialog-menu-div',
      close: 'dialog-menu-close',
      title: 'dialog-menu-buttons-title',
      retry: 'dialog-menu-buttons-retry',
    },

    // 形状ダイアログ
    shapes: {
      buttonG: 'button-shapes-g',
      button: 'button-shapes',
      buttonNumerator: 'button-shapes-numerator',
      buttonLine: 'button-shapes-line',
      buttonDenumerator: 'button-shapes-denumerator',
      dialog: 'dialog-shapes',
      dialogDiv: 'dialog-shapes-div',
      close: 'dialog-shapes-close',
      dialogSvg: 'dialog-shapes-svg',
      buttonSvg: 'button-shapes-svg',
      prev: 'button-shapes-prev',
      next: 'button-shapes-next',
    },

    main: {
      div: 'main-div',
      svg: 'main-svg',
    },

    // オートモード
    auto: {
      buttons: 'buttons-auto',
      buttonStop: 'button-stop',
      buttonStart: 'button-start',
      buttonPause: 'button-pause',
      buttonEnd: 'button-end',
      buttonSpeedDown: 'button-speed-down',
      buttonSpeedUp: 'button-speed-up',
    },

    // エディトモード
    edit: {
      widget: 'edit-widget',
      drawing: 'edit-drawing-shape',
      undo: 'button-undo-edit',
      redo: 'button-redo-edit',
      buttons: {
        axis: 'edit-buttons-axis',
        axisL1: 'edit-buttons-axis-line1',
        axisL2: 'edit-buttons-axis-line2',
        axisL3: 'edit-buttons-axis-line3',
        axisL4: 'edit-buttons-axis-line4',
        axisP1: 'edit-buttons-axis-point1',
        axisP2: 'edit-buttons-axis-point2',
      },

      switchMode: 'edit-switch-mode',
      mirror: 'edit-mirror',
      rotate: 'edit-rotate',
      normalize: 'edit-normalize',
    },

    // コントローラー
    controller: {
      widget: 'controller-widget',
      undo: 'button-undo',
      redo: 'button-redo',
      nextLevel: 'next-level',
      prevLevel: 'prev-level',
      shareLevel: 'share-level',
      shareLevelX: 'share-level-x',
      shareLevelBluesky: 'share-level-bluesky',

      buttons: {
        root: 'controller-buttons-root',
        base: 'controller-buttons-base',

        up: 'controller-buttons-up',
        right: 'controller-buttons-right',
        down: 'controller-buttons-down',
        left: 'controller-buttons-left',
        axis: 'controller-buttons-axis',

        axisL1: 'controller-buttons-axis-line1',
        axisL2: 'controller-buttons-axis-line2',
        axisL3: 'controller-buttons-axis-line3',
        axisL4: 'controller-buttons-axis-line4',
        axisP1: 'controller-buttons-axis-point1',
        axisP2: 'controller-buttons-axis-point2',
      },
    },

    // コンソール
    console: {
      widget: 'console-widget',
      image: 'console-image',
      log: 'console-log',
    },
  });

  window.app.elems = elems;
})();
