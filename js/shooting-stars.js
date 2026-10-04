// shooting stars: every few seconds a pale streak falls diagonally across the
// sky, drawn pixel by pixel on a canvas (no images). Shared by index.html and
// academics.html; runs on every .shooting-stars canvas on the page.
// A canvas covers its parent, or the element named in its data-area.
const shootingStars = (canvas) => {
  const area = canvas.dataset.area
    ? canvas.parentElement.querySelector(canvas.dataset.area)
    : canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const COLOR = "255, 248, 196"; // pale cream, like the title text
  const SPEED = 900; // px/s
  const TRAIL = 340; // px of fading tail
  const stars = [];
  let width = 0;
  let height = 0;
  let running = false;
  let lastTime = 0;
  let nextSpawn = 0;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = area.clientWidth;
    height = area.clientHeight;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // start somewhere along the top or right edge and head down-left
  const spawn = () => {
    const fromTop = Math.random() < 0.6;
    const angle = (200 + Math.random() * 25) * (Math.PI / 180); // down-left
    stars.push({
      x: fromTop ? width * (0.3 + Math.random() * 0.8) : width + 20,
      y: fromTop ? -20 : height * Math.random() * 0.5,
      dx: Math.cos(angle), // negative between 200° and 225°: moves left
      dy: -Math.sin(angle), // canvas y points down, so this moves down
      speed: SPEED * (0.8 + Math.random() * 0.5),
      wobble: Math.random() * Math.PI * 2, // phase of the hand-drawn wiggle
      points: [],
      age: 0,
    });
  };

  const draw = (now) => {
    const dt = Math.min((now - lastTime) / 1000, 1 / 20);
    lastTime = now;
    ctx.clearRect(0, 0, width, height);

    if (now >= nextSpawn) {
      spawn();
      nextSpawn = now + 800 + Math.random() * 2000;
    }

    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.age += dt;
      s.x += s.dx * s.speed * dt;
      s.y += s.dy * s.speed * dt;

      const wiggle = Math.sin(s.age * 9 + s.wobble) * 2.2;
      s.points.push({ x: s.x - s.dy * wiggle, y: s.y + s.dx * wiggle });

      let length = 0;
      for (let p = s.points.length - 1; p > 0; p--) {
        length += Math.hypot(
          s.points[p].x - s.points[p - 1].x,
          s.points[p].y - s.points[p - 1].y,
        );
        if (length > TRAIL) {
          s.points.splice(0, p - 1);
          break;
        }
      }

      ctx.lineCap = "round";
      const n = s.points.length;
      for (let p = 1; p < n; p++) {
        const t = p / n;
        ctx.strokeStyle = `rgba(${COLOR}, ${0.15 + t * 0.85})`;
        ctx.lineWidth = 1 + t * 3;
        ctx.beginPath();
        ctx.moveTo(s.points[p - 1].x, s.points[p - 1].y);
        ctx.lineTo(s.points[p].x, s.points[p].y);
        ctx.stroke();
      }

      const head = s.points[n - 1];
      const glow = ctx.createRadialGradient(
        head.x,
        head.y,
        0,
        head.x,
        head.y,
        7,
      );
      glow.addColorStop(0, `rgba(${COLOR}, 1)`);
      glow.addColorStop(1, `rgba(${COLOR}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 7, 0, Math.PI * 2);
      ctx.fill();

      const tail = s.points[0];
      if (tail.x < -TRAIL || tail.y > height + TRAIL) stars.splice(i, 1);
    }

    if (running) requestAnimationFrame(draw);
  };

  const start = () => {
    if (running) return;
    running = true;
    lastTime = performance.now();
    nextSpawn = lastTime + 600;
    requestAnimationFrame(draw);
  };
  const stop = () => (running = false);

  // follow the area's size (the footer art only gets its height once loaded)
  new ResizeObserver(resize).observe(area);
  resize();

  // only animate while the area is on screen and the tab is visible
  let onScreen = false;
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    onScreen && !document.hidden ? start() : stop();
  }).observe(area);
  document.addEventListener("visibilitychange", () => {
    onScreen && !document.hidden ? start() : stop();
  });
};

// canvases can come later in the page, so wait until everything is parsed
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  addEventListener("DOMContentLoaded", () =>
    document.querySelectorAll(".shooting-stars").forEach(shootingStars),
  );
}
