(function (global) {
  'use strict';

  function createSfx(audioCtx, destination, opts = {}) {
    const bumpBoost = typeof opts.bumpBoost === 'number' ? opts.bumpBoost : 1.4;

    function playStep() {
      if (audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;

      // キラッとした「チッ」
      const oscHi = audioCtx.createOscillator();
      oscHi.type = 'triangle';
      oscHi.frequency.setValueAtTime(1200, t0);
      oscHi.frequency.exponentialRampToValueAtTime(900, t0 + 0.05);

      const hiGain = audioCtx.createGain();
      hiGain.gain.setValueAtTime(0.0001, t0);
      hiGain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.005);
      hiGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);

      // ふんわり胴鳴り「て」
      const oscLo = audioCtx.createOscillator();
      oscLo.type = 'sine';
      oscLo.frequency.setValueAtTime(420, t0);
      oscLo.frequency.exponentialRampToValueAtTime(320, t0 + 0.07);

      const loGain = audioCtx.createGain();
      loGain.gain.setValueAtTime(0.0001, t0);
      loGain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.006);
      loGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);

      // ほんの少しノイズ（輪郭）
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

      // 可愛い「ぽよ」感（超弱い揺れ）
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(7.0, t0);

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.setValueAtTime(8.0, t0); // 揺れ幅(Hz)
      lfo.connect(lfoGain);
      lfoGain.connect(oscHi.frequency);

      // ミックス
      oscHi.connect(hiGain);
      hiGain.connect(destination);

      oscLo.connect(loGain);
      loGain.connect(destination);

      noise.connect(hp);
      hp.connect(lp);
      lp.connect(noiseGain);
      noiseGain.connect(destination);

      // 再生
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

      // 壁音専用のゲイン（master手前で増幅）
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

    return { playStep, playBump };
  }

  function createAudioManager(options = {}) {
    const volume = typeof options.volume === 'number' ? options.volume : 0.35;
    const bumpBoost = typeof options.bumpBoost === 'number' ? options.bumpBoost : 1.4;

    let audioCtx = null;
    let master = null;
    let enabled = false;
    let sfx = null;

    async function enable() {
      enabled = true;

      if (!audioCtx) {
        audioCtx = new (global.AudioContext || global.webkitAudioContext)();
        master = audioCtx.createGain();
        master.gain.value = volume;
        master.connect(audioCtx.destination);
        sfx = createSfx(audioCtx, master, { bumpBoost });
      }

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      master.gain.value = volume;
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
      if (master) master.gain.value = enabled ? v : 0.0;
    }

    function playStep() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playStep();
    }

    function playBump() {
      if (!enabled || !audioCtx || audioCtx.state !== 'running' || !sfx) return;
      sfx.playBump();
    }

    return {
      enable,
      disable,
      isEnabled,
      setVolume,
      playStep,
      playBump,
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
