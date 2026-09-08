(function (global) {
  'use strict';

  function createSfx(audioCtx, destination, opts = {}) {
    const bumpBoost = typeof opts.bumpBoost === 'number' ? opts.bumpBoost : 1.4;
    // 連打抑制（秒）
    const minStepIntervalSec = typeof opts.minStepIntervalSec === 'number' ? opts.minStepIntervalSec : 0.06; // 60ms
    const minBumpIntervalSec = typeof opts.minBumpIntervalSec === 'number' ? opts.minBumpIntervalSec : 0.06;
    const minUndoIntervalSec = typeof opts.minUndoIntervalSec === 'number' ? opts.minUndoIntervalSec : 0.04;
    const minRedoIntervalSec = typeof opts.minRedoIntervalSec === 'number' ? opts.minRedoIntervalSec : 0.04;
    const minStartIntervalSec = typeof opts.minStartIntervalSec === 'number' ? opts.minStartIntervalSec : 0.12;
    const minClearIntervalSec = typeof opts.minClearIntervalSec === 'number' ? opts.minClearIntervalSec : 0.2;
    const minUiIntervalSec = typeof opts.minUiIntervalSec === 'number' ? opts.minUiIntervalSec : 0.06;
    const minButtonIntervalSec = typeof opts.minButtonIntervalSec === 'number' ? opts.minButtonIntervalSec : 0.045;
    let lastStepAt = -1;
    let lastBumpAt = -1;
    let lastUndoAt = -1;
    let lastRedoAt = -1;
    let lastStartAt = -1;
    let lastClearAt = -1;
    let lastUiAt = -1;
    let lastButtonAt = -1;

    function playStep() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      if (lastStepAt >= 0 && t0 - lastStepAt < minStepIntervalSec) return;
      lastStepAt = t0;
      const oscHi = audioCtx.createOscillator();
      oscHi.type = 'triangle';
      oscHi.frequency.setValueAtTime(1050, t0);
      oscHi.frequency.exponentialRampToValueAtTime(820, t0 + 0.06);

      const hiGain = audioCtx.createGain();
      hiGain.gain.setValueAtTime(0.0001, t0);
      hiGain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.009);
      hiGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      const hiLP = audioCtx.createBiquadFilter();
      hiLP.type = 'lowpass';
      hiLP.frequency.setValueAtTime(2600, t0);

      const oscLo = audioCtx.createOscillator();
      oscLo.type = 'sine';
      oscLo.frequency.setValueAtTime(400, t0);
      oscLo.frequency.exponentialRampToValueAtTime(300, t0 + 0.08);
      const loGain = audioCtx.createGain();
      loGain.gain.setValueAtTime(0.0001, t0);
      loGain.gain.exponentialRampToValueAtTime(0.13, t0 + 0.01);
      loGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      const noiseDur = 0.028;
      const noiseBuf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * noiseDur), audioCtx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const x = i / data.length;
        const env = Math.exp(-18 * x);
        data[i] = (Math.random() * 2 - 1) * 0.22 * env;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuf;
      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(850, t0);

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2600, t0);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t0);
      noiseGain.gain.exponentialRampToValueAtTime(0.075, t0 + 0.006);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(6.2, t0);

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.setValueAtTime(4.8, t0);
      lfo.connect(lfoGain);
      lfoGain.connect(oscHi.frequency);

      oscHi.connect(hiGain);
      hiGain.connect(hiLP);
      hiLP.connect(destination);

      oscLo.connect(loGain);
      loGain.connect(destination);
      noise.connect(hp);
      hp.connect(lp);
      lp.connect(noiseGain);
      noiseGain.connect(destination);

      lfo.start(t0);
      oscHi.start(t0);
      oscLo.start(t0);
      noise.start(t0);

      noise.stop(t0 + noiseDur);
      oscHi.stop(t0 + 0.15);
      oscLo.stop(t0 + 0.17);
      lfo.stop(t0 + 0.15);
    }

    function playBump() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;
      if (lastBumpAt >= 0 && t0 - lastBumpAt < minBumpIntervalSec) return;
      lastBumpAt = t0;

      const bumpGain = audioCtx.createGain();
      bumpGain.gain.setValueAtTime(bumpBoost, t0);
      bumpGain.connect(destination);
      const noiseDur = 0.02;
      const noiseBuf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * noiseDur), audioCtx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const x = i / data.length;
        const env = Math.exp(-22 * x);
        data[i] = Math.tanh((Math.random() * 2 - 1) * 1.4) * 0.55 * env;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuf;
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2200, t0);

      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(180, t0);

      const nGain = audioCtx.createGain();
      nGain.gain.setValueAtTime(0.0001, t0);
      nGain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.002);
      nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, t0);
      osc.frequency.exponentialRampToValueAtTime(170, t0 + 0.05);

      const oGain = audioCtx.createGain();
      oGain.gain.setValueAtTime(0.0001, t0);
      oGain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.003);
      oGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);

      noise.connect(hp);
      hp.connect(lp);
      lp.connect(nGain);
      nGain.connect(bumpGain);
      osc.connect(oGain);
      oGain.connect(bumpGain);

      noise.start(t0);
      osc.start(t0);

      noise.stop(t0 + noiseDur);
      osc.stop(t0 + 0.1);

      setTimeout(() => {
        try {
          bumpGain.disconnect();
        } catch (_) {}
      }, 200);
    }

    function playUndo() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      if (lastUndoAt >= 0 && t0 - lastUndoAt < minUndoIntervalSec) return;
      lastUndoAt = t0;
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(720, t0);
      osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.12);

      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2600, t0);
      osc.connect(g);
      g.connect(lp);
      lp.connect(destination);

      osc.start(t0);
      osc.stop(t0 + 0.2);
    }

    function playRedo() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      if (lastRedoAt >= 0 && t0 - lastRedoAt < minRedoIntervalSec) return;
      lastRedoAt = t0;
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t0);
      osc.frequency.exponentialRampToValueAtTime(860, t0 + 0.11);

      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.007);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3200, t0);

      osc.connect(g);
      g.connect(lp);
      lp.connect(destination);

      osc.start(t0);
      osc.stop(t0 + 0.18);
    }

    function playStart() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      if (lastStartAt >= 0 && t0 - lastStartAt < minStartIntervalSec) return;
      lastStartAt = t0;
      const notes = [
        { f: 784, dt: 0.0 },
        { f: 1047, dt: 0.1 },
      ];

      for (const n of notes) {
        const t = t0 + n.dt;

        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, t);

        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3600, t);

        osc.connect(g);
        g.connect(lp);
        lp.connect(destination);

        osc.start(t);
        osc.stop(t + 0.15);
      }
    }

    function playClear() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      if (lastClearAt >= 0 && t0 - lastClearAt < minClearIntervalSec) return;
      lastClearAt = t0;
      const notes = [
        { f: 740, dt: 0.0 },
        { f: 988, dt: 0.1 },
        { f: 1319, dt: 0.2 },
        { f: 1760, dt: 0.3 },
      ];

      const delay = audioCtx.createDelay(0.25);
      delay.delayTime.setValueAtTime(0.11, t0);

      const fb = audioCtx.createGain();
      fb.gain.setValueAtTime(0.18, t0);

      delay.connect(fb);
      fb.connect(delay);
      const mix = audioCtx.createGain();
      mix.gain.setValueAtTime(1.0, t0);
      mix.connect(destination);
      delay.connect(destination);

      for (const n of notes) {
        const t = t0 + n.dt;

        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, t);
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

        osc.connect(g);
        g.connect(mix);
        g.connect(delay);

        osc.start(t);
        osc.stop(t + 0.16);
      }
      setTimeout(() => {
        try {
          delay.disconnect();
        } catch (_) {}
        try {
          fb.disconnect();
        } catch (_) {}
        try {
          mix.disconnect();
        } catch (_) {}
      }, 700);
    }

    function playUiOpen() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      if (lastUiAt >= 0 && t0 - lastUiAt < minUiIntervalSec) return;
      lastUiAt = t0;
      // ふわっと「ぽん♪」（上がる）
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, t0);
      osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.09);

      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2800, t0);

      osc.connect(g);
      g.connect(lp);
      lp.connect(destination);

      osc.start(t0);
      osc.stop(t0 + 0.16);
    }

    function playUiClose() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      if (lastUiAt >= 0 && t0 - lastUiAt < minUiIntervalSec) return;
      lastUiAt = t0;
      // すっと「ぽ」 （下がる）
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(740, t0);
      osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.09);

      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2500, t0);

      osc.connect(g);
      g.connect(lp);
      lp.connect(destination);

      osc.start(t0);
      osc.stop(t0 + 0.15);
    }

    function playButton() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      if (lastButtonAt >= 0 && t0 - lastButtonAt < minButtonIntervalSec) return;
      lastButtonAt = t0;
      // ちいさく「コッ」（短いクリック＋少し丸める）
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(980, t0);
      osc.frequency.exponentialRampToValueAtTime(780, t0 + 0.05);

      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3000, t0);
      // ほんの少しノイズを足してクリック感（弱め）
      const noiseDur = 0.012;
      const noiseBuf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * noiseDur), audioCtx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const x = i / data.length;
        const env = Math.exp(-28 * x);
        data[i] = (Math.random() * 2 - 1) * 0.1 * env;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuf;
      const nlp = audioCtx.createBiquadFilter();
      nlp.type = 'lowpass';
      nlp.frequency.setValueAtTime(3400, t0);

      const ng = audioCtx.createGain();
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.exponentialRampToValueAtTime(0.06, t0 + 0.003);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);

      osc.connect(g);
      g.connect(lp);
      lp.connect(destination);

      noise.connect(nlp);
      nlp.connect(ng);
      ng.connect(destination);
      osc.start(t0);
      noise.start(t0);

      noise.stop(t0 + noiseDur);
      osc.stop(t0 + 0.09);
    }

    return { playStep, playBump, playUndo, playRedo, playStart, playClear, playUiOpen, playUiClose, playButton };
  }

  /**
   * Symmetry Puzzle BGM — "Reflection / 反射"
   * 外部音源・ライブラリ不要。sound.js の createBgm() と差し替えて使用します。
   * 32小節 / 4拍子 / 92 BPM（既存の呼び出し設定をそのまま使用）。
   * A → A' → B → A''。音符は「音名:拍数」、R は休符です。
   */
  function createBgm(audioCtx, destination, opts = {}) {
    const numberInRange = (value, fallback, min, max) =>
      Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    const tempo = numberInRange(opts.tempo, 92, 40, 180);
    const tickMs = numberInRange(opts.tickMs, 25, 10, 100);
    const lookAheadSec = numberInRange(opts.lookAheadSec, 0.18, tickMs / 1000 + 0.06, 0.6);
    const beatSec = 60 / tempo;
    const stepSec = beatSec / 2;
    const leadSec = 0.035;

    // 調整する場合は、まずこの4つの値を変更してください。
    const mix = {
      melody: 0.12,
      arpeggio: 0.033,
      pad: 0.019,
      bass: 0.085,
    };

    const pitches = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function midi(note) {
      const match = /^([A-G])([#b]?)([0-8])$/.exec(note);
      if (!match) throw new Error(`Invalid BGM note: ${note}`);
      const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
      return (Number(match[3]) + 1) * 12 + pitches[match[1]] + accidental;
    }
    const hz = (note) => 440 * Math.pow(2, (note - 69) / 12);

    // 低音と和音を別に記述。転回形で声部の大きな跳躍を抑えています。
    const chordData = {
      C: ['C3', 'E4 G4 B4 D5'], // Cmaj9
      GB: ['B2', 'D4 G4 A4 B4'], // Gadd9/B
      Am: ['A2', 'C4 E4 G4 B4'], // Am9
      Em: ['E3', 'D4 E4 G4 B4'], // Em7
      F: ['F2', 'C4 E4 G4 A4'], // Fmaj9
      CE: ['E3', 'C4 D4 G4 B4'], // Cmaj9/E
      Dm: ['D3', 'C4 E4 F4 A4'], // Dm9
      G: ['G2', 'B3 D4 F4 A4'], // G9
      EmG: ['G2', 'D4 E4 G4 B4'], // Em7/G
      AmC: ['C3', 'C4 E4 G4 B4'], // Am9/C
    };
    const chords = {};
    for (const [name, [bass, notes]] of Object.entries(chordData)) {
      chords[name] = { bass: midi(bass), notes: notes.split(' ').map(midi) };
    }

    // 同じ主題を保ちつつ、終止・休符・音域で展開を作る固定の譜面です。
    const score = [
      ['C', 'E5:1 G5:0.5 A5:0.5 G5:1 E5:0.5 R:0.5'],
      ['GB', 'D5:1 G5:1 D5:1 R:1'],
      ['Am', 'C5:0.5 E5:0.5 G5:1 E5:1 C5:0.5 R:0.5'],
      ['Em', 'B4:1 D5:1 E5:1 R:1'],
      ['F', 'C5:1 E5:0.5 G5:0.5 A5:1 G5:0.5 R:0.5'],
      ['CE', 'G5:1 E5:1 D5:0.5 E5:0.5 R:1'],
      ['Dm', 'F5:1 E5:0.5 D5:0.5 A4:1 C5:1'],
      ['G', 'D5:1 B4:1 G4:1 R:1'],

      ['C', 'E5:0.5 G5:0.5 A5:1 G5:0.5 E5:0.5 D5:0.5 R:0.5'],
      ['GB', 'B4:0.5 D5:0.5 G5:1 A5:0.5 G5:0.5 R:1'],
      ['Am', 'E5:1 G5:0.5 A5:0.5 G5:1 E5:0.5 R:0.5'],
      ['Em', 'D5:1 B4:0.5 D5:0.5 E5:1 R:1'],
      ['F', 'A5:1 G5:0.5 E5:0.5 C5:1 E5:0.5 R:0.5'],
      ['CE', 'G5:1 E5:0.5 D5:0.5 E5:1 R:1'],
      ['Dm', 'F5:0.5 E5:0.5 D5:1 C5:1 A4:0.5 R:0.5'],
      ['G', 'B4:1 D5:1 R:2'],

      ['Am', 'C5:1.5 E5:0.5 B4:1 R:1'],
      ['EmG', 'B4:1 D5:1 E5:1 R:1'],
      ['F', 'A4:1 C5:0.5 E5:0.5 G5:1 R:1'],
      ['CE', 'E5:1.5 D5:0.5 C5:1 R:1'],
      ['Dm', 'A4:1 C5:1 D5:1 R:1'],
      ['AmC', 'E5:1 C5:0.5 B4:0.5 A4:1 R:1'],
      ['F', 'C5:1 E5:1 G5:1 R:1'],
      ['G', 'A5:1 G5:0.5 F5:0.5 D5:1 R:1'],

      ['C', 'E5:1 G5:0.5 A5:0.5 G5:1 E5:0.5 R:0.5'],
      ['GB', 'D5:1 G5:1 A5:0.5 G5:0.5 R:1'],
      ['Am', 'C5:0.5 E5:0.5 G5:1 A5:0.5 G5:0.5 E5:0.5 R:0.5'],
      ['Em', 'D5:1 B4:1 E5:1 R:1'],
      ['F', 'C5:1 E5:0.5 G5:0.5 A5:1 G5:0.5 R:0.5'],
      ['CE', 'G5:1 E5:1 D5:0.5 C5:0.5 R:1'],
      ['Dm', 'A4:0.5 C5:0.5 D5:1 F5:1 E5:0.5 R:0.5'],
      ['G', 'D5:1 B4:1 R:2'],
    ];

    const bars = score.map(([name, phrase], barIndex) => {
      const events = Array.from({ length: 8 }, () => []);
      let pos = 0;
      for (const token of phrase.split(' ')) {
        const [note, value] = token.split(':');
        const beats = Number(value);
        if (!(beats > 0) || !Number.isInteger(beats * 2) || pos + beats * 2 > 8) {
          throw new Error(`Invalid BGM rhythm in bar ${barIndex + 1}`);
        }
        if (note !== 'R') events[pos].push({ note: midi(note), beats });
        pos += beats * 2;
      }
      if (pos !== 8) throw new Error(`BGM bar ${barIndex + 1} must have four beats`);
      return { chord: chords[name], events };
    });
    const length = bars.length * 8;
    const wrap = (step) => ((Math.floor(step) % length) + length) % length;

    // 1音ごとに多数の倍音用発振器を作らず、波形を共有します。
    const makeWave = (harmonics) =>
      audioCtx.createPeriodicWave(new Float32Array(harmonics.length), new Float32Array(harmonics));
    const keyWave = makeWave([0, 1, 0.16, 0.055, 0.018]);
    const bassWave = makeWave([0, 1, 0.2, 0.07, 0.018]);

    const volume = audioCtx.createGain();
    volume.gain.value = 0;
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 14;
    comp.ratio.value = 2;
    comp.attack.value = 0.015;
    comp.release.value = 0.22;
    comp.connect(volume);
    volume.connect(destination);

    let playing = false;
    let disposed = false;
    let timerId = null;
    let session = null;
    const retired = new Set();
    let cursorStep = 0;
    let cursorDelay = 0;
    let originStep = 0;
    let originTime = 0;
    let nextStep = 0;
    let nextTime = 0;
    let targetVolume = 0.25;

    function disconnect(node) {
      try {
        node.disconnect();
      } catch (_) {
        // 既に閉じられた AudioContext の後片付けも許容します。
      }
    }

    function fade(param, value, time, duration) {
      // Safari 等で cancelAndHoldAtTime がない場合のフォールバック。
      if (typeof param.cancelAndHoldAtTime === 'function') {
        param.cancelAndHoldAtTime(time);
      } else {
        const current = param.value;
        param.cancelScheduledValues(time);
        param.setValueAtTime(current, time);
      }
      param.linearRampToValueAtTime(value, time + duration);
    }

    function createSession(time) {
      const nodes = [];
      const keep = (node) => {
        nodes.push(node);
        return node;
      };
      const gate = keep(audioCtx.createGain());
      gate.gain.setValueAtTime(0, time);
      gate.gain.linearRampToValueAtTime(1, time + 0.55);
      gate.connect(comp);

      const sum = keep(audioCtx.createBiquadFilter());
      sum.type = 'highpass';
      sum.frequency.value = 45;
      sum.Q.value = 0.5;
      sum.connect(gate);

      const keys = keep(audioCtx.createBiquadFilter());
      keys.type = 'lowpass';
      keys.frequency.value = 3600;
      keys.Q.value = 0.45;
      keys.connect(sum);
      const pad = keep(audioCtx.createBiquadFilter());
      pad.type = 'lowpass';
      pad.frequency.value = 1450;
      pad.Q.value = 0.45;
      pad.connect(sum);
      const bass = keep(audioCtx.createBiquadFilter());
      bass.type = 'lowpass';
      bass.frequency.value = 650;
      bass.Q.value = 0.45;
      bass.connect(sum);

      // 付点8分音符のディレイ。低音・パッドには掛けず、濁りを抑えます。
      const send = keep(audioCtx.createGain());
      send.gain.value = 0.2;
      keys.connect(send);
      const echoFilter = keep(audioCtx.createBiquadFilter());
      echoFilter.type = 'lowpass';
      echoFilter.frequency.value = 1800;
      echoFilter.Q.value = 0.4;
      send.connect(echoFilter);
      const left = keep(audioCtx.createDelay(3));
      const right = keep(audioCtx.createDelay(3));
      left.delayTime.value = beatSec * 0.75;
      right.delayTime.value = beatSec * 0.75;
      const feedbackL = keep(audioCtx.createGain());
      const feedbackR = keep(audioCtx.createGain());
      feedbackL.gain.value = 0.26;
      feedbackR.gain.value = 0.26;
      echoFilter.connect(left);
      left.connect(feedbackL);
      feedbackL.connect(right);
      right.connect(feedbackR);
      feedbackR.connect(left);
      for (const [delay, pan] of [[left, -0.42], [right, 0.42]]) {
        if (typeof audioCtx.createStereoPanner === 'function') {
          const panner = keep(audioCtx.createStereoPanner());
          panner.pan.value = pan;
          delay.connect(panner);
          panner.connect(sum);
        } else {
          delay.connect(sum);
        }
      }
      return { gate, keys, pad, bass, nodes, voices: new Set(), cleanupTimer: null, destroyed: false };
    }

    function addVoice(s, sources, nodes, start, end) {
      const voice = { sources, nodes, start, end };
      s.voices.add(voice);
      sources[0].onended = () => {
        for (const node of nodes) disconnect(node);
        s.voices.delete(voice);
      };
      for (const source of sources) {
        source.start(start);
        source.stop(end);
      }
    }

    function outputFor(s, bus, pan, nodes) {
      if (typeof audioCtx.createStereoPanner !== 'function') return s[bus];
      const panner = audioCtx.createStereoPanner();
      panner.pan.value = pan;
      panner.connect(s[bus]);
      nodes.push(panner);
      return panner;
    }

    function pluck(s, time, note, beats, amplitude, pan, isArp = false) {
      const duration = Math.max(0.15, beats * beatSec);
      const end = time + duration + 0.25;
      const body = audioCtx.createOscillator();
      body.setPeriodicWave(keyWave);
      body.frequency.setValueAtTime(hz(note), time);
      const envelope = audioCtx.createGain();
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(amplitude, time + 0.012);
      envelope.gain.exponentialRampToValueAtTime(amplitude * 0.3, time + duration * 0.55);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end - 0.02);
      envelope.gain.linearRampToValueAtTime(0, end);
      body.connect(envelope);
      const nodes = [body, envelope];
      const output = outputFor(s, 'keys', pan, nodes);
      envelope.connect(output);
      const sources = [body];

      if (!isArp) {
        // 倍音だけ先に減衰させる、小さなエレピ風のアタック。
        const tine = audioCtx.createOscillator();
        tine.type = 'sine';
        tine.frequency.setValueAtTime(hz(note) * 2, time);
        const tineGain = audioCtx.createGain();
        tineGain.gain.setValueAtTime(0, time);
        tineGain.gain.linearRampToValueAtTime(amplitude * 0.18, time + 0.006);
        tineGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.24, duration));
        tineGain.gain.linearRampToValueAtTime(0, end);
        tine.connect(tineGain);
        tineGain.connect(output);
        sources.push(tine);
        nodes.push(tine, tineGain);
      }
      addVoice(s, sources, nodes, time, end);
    }

    function playPad(s, time, chord, beats, scale) {
      const duration = beats * beatSec;
      chord.notes.forEach((note, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(hz(note), time);
        osc.detune.value = [-2, 1, 2, -1][i];
        const env = audioCtx.createGain();
        const amp = mix.pad * scale * (i === 3 ? 0.7 : 1);
        const attack = Math.min(0.28, duration * 0.3);
        const end = time + duration + 0.4;
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(amp, time + attack);
        env.gain.linearRampToValueAtTime(amp * 0.72, time + duration * 0.8);
        env.gain.linearRampToValueAtTime(0, end);
        osc.connect(env);
        const nodes = [osc, env];
        env.connect(outputFor(s, 'pad', (i - 1.5) * 0.17, nodes));
        addVoice(s, [osc], nodes, time, end);
      });
    }

    function playBass(s, time, note, beats, scale) {
      const osc = audioCtx.createOscillator();
      osc.setPeriodicWave(bassWave);
      osc.frequency.setValueAtTime(hz(note), time);
      const env = audioCtx.createGain();
      const duration = Math.max(0.1, beats * beatSec);
      const end = time + duration + 0.15;
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(mix.bass * scale, time + 0.025);
      env.gain.exponentialRampToValueAtTime(mix.bass * scale * 0.42, time + duration * 0.65);
      env.gain.exponentialRampToValueAtTime(0.0001, end - 0.015);
      env.gain.linearRampToValueAtTime(0, end);
      osc.connect(env);
      env.connect(s.bass);
      addVoice(s, [osc], [osc, env], time, end);
    }

    function restoreHarmony(s, step, time) {
      const inBar = step % 8;
      if (inBar === 0) return; // 小節頭は scheduleStep 側で鳴らします。
      const bar = bars[Math.floor(step / 8)];
      const remaining = (8 - inBar) / 2;
      playPad(s, time, bar.chord, remaining, 0.8);
      playBass(s, time, bar.chord.bass, Math.min(remaining, 2.6), 0.65);
    }

    function scheduleStep(s, step, time) {
      const barIndex = Math.floor(step / 8);
      const inBar = step % 8;
      const section = Math.floor(barIndex / 8);
      const { chord, events } = bars[barIndex];
      const quiet = section === 2;
      const phraseScale = quiet ? 0.82 : section === 3 ? 1.02 : 0.94;

      if (inBar === 0) {
        playPad(s, time, chord, 4, quiet ? 1.06 : 0.86);
        playBass(s, time, chord.bass, 2.9, quiet ? 0.82 : 1);
      }
      if (inBar === 6 && !quiet) {
        playBass(s, time, chord.bass, 0.8, 0.48);
      }

      for (const event of events[inBar]) {
        const accent = inBar === 0 ? 1 : inBar % 2 === 0 ? 0.92 : 0.82;
        pluck(s, time, event.note, event.beats * 0.9, mix.melody * phraseScale * accent, -0.08);
      }

      // 上り下りを折り返す伴奏。B部分は音数を減らして余白を作ります。
      const arpSteps = quiet ? [2, 6] : section === 1 ? [0, 1, 2, 4, 5, 6] : [0, 2, 4, 6];
      if (arpSteps.includes(inBar)) {
        const contour = barIndex % 2 === 0 ? [0, 1, 2, 3, 3, 2, 1, 0] : [3, 2, 1, 0, 0, 1, 2, 3];
        const note = chord.notes[contour[inBar]];
        const accent = [1, 0.6, 0.78, 0.6, 0.9, 0.6, 0.75, 0.55][inBar];
        const pan = barIndex % 2 === 0 ? 0.28 : -0.28;
        pluck(s, time + 0.008, note, 0.55, mix.arpeggio * accent * (quiet ? 0.72 : 1), pan, true);
      }
    }

    function clearTimer() {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function destroySession(s) {
      if (s.destroyed) return;
      s.destroyed = true;
      if (s.cleanupTimer !== null) clearTimeout(s.cleanupTimer);
      for (const voice of s.voices) {
        for (const source of voice.sources) {
          try {
            source.stop();
          } catch (_) {
            // 既に終了済みの音源は無視します。
          }
          source.onended = null;
        }
        for (const node of voice.nodes) disconnect(node);
      }
      s.voices.clear();
      for (const node of s.nodes) disconnect(node);
      retired.delete(s);
    }

    function retireSession(duration) {
      if (!session) return;
      const old = session;
      session = null;
      const time = audioCtx.currentTime;
      if (audioCtx.state !== 'running') {
        destroySession(old);
        return;
      }
      fade(old.gate.gain, 0, time, duration);
      for (const voice of old.voices) {
        // 先読み済みでも、まだ鳴っていない音は直ちに取り消します。
        const end = voice.start >= time ? time : Math.min(voice.end, time + duration);
        for (const source of voice.sources) {
          try {
            source.stop(end);
          } catch (_) {
            // 終了と停止要求の競合を許容します。
          }
        }
      }
      retired.add(old);
      old.cleanupTimer = setTimeout(() => destroySession(old), Math.ceil(duration * 1000) + 80);
    }

    function positionAt(time) {
      const elapsed = (time - originTime) / stepSec;
      const offset = Math.max(0, Math.ceil(elapsed - 1e-7));
      return {
        step: wrap(originStep + offset),
        delay: Math.max(0, Math.min(stepSec, originTime + offset * stepSec - time)),
      };
    }

    function tick() {
      if (!playing || disposed) return;
      if (audioCtx.state === 'closed') {
        dispose();
        return;
      }
      if (audioCtx.state !== 'running') return;
      const now = audioCtx.currentTime;
      if (nextTime < now) {
        // メインスレッドが遅れた場合、過去の音を一斉に再生せず時間軸を進めます。
        const skipped = Math.ceil((now + leadSec - nextTime) / stepSec);
        nextStep = wrap(nextStep + skipped);
        nextTime += skipped * stepSec;
        restoreHarmony(session, nextStep, nextTime);
      }
      while (nextTime < now + lookAheadSec) {
        scheduleStep(session, nextStep, nextTime);
        nextTime += stepSec;
        nextStep = wrap(nextStep + 1);
      }
    }

    function start(value = 0.25, fromCursor = false) {
      if (disposed || playing || audioCtx.state !== 'running') return;
      targetVolume = numberInRange(value, targetVolume, 0, 1);
      const now = audioCtx.currentTime;
      originStep = fromCursor ? cursorStep : 0;
      originTime = now + leadSec + (fromCursor ? cursorDelay : 0);
      nextStep = originStep;
      nextTime = originTime;
      if (!fromCursor) {
        cursorStep = 0;
        cursorDelay = 0;
      }
      session = createSession(now);
      playing = true;
      fade(volume.gain, targetVolume, now, 0.12);
      restoreHarmony(session, originStep, originTime);
      tick();
      timerId = setInterval(tick, tickMs);
    }

    function pause() {
      if (!playing || disposed) return;
      const position = positionAt(audioCtx.currentTime);
      cursorStep = position.step;
      cursorDelay = position.delay;
      playing = false;
      clearTimer();
      retireSession(0.12);
    }

    function resume(value = targetVolume) {
      start(value, true);
    }

    function stop() {
      if (disposed) return;
      playing = false;
      clearTimer();
      cursorStep = 0;
      cursorDelay = 0;
      retireSession(0.28);
    }

    function setVolume(value) {
      if (disposed || !Number.isFinite(value)) return;
      targetVolume = numberInRange(value, targetVolume, 0, 1);
      fade(volume.gain, targetVolume, audioCtx.currentTime, 0.15);
    }

    function isPlaying() {
      return playing;
    }

    function getCursorStep() {
      return playing ? positionAt(audioCtx.currentTime).step : cursorStep;
    }

    function setCursorStep(value) {
      if (disposed || !Number.isFinite(value)) return;
      cursorStep = wrap(value);
      cursorDelay = 0;
    }

    function dispose() {
      if (disposed) return;
      playing = false;
      clearTimer();
      if (session) destroySession(session);
      session = null;
      for (const old of retired) destroySession(old);
      disconnect(comp);
      disconnect(volume);
      disposed = true;
    }

    return { start, stop, pause, resume, setVolume, isPlaying, getCursorStep, setCursorStep, dispose };
  }

  function createAudioManager(options = {}) {
    const defaultVolume = typeof options.volume === 'number' ? options.volume : 0.35;
    let currentVolume = defaultVolume;
    // 全体の音量をまとめてブースト（効果音・BGMともに）
    const gainBoost = typeof options.gainBoost === 'number' ? options.gainBoost : 2.0;

    function effectiveMasterGainValue() {
      const v = currentVolume * gainBoost;
      if (v <= 0) return 0.0;
      if (v >= 1.0) return 1.0;
      return v;
    }
    let audioCtx = null;
    let master = null;
    let enabled = false;
    let sfx = null;
    let bgm = null;
    let bgmWasPlaying = false;
    let bgmVolume = 1.0;
    let bgmCursorStep = 0;
    let staleAfterBackground = false;

    let hooksInstalled = false;
    let unlockHookInstalled = false;
    function ensureContext() {
      // iOSで稀に closed になる／壊れるケースに備える
      if (audioCtx && audioCtx.state === 'closed') {
        teardownContext();
      }
      if (!audioCtx) {
        audioCtx = new (global.AudioContext || global.webkitAudioContext)();
        master = audioCtx.createGain();
        master.gain.value = enabled ? effectiveMasterGainValue() : 0.0;
        master.connect(audioCtx.destination);
        sfx = createSfx(audioCtx, master, {
          bumpBoost: options.bumpBoost,
          minStepIntervalSec: options.minStepIntervalSec,
          minBumpIntervalSec: options.minBumpIntervalSec,
          minUndoIntervalSec: options.minUndoIntervalSec,
          minRedoIntervalSec: options.minRedoIntervalSec,
          minStartIntervalSec: options.minStartIntervalSec,
          minClearIntervalSec: options.minClearIntervalSec,
          minUiIntervalSec: options.minUiIntervalSec,
          minButtonIntervalSec: options.minButtonIntervalSec,
        });
        bgm = createBgm(audioCtx, master, {
          tempo: 92,
        });

        // 途中位置からの復帰用（別画面/バックグラウンドから戻るとき）
        try {
          bgm && bgm.setCursorStep && bgm.setCursorStep(bgmCursorStep);
        } catch (_) {}

        // 状態が落ちたら次のユーザー操作で復帰できるようにする
        audioCtx.onstatechange = () => {
          if (!enabled) return;
          if (audioCtx && audioCtx.state !== 'running') {
            installUnlockHook();
          }
        };
      }
    }
    function teardownContext() {
      if (bgm && typeof bgm.dispose === 'function') bgm.dispose();
      try {
        if (master) master.disconnect();
      } catch (_) {}
      master = null;
      sfx = null;
      bgm = null;

      if (audioCtx) {
        try {
          // close は Promise ですが await 不要（失敗しても握りつぶす）
          audioCtx.close?.();
        } catch (_) {}
      }
      audioCtx = null;
    }
    // 「ユーザー操作に紐づく瞬間」に小さな音声処理を通して unlock を助ける
    function playSilentTick() {
      if (!audioCtx || !master) return;
      try {
        const buf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
        const src = audioCtx.createBufferSource();
        src.buffer = buf;

        const g = audioCtx.createGain();
        // 完全な0だと最適化で無視されることがあるので極小
        g.gain.value = 0.0001;

        src.connect(g);
        g.connect(master);

        src.start();
        src.stop(audioCtx.currentTime + 0.01);
        setTimeout(() => {
          try {
            src.disconnect();
          } catch (_) {}
          try {
            g.disconnect();
          } catch (_) {}
        }, 50);
      } catch (_) {}
    }

    async function resumeWithTimeout(ms) {
      if (!audioCtx) return false;
      if (audioCtx.state === 'running') return true;
      try {
        await Promise.race([audioCtx.resume(), new Promise((resolve) => setTimeout(resolve, ms))]);
      } catch (_) {
        // resume が例外を投げる場合は false 扱い
        return false;
      }

      return audioCtx.state === 'running';
    }

    // fromGesture=true のときは「ユーザー操作の中」でできる限り粘る
    async function resumeCore(fromGesture) {
      if (!enabled) return;

      ensureContext();
      if (!audioCtx) return;
      // すでに動いている
      if (audioCtx.state === 'running') {
        if (master) master.gain.value = effectiveMasterGainValue();
        return;
      }

      if (fromGesture) {
        // resume前後で軽く刺激
        playSilentTick();
      }

      const ok1 = await resumeWithTimeout(250);

      if (fromGesture) {
        playSilentTick();
      }

      if (ok1) {
        if (master) master.gain.value = effectiveMasterGainValue();
        return;
      }
      // ここまででダメなら「作り直し」を同じユーザー操作内で試す（最終手段）
      // ※これでも復帰できないケースは iOS 側仕様/不具合寄りのことがあります :contentReference[oaicite:4]{index=4}
      if (fromGesture) {
        teardownContext();
        ensureContext();

        playSilentTick();
        const ok2 = await resumeWithTimeout(250);
        playSilentTick();

        if (ok2) {
          if (master) master.gain.value = effectiveMasterGainValue();
          return;
        }
      }

      // 次のユーザー操作待ち
      installUnlockHook();
    }
    function installUnlockHook() {
      if (unlockHookInstalled) return;
      unlockHookInstalled = true;
      const onUserGesture = async () => {
        unlockHookInstalled = false;
        window.removeEventListener('pointerdown', onUserGesture, true);
        window.removeEventListener('touchstart', onUserGesture, true);
        window.removeEventListener('touchend', onUserGesture, true);
        window.removeEventListener('click', onUserGesture, true);
        window.removeEventListener('keydown', onUserGesture, true);
        // 別タブ/バックグラウンド復帰後は「runningでも無音」になり得るので、必要なら作り直す
        if (staleAfterBackground) {
          staleAfterBackground = false;
          try {
            teardownContext();
          } catch (_) {}
        }

        const shouldStartBgm = bgmWasPlaying;

        try {
          // ユーザー操作中に enable()（iOSで復帰しやすい）
          await enable(true);
          // BGMを最初から再開（必要な場合のみ）
          if (shouldStartBgm && bgm && audioCtx && audioCtx.state === 'running') {
            try {
              bgm.stop && bgm.stop();
            } catch (_) {}
            bgm.start(bgmVolume, false);
            bgmWasPlaying = true;
          }
        } catch (_) {
          // 失敗したら次の操作で再チャレンジ
          installUnlockHook();
        }
      };
      // iOS対策：複数系統で拾う（captureで先に取る）
      window.addEventListener('pointerdown', onUserGesture, true);
      window.addEventListener('touchstart', onUserGesture, { capture: true, passive: true });
      window.addEventListener('touchend', onUserGesture, { capture: true, passive: true });
      window.addEventListener('click', onUserGesture, true);
      window.addEventListener('keydown', onUserGesture, true);
    }
    function installReturnHooks() {
      if (hooksInstalled) return;
      hooksInstalled = true;

      // 別タブ/別アプリへ：BGMは停止（最初からでOK）
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          staleAfterBackground = true;
          try {
            if (bgm && bgm.isPlaying && bgm.isPlaying()) {
              bgmWasPlaying = true; // 戻ったら再開する意思だけ覚える
              bgm.stop && bgm.stop();
              bgmCursorStep = 0;
            }
          } catch (_) {}
          return;
        }

        // visible に戻ったら：最初のユーザー操作で復帰できるよう仕込む
        if (document.visibilityState === 'visible' && enabled) {
          installUnlockHook();
        }
      });
      // Safari(iOS)では pagehide/pageshow も拾っておくと安定
      window.addEventListener('pagehide', () => {
        staleAfterBackground = true;

        try {
          if (bgm && bgm.isPlaying && bgm.isPlaying()) {
            bgmWasPlaying = true;
            bgm.stop && bgm.stop();
            bgmCursorStep = 0;
          }
        } catch (_) {}
      });

      window.addEventListener('pageshow', () => {
        if (enabled) {
          installUnlockHook();
        }
      });
      // フォーカス復帰でも念押し（PC/一部ブラウザ）
      window.addEventListener('focus', () => {
        if (enabled) {
          installUnlockHook();
        }
      });
    }

    // public
    async function enable(fromGesture = true) {
      enabled = true;
      ensureContext();
      if (master) master.gain.value = effectiveMasterGainValue();

      installReturnHooks();

      await resumeCore(fromGesture);
    }

    function disable() {
      enabled = false;
      if (master) master.gain.value = 0.0;
    }
    function isEnabled() {
      return enabled;
    }

    function setVolume(v) {
      if (typeof v !== 'number') return;
      currentVolume = v;
      if (master) master.gain.value = enabled ? effectiveMasterGainValue() : 0.0;
    }

    function resumeIfNeeded(fromGesture = false) {
      if (!enabled) return Promise.resolve();
      return resumeCore(fromGesture);
    }
    function playStep() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playStep();
    }
    function playBump() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playBump();
    }
    function playUndo() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playUndo();
    }
    function playRedo() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playRedo();
    }
    function playStart() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playStart();
    }
    function playClear() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playClear();
    }
    function playUiOpen() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playUiOpen();
    }
    function playUiClose() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playUiClose();
    }
    function playButton() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playButton();
    }
    function startBgm() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !bgm) return;

      // 明示的に開始する場合は先頭から
      try {
        bgm.setCursorStep?.(0);
      } catch (_) {}
      bgmCursorStep = 0;

      bgm.start(bgmVolume);
      bgmWasPlaying = true;
    }
    function pauseBgm() {
      if (!bgm) return;
      try {
        if (bgm.isPlaying && bgm.isPlaying()) bgmWasPlaying = true;
        bgm.pause?.();
        bgmCursorStep = bgm.getCursorStep?.() ?? bgmCursorStep;
      } catch (_) {}
    }

    function resumeBgm() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !bgm) return;
      try {
        bgm.setCursorStep?.(bgmCursorStep);
      } catch (_) {}
      if (bgm.resume) {
        bgm.resume(bgmVolume);
      } else {
        bgm.start(bgmVolume, true);
      }
      bgmWasPlaying = true;
    }
    function stopBgm() {
      if (!bgm) return;
      bgm.stop();
      bgmWasPlaying = false;
      bgmCursorStep = 0;
    }
    function setBgmVolume(v) {
      if (typeof v !== 'number') return;
      bgmVolume = v;
      if (bgm && enabled && audioCtx && audioCtx.state === 'running') {
        bgm.setVolume(bgmVolume);
      }
    }
    function isBgmPlaying() {
      return bgm && bgm.isPlaying();
    }
    function debug(tag = '') {
      alert(
        `[bgm] ${tag}\n` +
          `enabled=${enabled}\n` +
          `ctx=${audioCtx}\n` +
          `state=${audioCtx?.state}\n` +
          `masterGain=${master?.gain?.value}\n` +
          `bgm=${bgm}\n` +
          `playing=${bgm?.isPlaying?.()}\n` +
          `bgmVol=${bgmVolume}\n`
      );
    }
    return {
      enable,
      disable,
      isEnabled,
      setVolume,
      resumeIfNeeded,
      playStep,
      playBump,
      playUndo,
      playRedo,
      playStart,
      playClear,
      playUiOpen,
      playUiClose,
      playButton,
      startBgm,
      pauseBgm,
      resumeBgm,
      stopBgm,
      setBgmVolume,
      isBgmPlaying,
      debug,
      get audioCtx() {
        return audioCtx;
      },
    };
  }

  const sound = createAudioManager({ volume: 0.35, bumpBoost: 1.4 });
  global.app = global.app || {};
  global.app.sound = sound;
})(window);
