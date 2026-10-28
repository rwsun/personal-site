// "draw a box!": a daily perspective drill. Copy the reference box on the pad,
// press "done", and a new one comes up. The goal is 10 boxes a day; the day's
// count, your streak and today's drawings are kept in this browser.

(() => {
  const GOAL = 10;
  const STORE_KEY = "draw-a-box";
  const LINE_WIDTH = 2.5;

  // ---------- saved progress ----------

  const todayKey = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // { counts: { "2026-10-27": 4, ... }, thumbs: { day, images: [dataURL] } }
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && saved.counts) return saved;
    } catch {}
    return { counts: {}, thumbs: { day: todayKey(), images: [] } };
  };
  const progress = load();

  const save = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
      return true;
    } catch {
      return false; // private window or storage full: keep going without it
    }
  };

  // only today's drawings are kept, to stay well inside the storage limit
  const todaysThumbs = () => {
    if (!progress.thumbs || progress.thumbs.day !== todayKey())
      progress.thumbs = { day: todayKey(), images: [] };
    return progress.thumbs.images;
  };

  // days in a row with all 10 boxes done (today counts once it's finished)
  const streak = () => {
    const day = new Date();
    if ((progress.counts[todayKey()] || 0) < GOAL) day.setDate(day.getDate() - 1);
    let days = 0;
    for (;;) {
      const pad = (n) => String(n).padStart(2, "0");
      const key = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
      if ((progress.counts[key] || 0) < GOAL) return days;
      days++;
      day.setDate(day.getDate() - 1);
    }
  };

  const tally = document.querySelector(".draw-tally");
  const countEl = document.querySelector(".draw-count");
  const streakEl = document.querySelector(".draw-streak");
  const gallery = document.querySelector(".draw-gallery");
  const emptyNote = document.querySelector(".draw-empty");

  const showProgress = () => {
    const count = progress.counts[todayKey()] || 0;
    tally.replaceChildren(
      ...Array.from({ length: GOAL }, (_, i) => {
        const mark = document.createElement("li");
        mark.classList.toggle("is-done", i < count);
        return mark;
      }),
    );
    countEl.textContent =
      count < GOAL
        ? `${count} / ${GOAL} boxes today`
        : count === GOAL
          ? `${GOAL} / ${GOAL}! All done for today. See you tomorrow!`
          : `${count} boxes today (${count - GOAL} bonus!)`;
    const days = streak();
    streakEl.textContent = days ? `streak: ${days} day${days === 1 ? "" : "s"}` : "";

    const images = todaysThumbs();
    emptyNote.hidden = images.length > 0;
    gallery.replaceChildren(
      ...images.map((entry, i) => {
        const { src, score } = typeof entry === "string" ? { src: entry } : entry;
        const item = document.createElement("li");
        const img = document.createElement("img");
        img.src = src;
        img.alt = `box ${i + 1}`;
        item.append(img);
        if (score !== undefined) {
          const label = document.createElement("span");
          label.className = "draw-thumb-score";
          label.textContent = `${score}%`;
          item.append(label);
        }
        return item;
      }),
    );
  };

  // ---------- reference box ----------
  // A real 3D box seen through a perspective camera, so the reference is
  // always correct: hidden edges dashed, vanishing lines and eye level optional.

  const svg = document.querySelector(".draw-ref-svg");
  const options = {
    points: document.querySelector('[data-option="points"]'),
    hidden: document.querySelector('[data-option="hidden"]'),
    guides: document.querySelector('[data-option="guides"]'),
  };
  const VIEW_W = 400;
  const VIEW_H = 300;
  const rand = (min, max) => min + Math.random() * (max - min);
  const sign = () => (Math.random() < 0.5 ? -1 : 1);
  const deg = (d) => (d * Math.PI) / 180;

  const makeBox = (points) => {
    const size = [rand(1, 1.8), rand(0.8, 1.6), rand(1, 1.8)];
    let yaw = 0;
    let pitch = 0;
    let dist = 5;
    let offset;
    if (points === 1) {
      // front face square to the viewer, box off to one side and above/below
      offset = [sign() * rand(0.8, 1.4), sign() * rand(0.8, 1.3)];
    } else if (points === 2) {
      // turned, but its vertical edges stay vertical
      yaw = sign() * deg(rand(20, 70));
      offset = [rand(-0.5, 0.5), sign() * rand(1, 1.6)];
    } else {
      // turned, and the camera tilts to look up or down at it
      yaw = sign() * deg(rand(20, 70));
      dist = 4;
      offset = [rand(-0.4, 0.4), sign() * rand(1.6, 2.4)];
      pitch = Math.atan2(offset[1], dist);
    }
    return { size, yaw, pitch, center: [offset[0], offset[1], dist] };
  };

  const toCamera = (b, [x, y, z], withOffset) => {
    // turn the box around its vertical axis...
    let px = x * Math.cos(b.yaw) + z * Math.sin(b.yaw);
    let py = y;
    let pz = -x * Math.sin(b.yaw) + z * Math.cos(b.yaw);
    // ...move it in front of the camera...
    if (withOffset) {
      px += b.center[0];
      py += b.center[1];
      pz += b.center[2];
    }
    // ...and tilt the camera (3-point only)
    const ty = py * Math.cos(b.pitch) - pz * Math.sin(b.pitch);
    const tz = py * Math.sin(b.pitch) + pz * Math.cos(b.pitch);
    return [px, ty, tz];
  };

  // where the box's corners and edges land in the 400x300 reference view; the
  // pad uses the same numbers (scaled), so the starting lines and the check
  // overlay sit exactly where the reference box is
  const project = (b) => {
    const half = b.size.map((s) => s / 2);
    const corners = Array.from({ length: 8 }, (_, i) =>
      toCamera(
        b,
        [0, 1, 2].map((axis) => (i & (1 << axis) ? half[axis] : -half[axis])),
        true,
      ),
    );
    const axes = [0, 1, 2].map((axis) =>
      toCamera(b, [0, 1, 2].map((a) => (a === axis ? 1 : 0)), false),
    );
    const centre = toCamera(b, [0, 0, 0], true);
    const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

    // a face shows if it points towards the camera
    const faceVisible = (axis, positive) => {
      const s = positive ? 1 : -1;
      const normal = axes[axis].map((v) => v * s);
      const faceCentre = centre.map((c, i) => c + normal[i] * half[axis]);
      return dot(normal, faceCentre) < 0;
    };

    // flat projection, then scaled to fit the reference area
    const flat = corners.map(([x, y, z]) => [x / z, -y / z]);
    const xs = flat.map((p) => p[0]);
    const ys = flat.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...ys),
      Math.max(...ys),
    ];
    const pad = 45;
    const scale = Math.min(
      (VIEW_W - pad * 2) / (maxX - minX),
      (VIEW_H - pad * 2) / (maxY - minY),
    );
    const toView = ([x, y]) => [
      VIEW_W / 2 + (x - (minX + maxX) / 2) * scale,
      VIEW_H / 2 + (y - (minY + maxY) / 2) * scale,
    ];
    const pts = flat.map(toView);

    const edges = [];
    for (let a = 0; a < 8; a++) {
      for (let axis = 0; axis < 3; axis++) {
        if (a & (1 << axis)) continue;
        const z = a | (1 << axis);
        // an edge is hidden when both faces it sits between face away
        const shown = [0, 1, 2]
          .filter((other) => other !== axis)
          .some((other) => faceVisible(other, !!(a & (1 << other))));
        edges.push({ from: a, to: z, axis, shown });
      }
    }

    // each set of parallel edges heads for its own vanishing point (edges
    // parallel to the picture never meet, so they get none)
    const vps = axes.map((dir) =>
      Math.abs(dir[2]) < 1e-6 ? null : toView([dir[0] / dir[2], -dir[1] / dir[2]]),
    );
    // eye level: where every horizontal direction vanishes
    const horizonY = toView([0, Math.tan(b.pitch)])[1];

    // the six faces, and how squarely each one faces you
    const faces = [];
    [0, 1, 2].forEach((axis) =>
      [0, 1].forEach((side) => {
        const normal = axes[axis].map((v) => v * (side ? 1 : -1));
        const faceCentre = centre.map((c, i) => c + normal[i] * half[axis]);
        const facing = -dot(normal, faceCentre) / Math.hypot(...faceCentre);
        faces.push({ axis, side, visible: faceVisible(axis, !!side), facing });
      }),
    );
    const nearest = corners.reduce((best, c, i) => (c[2] < corners[best][2] ? i : best), 0);

    return { pts, edges, vps, horizonY, faces, nearest };
  };

  // ---------- levels: each of the day's boxes starts with less help ----------

  const START_LABELS = {
    "two-faces": "two faces drawn for you",
    "one-face": "one face drawn for you",
    corner: "one corner drawn for you",
    "two-edges": "two edges drawn for you",
    "one-edge": "just one edge drawn for you",
  };
  // "auto" perspective: 1-point first, then 2-point, then 3-point
  const AUTO_LADDER = [
    { points: 1, start: "two-faces" },
    { points: 1, start: "one-face" },
    { points: 2, start: "two-faces" },
    { points: 2, start: "one-face" },
    { points: 2, start: "corner" },
    { points: 2, start: "two-edges" },
    { points: 2, start: "one-edge" },
    { points: 3, start: "one-face" },
    { points: 3, start: "corner" },
    { points: 3, start: "one-edge" },
  ];
  // a perspective picked by hand: only the help shrinks
  const MANUAL_STARTS = [
    "two-faces",
    "two-faces",
    "one-face",
    "one-face",
    "corner",
    "corner",
    "two-edges",
    "two-edges",
    "one-edge",
    "one-edge",
  ];

  const currentLevel = () => {
    const count = progress.counts[todayKey()] || 0;
    const step = Math.min(count, GOAL - 1); // bonus boxes stay at the hardest
    const auto = options.points.value === "auto";
    return {
      number: count + 1,
      points: auto ? AUTO_LADDER[step].points : Number(options.points.value),
      start: auto ? AUTO_LADDER[step].start : MANUAL_STARTS[step],
    };
  };

  // the edges already on the pad when a box starts
  const startingEdges = (g, start) => {
    const faceEdges = (f) =>
      g.edges.filter((e) => e.axis !== f.axis && !!(e.from & (1 << f.axis)) === !!f.side);
    const front = g.faces.filter((f) => f.visible).sort((a, b) => b.facing - a.facing);
    const atCorner = g.edges.filter((e) => e.from === g.nearest || e.to === g.nearest);
    const upright = atCorner.find((e) => e.axis === 1);
    const sideways = atCorner.filter((e) => e.axis !== 1);
    switch (start) {
      case "two-faces":
        return [...new Set([...faceEdges(front[0]), ...faceEdges(front[1])])];
      case "one-face":
        return faceEdges(front[0]);
      case "corner":
        return atCorner;
      case "two-edges":
        return [upright, sideways[Math.floor(Math.random() * sideways.length)]];
      default:
        return [upright];
    }
  };

  let geom = null;

  const drawReference = () => {
    const { pts, edges, vps, horizonY } = geom;
    const line = ([x1, y1], [x2, y2], cls) =>
      `<line class="${cls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" />`;

    let guides = "";
    if (options.guides.checked) {
      guides += line([-10, horizonY], [VIEW_W + 10, horizonY], "ref-horizon");
      guides += `<text class="ref-label" x="8" y="${(horizonY - 6).toFixed(1)}">eye level</text>`;
      vps.forEach((vp, axis) => {
        if (!vp) return;
        edges
          .filter((e) => e.axis === axis)
          .forEach((e) => {
            const [p, q] = [pts[e.from], pts[e.to]];
            const far =
              Math.hypot(p[0] - vp[0], p[1] - vp[1]) >
              Math.hypot(q[0] - vp[0], q[1] - vp[1])
                ? p
                : q;
            guides += line(far, vp, "ref-guide");
          });
      });
    }

    const hidden = options.hidden.checked
      ? edges.filter((e) => !e.shown).map((e) => line(pts[e.from], pts[e.to], "ref-hidden"))
      : [];
    const shown = edges
      .filter((e) => e.shown)
      .map((e) => line(pts[e.from], pts[e.to], "ref-edge"));
    svg.innerHTML = guides + hidden.join("") + shown.join("");
  };

  options.points.addEventListener("change", () => newBox());
  options.hidden.addEventListener("change", drawReference);
  options.guides.addEventListener("change", drawReference);

  // ---------- drawing pad ----------

  const canvas = document.querySelector(".draw-pad");
  const ctx = canvas.getContext("2d");
  const doneButton = document.querySelector('[data-action="done"]');
  const undoButton = document.querySelector('[data-action="undo"]');
  const redoButton = document.querySelector('[data-action="redo"]');
  const clearButton = document.querySelector('[data-action="clear"]');
  const checkButton = document.querySelector('[data-action="check"]');
  const GIVEN_COLOR = "#555";
  const CHECK_COLOR = "rgba(35, 140, 226, 0.75)";

  // points are stored as fractions of the pad's width, so the drawing keeps
  // its shape when the pad changes size
  let strokes = [];
  // { type: "stroke", stroke }, { type: "erase", stroke, index } or
  // { type: "clear", strokes }
  let history = [];
  let redoStack = [];
  let current = null;
  let width = 0;
  let checking = false; // the correct box is laid over the drawing

  const paint = (target, list, w, lineWidth, color = "#000") => {
    target.lineCap = "round";
    target.lineJoin = "round";
    target.strokeStyle = color;
    target.fillStyle = color;
    target.lineWidth = lineWidth;
    list.forEach((stroke) => {
      const pts = stroke.map(([x, y]) => [x * w, y * w]);
      if (pts.length === 1) {
        target.beginPath();
        target.arc(pts[0][0], pts[0][1], lineWidth / 2, 0, Math.PI * 2);
        target.fill();
        return;
      }
      // smooth the line through the midpoints between samples
      target.beginPath();
      target.moveTo(...pts[0]);
      for (let i = 1; i < pts.length - 1; i++) {
        const mid = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
        target.quadraticCurveTo(pts[i][0], pts[i][1], mid[0], mid[1]);
      }
      target.lineTo(...pts[pts.length - 1]);
      target.stroke();
    });
  };

  // an edge of the reference box, in the pad's (fraction of width) units
  const edgeLine = (e) =>
    [geom.pts[e.from], geom.pts[e.to]].map(([x, y]) => [x / VIEW_W, y / VIEW_W]);

  const givenLines = () => geom.given.map(edgeLine);

  // ---------- feedback: how close is the drawing to the real box? ----------
  // Your lines are compared with the correct box's edges: which edges you
  // drew, how far their angles are off, whether lines that should meet at a
  // vanishing point really converge, and how steady the strokes are.

  const feedbackEl = document.querySelector(".draw-feedback");
  const scoreEl = feedbackEl.querySelector(".draw-score");
  const tipsEl = feedbackEl.querySelector(".draw-tips-list");

  // distance from point p to segment ab, all in px
  const segDist = ([x, y], [x1, y1], [x2, y2]) => {
    const len = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    const t = len ? Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / len)) : 0;
    return Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1)));
  };

  // a line's direction in degrees, 0-180 (direction of travel doesn't matter)
  const angleOf = ([x1, y1], [x2, y2]) => {
    const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return ((a % 180) + 180) % 180;
  };
  // signed difference between two such directions, -90 to 90
  const angleDiff = (a, b) => ((((a - b) % 180) + 270) % 180) - 90;
  // how far a direction is from horizontal, 0-90
  const tilt = (a) => Math.min(a, 180 - a);

  // simplify a stroke into straight pieces (Ramer-Douglas-Peucker), returning
  // the indexes of the corners it keeps
  const corners = (pts, eps) => {
    const keep = [0, pts.length - 1];
    const split = (i, j) => {
      let worst = 0;
      let at = -1;
      for (let k = i + 1; k < j; k++) {
        const d = segDist(pts[k], pts[i], pts[j]);
        if (d > worst) {
          worst = d;
          at = k;
        }
      }
      if (worst > eps) {
        keep.push(at);
        split(i, at);
        split(at, j);
      }
    };
    split(0, pts.length - 1);
    return keep.sort((a, b) => a - b);
  };

  const axisName = (axis) => {
    const vps = geom.vps;
    if (axis === 1) return "the upright edges";
    if (!vps[axis]) return "the edges running straight across";
    const other = [0, 2].find((a) => a !== axis && vps[a]);
    if (other === undefined) return "the edges going back into the distance";
    return vps[axis][0] < vps[other][0] ? "the edges heading left" : "the edges heading right";
  };

  const analyze = () => {
    const w = width || canvas.clientWidth || 1;
    const near = 0.035 * w; // how close a line must be to count as on an edge
    const toPx = (p) => [(p[0] / VIEW_W) * w, (p[1] / VIEW_W) * w];
    const given = new Set(geom.given);
    const edges = geom.edges.map((e) => {
      const a = toPx(geom.pts[e.from]);
      const b = toPx(geom.pts[e.to]);
      return { e, a, b, angle: angleOf(a, b), pieces: [] };
    });

    // break every stroke into straight pieces and match each to an edge
    const pieces = [];
    let wobbly = 0;
    strokes.forEach((stroke) => {
      const pts = stroke.map(([x, y]) => [x * w, y * w]);
      if (pts.length < 2) return;
      const idx = corners(pts, 0.015 * w);
      let chords = 0;
      for (let k = 0; k < idx.length - 1; k++) {
        const a = pts[idx[k]];
        const b = pts[idx[k + 1]];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        chords += len;
        if (len >= 0.03 * w) pieces.push({ a, b, len, angle: angleOf(a, b) });
      }
      let path = 0;
      for (let k = 1; k < pts.length; k++)
        path += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      if (chords > 0.05 * w && path / chords > 1.04) wobbly++;
    });

    let stray = 0;
    pieces.forEach((piece) => {
      const mid = [(piece.a[0] + piece.b[0]) / 2, (piece.a[1] + piece.b[1]) / 2];
      let best = null;
      let bestCost = Infinity;
      edges.forEach((edge) => {
        const turn = Math.abs(angleDiff(piece.angle, edge.angle));
        const dist =
          (segDist(piece.a, edge.a, edge.b) + segDist(mid, edge.a, edge.b) + segDist(piece.b, edge.a, edge.b)) / 3;
        if (turn > 30 || dist > 2.2 * near) return;
        const cost = dist / near + turn / 20;
        if (cost < bestCost) {
          bestCost = cost;
          best = edge;
        }
      });
      if (best) best.pieces.push(piece);
      else stray++;
    });

    // per edge: how much of it you covered, and how far your angle is off
    const status = new Map();
    const scores = [];
    let hiddenDrawn = 0;
    edges.forEach((edge) => {
      if (given.has(edge.e)) {
        edge.error = 0;
        return;
      }
      let covered = 0;
      for (let k = 0; k <= 10; k++) {
        const p = [edge.a[0] + ((edge.b[0] - edge.a[0]) * k) / 10, edge.a[1] + ((edge.b[1] - edge.a[1]) * k) / 10];
        if (pieces.some((piece) => segDist(p, piece.a, piece.b) < near)) covered++;
      }
      const coverage = covered / 11;
      const total = edge.pieces.reduce((sum, p) => sum + p.len, 0);
      edge.error = total
        ? edge.pieces.reduce((sum, p) => sum + angleDiff(p.angle, edge.angle) * p.len, 0) / total
        : null;
      // in the right place counts for a quarter, at the right angle the rest
      const angleScore = edge.error === null ? 0 : Math.max(0, 1 - Math.abs(edge.error) / 10);
      const score = coverage * (0.25 + 0.75 * angleScore);
      const drawn = coverage >= 0.3 || total > 0;

      if (!edge.e.shown) {
        // back edges are a bonus: judged only if you drew a line along one
        // (their ends touch the front edges, so coverage alone can't tell)
        if (!total) return;
        hiddenDrawn++;
      } else {
        scores.push(score);
      }
      status.set(edge.e, score >= 0.7 ? "good" : drawn ? "off" : "missing");
    });

    const score = scores.length
      ? Math.round((100 * scores.reduce((a, b) => a + b, 0)) / scores.length)
      : 100;

    // the most useful few things to say, most important first
    const tips = [];
    const missing = edges.filter((edge) => status.get(edge.e) === "missing").length;
    if (missing)
      tips.push(`${missing} edge${missing === 1 ? " is" : "s are"} still missing (shown in red).`);

    const parallel = [];
    const diverging = [];
    [0, 1, 2].forEach((axis) => {
      const group = edges.filter((edge) => edge.e.axis === axis && edge.error !== null);
      if (group.length < 2) return;
      if (!geom.vps[axis]) {
        // no vanishing point: these edges should stay parallel
        const leaning = group.filter((edge) => !given.has(edge.e) && Math.abs(edge.error) > 4);
        if (leaning.length)
          tips.push(
            axis === 1
              ? "Keep the upright edges straight up and down. Here they never lean."
              : `Keep ${axisName(axis)} parallel to each other.`,
          );
        return;
      }
      // the pair that should lean toward each other the most
      let pair = null;
      group.forEach((p) =>
        group.forEach((q) => {
          const spread = Math.abs(angleDiff(p.angle, q.angle));
          if (p !== q && (!pair || spread > pair.spread)) pair = { p, q, spread };
        }),
      );
      if (!pair || pair.spread < 3 || (given.has(pair.p.e) && given.has(pair.q.e))) return;
      const real = angleDiff(pair.p.angle, pair.q.angle);
      const yours = angleDiff(pair.p.angle + pair.p.error, pair.q.angle + pair.q.error);
      if (Math.sign(yours) !== Math.sign(real) && Math.abs(yours) > 1) diverging.push(axisName(axis));
      else if (Math.abs(yours) < Math.abs(real) * 0.4) parallel.push(axisName(axis));
    });
    const listed = (names) => {
      const text = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
      return text[0].toUpperCase() + text.slice(1);
    };
    if (parallel.length)
      tips.push(
        `${listed(parallel)} are almost parallel. In perspective they should lean toward each other and meet at a vanishing point (try "vanishing lines").`,
      );
    if (diverging.length)
      tips.push(
        `${listed(diverging)} spread apart. They should get closer together as they go back, toward their vanishing point.`,
      );

    const worst = edges
      .filter((edge) => !given.has(edge.e) && edge.error !== null && edge.e.shown)
      .sort((a, b) => Math.abs(b.error) - Math.abs(a.error))[0];
    if (worst && Math.abs(worst.error) > 6) {
      const steeper = tilt(worst.angle + worst.error) > tilt(worst.angle);
      tips.push(
        `One of ${axisName(worst.e.axis)} is about ${Math.round(Math.abs(worst.error))}° too ${steeper ? "steep" : "flat"} (shown in orange).`,
      );
    }
    if (wobbly)
      tips.push(
        "Some lines are wobbly. Try one quick, confident stroke from your shoulder, or hold at the end to snap it straight.",
      );
    if (stray)
      tips.push(`${stray === 1 ? "A line doesn't" : "A few lines don't"} match any edge of the box.`);
    if (!hiddenDrawn && geom.edges.some((e) => !e.shown) && score >= 60)
      tips.push("Next, try drawing through: add the dashed back edges you can't see.");
    if (!tips.length) tips.push("Your angles match the box. Nice!");

    const verdict =
      score >= 90 ? "great box!" : score >= 75 ? "close!" : score >= 50 ? "getting there" : "keep practicing";
    return { score, verdict, status, tips: tips.slice(0, 3) };
  };

  const showFeedback = (result) => {
    feedbackEl.hidden = false;
    scoreEl.textContent = `${result.score}% · ${result.verdict}`;
    tipsEl.replaceChildren(
      ...result.tips.map((tip) => {
        const item = document.createElement("li");
        item.textContent = tip;
        return item;
      }),
    );
  };

  // "check": the whole correct box over your drawing, back edges dashed,
  // each edge colored by how well you drew it
  const STATUS_COLORS = {
    good: "rgba(46, 157, 91, 0.85)",
    off: "rgba(224, 138, 30, 0.9)",
    missing: "rgba(214, 69, 69, 0.85)",
  };
  let analysis = null;

  const paintCheck = (target, w) => {
    geom.edges.forEach((e) => {
      const color = STATUS_COLORS[analysis && analysis.status.get(e)] || CHECK_COLOR;
      if (!e.shown) target.setLineDash([8, 6]);
      paint(target, [edgeLine(e)], w, e.shown ? LINE_WIDTH : 1.5, color);
      target.setLineDash([]);
    });
  };

  let frame = null;
  const redraw = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      ctx.clearRect(0, 0, width, canvas.height);
      paint(ctx, givenLines(), width, LINE_WIDTH, GIVEN_COLOR);
      paint(ctx, current ? [...strokes, current] : strokes, width, LINE_WIDTH);
      if (checking) paintCheck(ctx, width);
    });
  };

  const updateButtons = () => {
    undoButton.disabled = history.length === 0;
    redoButton.disabled = redoStack.length === 0;
    clearButton.disabled = strokes.length === 0;
    doneButton.disabled = strokes.length === 0;
    checkButton.textContent = checking ? "hide check" : "check";
    checkButton.setAttribute("aria-pressed", String(checking));
    // the feedback follows along while "check" is on
    if (checking) {
      analysis = analyze();
      showFeedback(analysis);
    } else {
      feedbackEl.hidden = true;
    }
  };

  const toggleCheck = () => {
    checking = !checking;
    updateButtons();
    redraw();
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  };
  new ResizeObserver(resize).observe(canvas);

  const pointAt = (e) => {
    const rect = canvas.getBoundingClientRect();
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.width];
  };

  // touch gestures (they work with a mouse too): double-tap a line to erase
  // it, and hold still at the end of a stroke to snap it straight, like
  // Procreate's QuickShape. Taps never leave dots behind.
  const TAP_MOVE = 8; // px a tap may wander
  const TAP_MS = 300;
  const DOUBLE_TAP_MS = 350;
  const DOUBLE_TAP_GAP = 30; // px between the two taps
  const HOLD_MS = 450;
  const HOLD_STILL = 5; // px the pointer may drift and still be "holding"
  const MIN_STRAIGHT = 20; // px a stroke needs before it can be straightened
  let lastTap = null; // { point, t }
  let holdTimer = null;
  let holdAnchor = null;

  // (measured directly if the pad hasn't been laid out and sized yet)
  const padWidth = () => width || canvas.clientWidth;
  const px = ([x, y]) => [x * padWidth(), y * padWidth()];
  const gap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) * padWidth();

  const straighten = () => {
    if (!current || current.straight) return;
    const last = current[current.length - 1];
    if (gap(current[0], last) < MIN_STRAIGHT) return;
    current.splice(0, current.length, current[0], last);
    current.straight = true;
    if (navigator.vibrate) navigator.vibrate(8);
    redraw();
  };

  const restartHold = (point) => {
    clearTimeout(holdTimer);
    holdAnchor = point;
    holdTimer = setTimeout(straighten, HOLD_MS);
  };

  // distance from a point to a line segment, in px
  const toSegment = (p, a, b) => segDist(px(p), px(a), px(b));

  // erase the line nearest the tap (if it's close enough); undo brings it back
  const eraseAt = (point, pointerType) => {
    const reach = pointerType === "mouse" ? 12 : 24;
    let best = -1;
    let bestGap = reach;
    strokes.forEach((stroke, i) => {
      const d =
        stroke.length === 1
          ? gap(point, stroke[0])
          : Math.min(...stroke.slice(1).map((p, j) => toSegment(point, stroke[j], p)));
      if (d <= bestGap) {
        best = i;
        bestGap = d;
      }
    });
    if (best < 0) return;
    const [stroke] = strokes.splice(best, 1);
    history.push({ type: "erase", stroke, index: best });
    redoStack = [];
    updateButtons();
    redraw();
  };

  const tap = (point, pointerType) => {
    const now = performance.now();
    if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && gap(point, lastTap.point) < DOUBLE_TAP_GAP) {
      lastTap = null;
      eraseAt(point, pointerType);
    } else {
      lastTap = { point, t: now };
    }
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || current) return;
    try {
      canvas.setPointerCapture(e.pointerId); // keep the line going off the edge
    } catch {}
    const point = pointAt(e);
    current = [point];
    current.pointerId = e.pointerId;
    current.startedAt = performance.now();
    current.wandered = 0; // furthest it has been from where it started, in px
    restartHold(point);
    redraw();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!current || e.pointerId !== current.pointerId) return;
    // coalesced events keep fast strokes smooth
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (events.length ? events : [e]).forEach((ev) => {
      const point = pointAt(ev);
      current.wandered = Math.max(current.wandered, gap(point, current[0]));
      // once straightened, the line pivots on its start and follows you
      if (current.straight) current[1] = point;
      else current.push(point);
      if (gap(point, holdAnchor) > HOLD_STILL) restartHold(point);
    });
    redraw();
  });

  const endStroke = (e) => {
    if (!current || e.pointerId !== current.pointerId) return;
    clearTimeout(holdTimer);
    const stroke = current;
    current = null;
    const isTap =
      !stroke.straight &&
      stroke.wandered < TAP_MOVE &&
      performance.now() - stroke.startedAt < TAP_MS;
    if (isTap) {
      if (e.type === "pointerup") tap(stroke[0], e.pointerType);
      redraw();
      return;
    }
    const kept = stroke.map((p) => p);
    strokes.push(kept);
    history.push({ type: "stroke", stroke: kept });
    redoStack = [];
    updateButtons();
    redraw();
  };
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);

  const undo = () => {
    const step = history.pop();
    if (!step) return;
    if (step.type === "stroke") strokes.splice(strokes.lastIndexOf(step.stroke), 1);
    else if (step.type === "erase") strokes.splice(step.index, 0, step.stroke);
    else strokes = step.strokes;
    redoStack.push(step);
    updateButtons();
    redraw();
  };

  const redo = () => {
    const step = redoStack.pop();
    if (!step) return;
    if (step.type === "stroke") strokes.push(step.stroke);
    else if (step.type === "erase") strokes.splice(strokes.indexOf(step.stroke), 1);
    else strokes = [];
    history.push(step);
    updateButtons();
    redraw();
  };

  // clearing can be undone too
  const clear = () => {
    if (!strokes.length) return;
    history.push({ type: "clear", strokes });
    strokes = [];
    redoStack = [];
    updateButtons();
    redraw();
  };

  // ctrl+z / cmd+z undo; ctrl+shift+z, cmd+shift+z or ctrl+y redo
  addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    } else if (key === "y") {
      e.preventDefault();
      redo();
    }
  });

  // a small white-backed copy of the drawing for today's list
  const thumbnail = () => {
    const thumb = document.createElement("canvas");
    thumb.width = 240;
    thumb.height = Math.round((240 * canvas.clientHeight) / canvas.clientWidth);
    const tctx = thumb.getContext("2d");
    tctx.fillStyle = "#fff";
    tctx.fillRect(0, 0, thumb.width, thumb.height);
    paint(tctx, givenLines(), thumb.width, 1.5, GIVEN_COLOR);
    paint(tctx, strokes, thumb.width, 1.5);
    return thumb.toDataURL("image/png");
  };

  const done = () => {
    if (!strokes.length) return;
    const day = todayKey();
    progress.counts[day] = (progress.counts[day] || 0) + 1;
    todaysThumbs().push({ src: thumbnail(), score: analyze().score });
    if (!save()) {
      // probably out of space: drop the pictures, keep the count
      progress.thumbs.images = [];
      save();
    }
    newBox();
    showProgress();
  };

  // a new reference also means a fresh page, since the starting lines move
  const levelEl = document.querySelector(".draw-level");

  const newBox = () => {
    const level = currentLevel();
    geom = project(makeBox(level.points));
    geom.given = startingEdges(geom, level.start);
    drawReference();
    levelEl.textContent = `${
      level.number > GOAL ? "bonus box" : `box ${level.number} of ${GOAL}`
    } · ${level.points}-point · ${START_LABELS[level.start]}`;
    strokes = [];
    history = [];
    redoStack = [];
    checking = false;
    analysis = null;
    updateButtons();
    redraw();
  };

  document.querySelector('[data-action="new-box"]').addEventListener("click", newBox);
  undoButton.addEventListener("click", undo);
  redoButton.addEventListener("click", redo);
  clearButton.addEventListener("click", clear);
  doneButton.addEventListener("click", done);
  checkButton.addEventListener("click", toggleCheck);

  newBox();
  showProgress();
})();
