(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  function playSvgConfetti(gConfetti, width, height, opt = {}) {
    const {
      count = 40,
      durationMs = 1000,
      startX = width * 0.5,
      startY = height * 0.75,
      spreadRad = Math.PI * 0.6,
      gravity = null,
      gravityMul = 1,
      speedMul = 0.75,
      drag = 0.985,
      minW = Math.max(width, height) * 0.012,
      maxW = Math.max(width, height) * 0.022,
      aspect = 0.5,
      colors = ['#ff4d4d', '#ffd84d', '#4dd2ff', '#7dff4d', '#b84dff', '#ffffff'],
    } = opt;

    const ns = 'http://www.w3.org/2000/svg';
    const { baseSpeed, gravityEff } = (() => {
      // width/height と startY/durationMs から「上にも下にも程よく届く」ように自動調整
      const T = Math.max(0.05, durationMs / 1000);
      const y0 = startY;

      // 目標：少し上（画面外）まで上がって、最後は少し下まで落ちる
      const peakY = -height * 0.05;
      const endY = height * 1.05;

      const A = 2 * Math.max(1, y0 - peakY); // vy^2 / g
      const delta = Math.max(1, endY - y0);

      const sqrtA = Math.sqrt(A);
      const u = (sqrtA + Math.sqrt(sqrtA * sqrtA + 2 * delta)) / T; // u = sqrt(g)
      const gravityAuto = u * u;

      // angle/speed の平均を考慮して baseSpeed を決める
      const spread = Math.max(1e-4, spreadRad);
      const meanCos = spread < 1e-3 ? 1 : (2 * Math.sin(spread / 2)) / spread; // E[cos(delta)]
      const meanSpeedMul = 1.1; // E[0.8 + 0.6*U]
      const meanVyFactor = Math.max(0.05, meanSpeedMul * meanCos);

      const vy0Abs = sqrtA * u; // |vy0|（目標）
      const baseSpeedAuto = vy0Abs / meanVyFactor;

      const g = (Number.isFinite(gravity) ? gravity : gravityAuto) * gravityMul;
      const s = baseSpeedAuto * speedMul;

      return { baseSpeed: s, gravityEff: g };
    })();

    const lerp = (a, b, t) => a + (b - a) * t;

    // 念のため中身は空にしておく
    while (gConfetti.firstChild) gConfetti.removeChild(gConfetti.firstChild);
    gConfetti.setAttribute('pointer-events', 'none');

    const render = (p, seconds) => {
      const sway = p.sway * (Math.sin(p.phase + seconds * p.swaySpeed) - Math.sin(p.phase)) * Math.min(1, seconds * 3);
      const flip = Math.max(0.12, Math.abs(Math.cos(p.phase + seconds * p.flipSpeed)));
      p.el.setAttribute(
        'transform',
        `translate(${p.x + sway},${p.y}) rotate(${(p.rot * 180) / Math.PI}) scale(1,${flip}) translate(${-p.w / 2},${-p.h / 2})`
      );
    };

    const ps = [];
    for (let i = 0; i < count; i++) {
      const w = lerp(minW, maxW, Math.random());
      const h = w * aspect;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spreadRad;
      const speed = baseSpeed * (0.8 + Math.random() * 0.6);

      const el = document.createElementNS(ns, 'rect');
      el.setAttribute('width', String(w));
      el.setAttribute('height', String(h));
      el.setAttribute('rx', String(h * 0.25));
      el.setAttribute('ry', String(h * 0.25));
      el.setAttribute('fill', colors[(Math.random() * colors.length) | 0]);
      gConfetti.appendChild(el);

      const p = {
        el,
        x: startX + (Math.random() - 0.5) * w * 6,
        y: startY + (Math.random() - 0.5) * h * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w,
        h,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 8,
        phase: Math.random() * Math.PI * 2,
        flipSpeed: lerp(6, 12, Math.random()),
        sway: w * lerp(1, 2, Math.random()),
        swaySpeed: lerp(4, 8, Math.random()),
      };
      render(p, 0);
      ps.push(p);
    }

    let raf = 0;
    const t0 = performance.now();
    const fadeStartMs = durationMs * 0.65;
    let last = t0;
    let stopped = false;

    const removeGroup = () => {
      // すでにDOMから外れていてもOK
      if (gConfetti && gConfetti.parentNode) gConfetti.parentNode.removeChild(gConfetti);
    };

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      removeGroup();
    };

    const tick = (now) => {
      if (stopped) return;
      const t = now - t0;
      if (!gConfetti.isConnected || t >= durationMs) {
        stop();
        return;
      }

      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      const fade = Math.max(0, (t - fadeStartMs) / (durationMs - fadeStartMs));
      gConfetti.setAttribute('opacity', String(1 - fade * fade * (3 - 2 * fade)));
      // drag は従来の60fpsを基準にし、画面の更新頻度による減速の差を抑えます。
      const damping = Math.pow(drag, dt * 60);

      for (const p of ps) {
        p.vx *= damping;
        p.vy = p.vy * damping + gravityEff * dt;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.rotV * dt;

        render(p, t / 1000);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return stop;
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.playSvgConfetti = playSvgConfetti;
  }
})();
