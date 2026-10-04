// drag-and-throw physics: pick something up, fling it, and it flies off with the
// speed you threw it at, bounces off the walls and settles on the floor.
// Used for the landing's icons and words, and for the photos further down.
//
//   const world = createThrowWorld({ container, floor });
//   world.add(handle, { measure, lift });
//
// container: positioned element the things are thrown around in
// floor():   y (in container px) of the surface things land on
// handle:    the element you press on to pick the thing up
// measure:   the element whose box says where the thing starts (default: handle)
// lift():    called on the first pick-up; returns { el, w, h } for the element
//            that gets moved, plus `grab` if a different element takes over as
//            the handle, `sink` for how many px it sinks into the floor, and
//            `inPlace: true` if el is moved where it stands (translated from
//            its spot in the layout) instead of from the container's top left
function createThrowWorld({ container, floor }) {
  const GRAVITY = 2400;
  const BOUNCE = 0.55;
  const DRAG_START = 6;
  const MAX_THROW = 2500;
  const bodies = new Set();
  let frame = null;
  let lastTime = 0;
  let topZ = 5; // whatever was picked up last lands on top

  // where an in-place element sits in the layout, in container px
  // (offsets ignore transforms, so the throw itself doesn't skew this)
  const layoutSpot = (el) => {
    let x = 0;
    let y = 0;
    for (let node = el; node && node !== container; node = node.offsetParent) {
      x += node.offsetLeft;
      y += node.offsetTop;
    }
    return { x, y };
  };

  // half the size of the box a tilted thing takes up, so its corners (not just
  // its untilted outline) hit the walls and floor
  const halfExtents = (body) => {
    const rad = (body.angle * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    return {
      x: (body.w * cos + body.h * sin) / 2,
      y: (body.w * sin + body.h * cos) / 2,
    };
  };

  const place = (body) => {
    const x = body.inPlace ? body.x - body.spot.x : body.x;
    const y = body.inPlace ? body.y - body.spot.y : body.y;
    body.el.style.transform = `translate(${x}px, ${y}px) rotate(${body.angle}deg)`;
  };

  const step = (now) => {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    let moving = false;

    bodies.forEach((body) => {
      if (body.held || body.resting) return;
      moving = true;
      body.vy += GRAVITY * dt;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.angle += body.vx * dt * 0.4;

      const half = halfExtents(body);
      const minX = half.x - body.w / 2;
      const maxX = container.clientWidth - half.x - body.w / 2;
      if (body.x < minX) {
        body.x = minX;
        body.vx = -body.vx * BOUNCE;
      } else if (body.x > maxX) {
        body.x = maxX;
        body.vx = -body.vx * BOUNCE;
      }
      if (body.y < -body.h) body.vy = Math.abs(body.vy) * BOUNCE;

      const bottom = floor() + body.sink - half.y - body.h / 2;
      if (body.y >= bottom) {
        body.y = bottom;
        body.vy = Math.abs(body.vy) < 90 ? 0 : -body.vy * BOUNCE;
        body.vx *= body.vy === 0 ? Math.pow(0.03, dt) : 0.85; // slide to a stop
        if (body.vy === 0 && Math.abs(body.vx) < 8) {
          body.vx = 0;
          body.resting = true;
        }
      }
      place(body);
    });

    frame = moving ? requestAnimationFrame(step) : null;
  };

  const wake = () => {
    if (frame) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(step);
  };

  // set the body's position from where its element is on screen right now
  const measureInto = (body, box) => {
    const containerBox = container.getBoundingClientRect();
    body.x = box.left + box.width / 2 - body.w / 2 - containerBox.left;
    body.y = box.top + box.height / 2 - body.h / 2 - containerBox.top;
  };

  const add = (handle, { measure = handle, lift }) => {
    let body = null;
    let grab = handle;
    let press = null; // { id, x, y, dragging, offsetX, offsetY, samples }
    let justDragged = false;

    const pickUp = () => {
      if (!body) {
        const box = measure.getBoundingClientRect();
        const lifted = lift();
        body = {
          el: lifted.el,
          w: lifted.w,
          h: lifted.h,
          sink: lifted.sink || 0,
          inPlace: !!lifted.inPlace,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          angle: 0,
          held: false,
          resting: false,
        };
        if (body.inPlace) body.spot = layoutSpot(body.el);
        measureInto(body, box);
        bodies.add(body);
        // a photo that flips to the next picture can change size: fall again
        // with the new size so it still lands right on the floor
        if (body.inPlace) {
          const thrown = body;
          new ResizeObserver(() => {
            thrown.w = thrown.el.offsetWidth;
            thrown.h = thrown.el.offsetHeight;
            thrown.resting = false;
            wake();
          }).observe(thrown.el);
        }
        if (lifted.grab && lifted.grab !== grab) {
          grab = lifted.grab;
          listen(grab);
        }
      } else if (body.inPlace) {
        // the layout may have shifted since it landed (photos loading above it)
        body.spot = layoutSpot(body.el);
        measureInto(body, body.el.getBoundingClientRect());
      }
      body.el.style.zIndex = ++topZ;
      place(body);
      return body;
    };

    const listen = (el) => {
      el.addEventListener("dragstart", (e) => e.preventDefault());

      el.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        press = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          dragging: false,
          samples: [],
        };
        // no pointer capture until it's really a drag: capturing now would send
        // a plain click to `el` instead of the photo or icon inside it
      });

      // a drag shouldn't also count as a click (open the link, flip the photo)
      el.addEventListener(
        "click",
        (e) => {
          if (!justDragged) return;
          e.preventDefault();
          e.stopPropagation();
          justDragged = false;
        },
        true,
      );
    };
    listen(handle);

    // move/release are watched on the whole window: lifting a thing out of its
    // spot moves it in the page, which drops the pointer capture
    addEventListener("pointermove", (e) => {
      if (!press || e.pointerId !== press.id) return;
      const containerBox = container.getBoundingClientRect();

      if (!press.dragging) {
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_START)
          return;
        pickUp();
        try {
          grab.setPointerCapture(press.id);
        } catch {}
        body.held = true;
        body.resting = false;
        press.dragging = true;
        press.offsetX = press.x - containerBox.left - body.x;
        press.offsetY = press.y - containerBox.top - body.y;
        document.documentElement.classList.add("is-grabbing");
      }

      body.x = e.clientX - containerBox.left - press.offsetX;
      body.y = e.clientY - containerBox.top - press.offsetY;
      body.angle *= 0.9;
      place(body);

      // remember the last ~100ms of movement to throw with the right speed
      const now = performance.now();
      press.samples.push({ t: now, x: body.x, y: body.y });
      while (press.samples.length > 2 && now - press.samples[0].t > 100)
        press.samples.shift();
    });

    const release = (e) => {
      if (!press || e.pointerId !== press.id) return;
      if (press.dragging) {
        const first = press.samples[0];
        const last = press.samples[press.samples.length - 1];
        const dt =
          first && last && last.t > first.t ? (last.t - first.t) / 1000 : 0;
        const clamp = (v) => Math.max(-MAX_THROW, Math.min(MAX_THROW, v));
        body.vx = dt ? clamp((last.x - first.x) / dt) : 0;
        body.vy = dt ? clamp((last.y - first.y) / dt) : 0;
        body.held = false;
        // the click (if any) follows right after this; forget the drag after it
        justDragged = true;
        setTimeout(() => (justDragged = false));
        document.documentElement.classList.remove("is-grabbing");
        wake();
      }
      press = null;
    };
    addEventListener("pointerup", release);
    addEventListener("pointercancel", release);
  };

  // the floor and walls move when the page changes size: let things re-settle
  const resettle = () => {
    bodies.forEach((body) => {
      if (body.inPlace) body.spot = layoutSpot(body.el);
      body.resting = false;
    });
    if (bodies.size) wake();
  };
  new ResizeObserver(resettle).observe(container);
  addEventListener("resize", resettle);

  return { add };
}
