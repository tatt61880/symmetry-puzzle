// sound.js（scriptタグで読み込むグローバル版）
// window.SymmetrySfx.createAudioManager(...) を使います。

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

    let lastStepAt = -1;
    let lastBumpAt = -1;
    let lastUndoAt = -1;
    let lastRedoAt = -1;
    let lastStartAt = -1;
    let lastClearAt = -1;

    function playStep() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      if (lastStepAt >= 0 && t0 - lastStepAt < minStepIntervalSec) return;
      lastStepAt = t0;

      const oscHi = audioCtx.createOscillator();
      oscHi.type = 'triangle';
      oscHi.frequency.setValueAtTime(1200, t0);
      oscHi.frequency.exponentialRampToValueAtTime(900, t0 + 0.05);

      const hiGain = audioCtx.createGain();
      hiGain.gain.setValueAtTime(0.0001, t0);
      hiGain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.005);
      hiGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);

      const oscLo = audioCtx.createOscillator();
      oscLo.type = 'sine';
      oscLo.frequency.setValueAtTime(420, t0);
      oscLo.frequency.exponentialRampToValueAtTime(320, t0 + 0.07);

      const loGain = audioCtx.createGain();
      loGain.gain.setValueAtTime(0.0001, t0);
      loGain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.006);
      loGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);

      const noiseDur = 0.03;
      const noiseBuf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * noiseDur), audioCtx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const x = i / data.length;
        const env = Math.exp(-16 * x);
        data[i] = (Math.random() * 2 - 1) * 0.35 * env;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuf;

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3800, t0);

      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(700, t0);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t0);
      noiseGain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.004);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);

      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(7.0, t0);

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.setValueAtTime(8.0, t0);
      lfo.connect(lfoGain);
      lfoGain.connect(oscHi.frequency);

      oscHi.connect(hiGain);
      hiGain.connect(destination);

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
      oscHi.stop(t0 + 0.13);
      oscLo.stop(t0 + 0.15);
      lfo.stop(t0 + 0.13);
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

    return { playStep, playBump, playUndo, playRedo, playStart, playClear };
  }

  function createAudioManager(options = {}) {
    const defaultVolume = typeof options.volume === 'number' ? options.volume : 0.35;
    let currentVolume = defaultVolume;

    let audioCtx = null;
    let master = null;
    let enabled = false;
    let sfx = null;

    let hooksInstalled = false;
    let unlockHookInstalled = false;

    async function resumeIfNeeded() {
      if (!audioCtx) return;

      if (audioCtx.state === 'closed') {
        audioCtx = null;
        master = null;
        sfx = null;
        await enable(); // 復旧（enabled=trueのまま）
        return;
      }

      if (audioCtx.state !== 'running') {
        try {
          await audioCtx.resume();
        } catch (_) {
          installUnlockHook();
          return;
        }

        // resume後も running でなければ、次のユーザー操作待ち
        if (audioCtx.state !== 'running') {
          installUnlockHook();
          return;
        }
      }

      if (master) master.gain.value = enabled ? currentVolume : 0.0;
    }

    function installUnlockHook() {
      if (unlockHookInstalled) return;
      unlockHookInstalled = true;

      const once = async () => {
        unlockHookInstalled = false;
        window.removeEventListener('pointerdown', once, true);
        window.removeEventListener('touchstart', once, true);
        window.removeEventListener('keydown', once, true);
        await resumeIfNeeded();
      };

      window.addEventListener('pointerdown', once, { capture: true, passive: false });
      window.addEventListener('touchstart', once, { capture: true, passive: false });
      window.addEventListener('keydown', once, true);
    }

    function installReturnHooks() {
      if (hooksInstalled) return;
      hooksInstalled = true;

      // bfcache復帰など
      window.addEventListener('pageshow', () => {
        if (enabled) resumeIfNeeded();
      });

      // タブ復帰・アプリ復帰
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && enabled) {
          resumeIfNeeded();
        }
      });
    }

    async function enable() {
      enabled = true;

      if (!audioCtx) {
        audioCtx = new (global.AudioContext || global.webkitAudioContext)();
        master = audioCtx.createGain();
        master.connect(audioCtx.destination);

        sfx = createSfx(audioCtx, master, {
          bumpBoost: options.bumpBoost,
          minStepIntervalSec: options.minStepIntervalSec,
          minBumpIntervalSec: options.minBumpIntervalSec,
          minUndoIntervalSec: options.minUndoIntervalSec,
          minRedoIntervalSec: options.minRedoIntervalSec,
          minStartIntervalSec: options.minStartIntervalSec,
          minClearIntervalSec: options.minClearIntervalSec,
        });

        installReturnHooks();
      }

      await resumeIfNeeded();
      if (master) master.gain.value = currentVolume;
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

    return {
      enable,
      disable,
      isEnabled,
      setVolume,
      playStep,
      playBump,
      playUndo,
      playRedo,
      playStart,
      playClear,
      resumeIfNeeded,
      get audioCtx() {
        return audioCtx;
      },
    };
  }

  global.SymmetrySfx = {
    createAudioManager,
    createSfx,
  };
})(window);
