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
    const initialVolume = typeof options.volume === 'number' ? options.volume : 0.35;

    let audioCtx = null;
    let master = null;
    let enabled = false;
    let sfx = null;

    let currentVolume = initialVolume;

    // unlock フックの多重登録防止
    let unlockHookInstalled = false;
    // 自動復帰フックの多重登録防止
    let autoHooksInstalled = false;

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
        });

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

      const handler = () => {
        unlockHookInstalled = false;
        // ユーザー操作の「同期的な瞬間」に resume を仕掛けたいので await しない
        resumeCore(true);
      };

      const opt = { once: true, capture: true, passive: true };
      global.addEventListener('pointerdown', handler, opt);
      global.addEventListener('touchend', handler, opt);
      global.addEventListener('click', handler, opt);
      global.addEventListener('keydown', handler, opt);
    }

    function installAutoResumeHooks() {
      if (autoHooksInstalled) return;
      autoHooksInstalled = true;

      // これらのイベント自体では「ユーザー操作扱い」にならないので、
      // resume を試し、ダメなら unlock hook を仕込む、という役割
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && enabled) {
          resumeCore(false);
        }
      });

      global.addEventListener('pageshow', () => {
        if (enabled) resumeCore(false);
      });

      global.addEventListener('focus', () => {
        if (enabled) resumeCore(false);
      });
    }

    // public
    async function enable(fromGesture = true) {
      enabled = true;
      ensureContext();
      if (master) master.gain.value = currentVolume;

      installAutoResumeHooks();

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
