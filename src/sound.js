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

  function createBgm(audioCtx, destination, opts = {}) {
    const tempo = typeof opts.tempo === 'number' ? opts.tempo : 92;
    const lookAheadSec = typeof opts.lookAheadSec === 'number' ? opts.lookAheadSec : 0.18;
    const tickMs = typeof opts.tickMs === 'number' ? opts.tickMs : 25;

    // BGM専用ボリューム（SFXとは別）
    const gain = audioCtx.createGain();
    gain.gain.value = 0.0;

    // ちょい前に出すための軽いコンプ（BGM専用）
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.knee.value = 18;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.01;
    comp.release.value = 0.12;

    gain.connect(comp);
    comp.connect(destination);

    // ほんの少し空間（控えめディレイ）
    const delay = audioCtx.createDelay(0.25);
    delay.delayTime.value = 0.12;

    const fb = audioCtx.createGain();
    fb.gain.value = 0.12;

    delay.connect(fb);
    fb.connect(delay);

    const wet = audioCtx.createGain();
    wet.gain.value = 0.22;

    delay.connect(wet);
    wet.connect(gain);

    let playing = false;
    let timerId = null;
    let nextTime = 0;

    // 「次に鳴らすステップ」を保持（復帰時にここから再開）
    let step = 0;
    let cursorStep = 0;

    // 8分音符
    const stepSec = 60 / tempo / 2;

    // ペンタトニック（C D E G A）
    const base = 261.63; // C4
    const semis = [0, 2, 4, 7, 9];

    // 対称っぽい（鏡写し）フレーズ（8小節=64ステップ）
    const motif = [
      // A
      0, 1, 2, 3, 2, 1, 0, -1,
      // B
      0, 1, 2, 4, 2, 1, 0, -1,
      // C
      1, 2, 3, 4, 3, 2, 1, -1,
      // A
      0, 1, 2, 3, 2, 1, 0, -1,

      // A
      0, 1, 2, 3, 2, 1, 0, -1,
      // C（鏡側）
      1, 2, 3, 4, 3, 2, 1, -1,
      // B（鏡側）
      0, 1, 2, 4, 2, 1, 0, -1,
      // A
      0, 1, 2, 3, 2, 1, 0, -1,
    ];

    function hz(scaleIndex, octaveShift = 0) {
      if (!Number.isFinite(scaleIndex)) return base;
      const si = ((scaleIndex % semis.length) + semis.length) % semis.length;
      const semi = semis[si] + 12 * octaveShift;
      return base * Math.pow(2, semi / 12);
    }

    function schedulePluck(t, f, amp) {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2400, t);

      osc.connect(g);
      g.connect(lp);
      lp.connect(gain);
      lp.connect(delay); // 少しだけ空間

      osc.start(t);
      osc.stop(t + 0.22);
    }

    function schedulePad(t, rootHz, amp) {
      // すごく薄いパッド（2音だけ）
      const f1 = rootHz / 2; // 低いルート
      const f2 = (rootHz * 1.5) / 2; // 低い5度

      const make = (f) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(amp, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1200, t);

        osc.connect(g);
        g.connect(lp);
        lp.connect(gain);

        osc.start(t);
        osc.stop(t + 1.0);
      };

      make(f1);
      make(f2);
    }

    function tick() {
      if (!playing) return;

      const now = audioCtx.currentTime;

      while (nextTime < now + lookAheadSec) {
        const phrasePos = step; // 0..motif.length-1
        const bar = Math.floor(phrasePos / 8); // 0..7（8分×8＝1小節想定）
        const rootScaleByBar = [0, 2, 2, 0, 0, 2, 2, 0];
        const rootScale = rootScaleByBar[bar] ?? 0;

        const noteScale = motif[phrasePos];

        if (noteScale >= 0) {
          // メロディ（軽い粒）
          schedulePluck(nextTime, hz(noteScale, 0), 0.085);

          // たまに上でキラッ（控えめ）
          if (phrasePos % 8 === 4) {
            schedulePluck(nextTime, hz(noteScale, 1), 0.06);
          }
        }

        // パッド（1拍ごと）
        if (phrasePos % 2 === 0) {
          schedulePad(nextTime, hz(rootScale, 0), 0.02);
        }

        nextTime += stepSec;
        step = (step + 1) % motif.length;
      }
    }

    function start(targetVolume = 0.25, resume = false) {
      if (playing) return;
      if (audioCtx.state !== 'running') return; // 呼び出し側で resume 済みにする想定

      playing = true;

      step = resume ? cursorStep : 0;
      nextTime = audioCtx.currentTime + 0.05;

      // フェードイン
      const t0 = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(t0);
      gain.gain.setValueAtTime(gain.gain.value, t0);
      gain.gain.linearRampToValueAtTime(targetVolume, t0 + 0.4);

      timerId = setInterval(tick, tickMs);
    }

    function pause() {
      if (!playing) return;

      playing = false;
      cursorStep = step; // 次に鳴らす位置を保持

      // 短めフェードアウト
      const t0 = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(t0);
      gain.gain.setValueAtTime(gain.gain.value, t0);
      gain.gain.linearRampToValueAtTime(0.0, t0 + 0.12);

      if (timerId) {
        const id = timerId;
        timerId = null;
        setTimeout(() => clearInterval(id), 160);
      }
    }

    function resume(targetVolume = 0.25) {
      start(targetVolume, true);
    }

    function stop() {
      // stop は「位置もリセット」
      if (!playing && cursorStep === 0 && gain.gain.value === 0) return;

      playing = false;
      cursorStep = 0;
      step = 0;

      // フェードアウト
      const t0 = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(t0);
      gain.gain.setValueAtTime(gain.gain.value, t0);
      gain.gain.linearRampToValueAtTime(0.0, t0 + 0.35);

      if (timerId) {
        const id = timerId;
        timerId = null;
        setTimeout(() => clearInterval(id), 450);
      }
    }

    function setVolume(v) {
      if (typeof v !== 'number') return;
      const t0 = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(t0);
      gain.gain.setValueAtTime(gain.gain.value, t0);
      gain.gain.linearRampToValueAtTime(v, t0 + 0.15);
    }

    function isPlaying() {
      return playing;
    }

    function getCursorStep() {
      return cursorStep;
    }

    function setCursorStep(s) {
      if (!Number.isFinite(s)) return;
      const n = motif.length;
      const v = ((Math.floor(s) % n) + n) % n;
      cursorStep = v;
      if (!playing) step = v;
    }

    return { start, stop, pause, resume, setVolume, isPlaying, getCursorStep, setCursorStep };
  }

  function createAudioManager(options = {}) {
    const defaultVolume = typeof options.volume === 'number' ? options.volume : 0.35;
    let currentVolume = defaultVolume;

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
        master.gain.value = enabled ? currentVolume : 0.0;
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
        if (master) master.gain.value = currentVolume;
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
        if (master) master.gain.value = currentVolume;
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
          if (master) master.gain.value = currentVolume;
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
      if (master) master.gain.value = currentVolume;

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
      if (master) master.gain.value = enabled ? currentVolume : 0.0;
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

  global.SymmetrySfx = {
    createAudioManager,
  };
})(window);
