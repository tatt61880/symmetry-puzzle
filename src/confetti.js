window.playSvgConfetti = function playSvgConfetti(gConfetti, width, height, opt = {}) {
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
    aspect = 0.35,
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

    ps.push({
      el,
      x: startX + (Math.random() - 0.5) * w * 6,
      y: startY + (Math.random() - 0.5) * h * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w,
      h,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 14,
    });
  }

  let raf = 0;
  const t0 = performance.now();
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

    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    const t = now - t0;
    const alpha = Math.max(0, 1 - t / durationMs);
    gConfetti.setAttribute('opacity', String(alpha));

    for (const p of ps) {
      p.vx *= drag;
      p.vy = p.vy * drag + gravityEff * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotV * dt;

      p.el.setAttribute('transform', `translate(${p.x},${p.y}) rotate(${(p.rot * 180) / Math.PI}) translate(${-p.w / 2},${-p.h / 2})`);
    }

    if (t < durationMs) raf = requestAnimationFrame(tick);
    else stop();
  };

  raf = requestAnimationFrame(tick);
  return stop;
};
