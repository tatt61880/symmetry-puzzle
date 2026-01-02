// グローバルに公開（window.～ で呼べる）
window.playSvgConfetti = function playSvgConfetti(gConfetti, width, height, opt = {}) {
  const {
    count = 40,
    durationMs = 800,
    startX = width * 0.5,
    startY = height * 0.75,
    spreadRad = Math.PI * 0.6,
    gravity = Math.max(width, height) * 2.2,
    drag = 0.985,
    minW = Math.max(width, height) * 0.012,
    maxW = Math.max(width, height) * 0.022,
    aspect = 0.35,
    colors = ['#ff4d4d', '#ffd84d', '#4dd2ff', '#7dff4d', '#b84dff', '#ffffff'],
  } = opt;

  const ns = 'http://www.w3.org/2000/svg';
  const baseSpeed = Math.max(width, height) * 1.6;

  // 既存の紙吹雪を消す（好みで変更OK）
  while (gConfetti.firstChild) gConfetti.removeChild(gConfetti.firstChild);

  const lerp = (a, b, t) => a + (b - a) * t;

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

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    for (const p of ps) {
      if (p.el.parentNode === gConfetti) gConfetti.removeChild(p.el);
    }
    gConfetti.setAttribute('opacity', '1');
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
      p.vy = p.vy * drag + gravity * dt;

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
