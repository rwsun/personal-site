// blog.html: journal cards. The front shows the title, date and photo; click a
// card to flip it over to the journal. Cards tilt toward the cursor on hover.
// Entries are added on blog-admin.html and saved in Supabase (or, until
// js/supabase-config.js is filled in, in this browser only).

const LOCAL_KEY = "blog-entries"; // where blog-admin.html saves without Supabase
const TILT = 10; // max tilt in degrees

const list = document.querySelector(".blog-list");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

const loadEntries = async () => {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?select=id,title,date,photo_url,journal&order=date.desc,created_at.desc`,
      { headers: supabaseKeyHeaders() },
    );
    if (!res.ok) throw new Error(`load failed: ${res.status}`);
    return res.json();
  }
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
  } catch {}
  return saved.sort((a, b) => b.date.localeCompare(a.date));
};

// "2023-12-04" -> "Dec-04-2023" (front) and as-is (back)
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]}-${d}-${y}`;
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const buildCard = (entry) => {
  // .blog-card fades in; .blog-flipper tilts and turns over (one transform, so
  // they don't fight). Both faces share one grid cell, so the card is as tall
  // as its taller side
  const card = el("article", "blog-card");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", "false");
  card.setAttribute("aria-label", `${entry.title}: flip to read the journal`);

  const flipper = el("div", "blog-flipper");

  const front = el("div", "blog-face blog-front");
  front.append(el("h2", "blog-card-title", entry.title), el("p", "blog-card-date", prettyDate(entry.date)));
  const photo = el("div", "blog-photo");
  if (entry.photo_url) {
    const img = el("img");
    img.src = entry.photo_url;
    img.alt = "";
    img.loading = "lazy";
    photo.append(img);
  }
  front.append(photo);

  const back = el("div", "blog-face blog-back");
  back.setAttribute("aria-hidden", "true");
  // plain text only, so nobody can inject HTML
  back.append(
    el("h2", "blog-card-title", entry.title),
    el("p", "blog-card-date", entry.date),
    el("p", "blog-journal", entry.journal),
  );

  flipper.append(front, back);
  card.append(flipper);

  // ---- flip on click / Enter / Space ----
  let flipTimer = null;
  const flip = () => {
    // slow turn even mid-tilt (tilting uses a quick transition)
    card.classList.add("is-flipping");
    clearTimeout(flipTimer);
    flipTimer = setTimeout(() => card.classList.remove("is-flipping"), 700);
    const flipped = card.classList.toggle("is-flipped");
    card.setAttribute("aria-pressed", String(flipped));
    front.setAttribute("aria-hidden", String(flipped));
    back.setAttribute("aria-hidden", String(!flipped));
  };
  card.addEventListener("click", flip);
  card.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    flip();
  });

  // ---- card tilt: the edge under the cursor dips away, like pressing a card; glare follows ----
  if (canHover && !reduceMotion) {
    card.addEventListener("pointermove", (e) => {
      const box = card.getBoundingClientRect();
      const x = (e.clientX - box.left) / box.width; // 0..1
      const y = (e.clientY - box.top) / box.height;
      card.style.setProperty("--tilt-x", `${(0.5 - y) * TILT}deg`);
      card.style.setProperty("--tilt-y", `${(0.5 - x) * TILT}deg`);
      card.style.setProperty("--glare-x", `${x * 100}%`);
      card.style.setProperty("--glare-y", `${y * 100}%`);
      card.style.setProperty("--shadow-x", `${(0.5 - x) * 24}px`);
      card.style.setProperty("--shadow-y", `${(0.5 - y) * 24 + 14}px`);
      card.classList.add("is-tilting");
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-tilting");
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.removeProperty("--shadow-x");
      card.style.removeProperty("--shadow-y");
    });
  }

  return card;
};

// cards fade up as they're reached
const fadeObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      fadeObserver.unobserve(entry.target);
    }),
  { threshold: 0.15 },
);

loadEntries()
  .then((entries) => {
    if (!entries.length) {
      list.append(el("p", "blog-empty", "First entry coming soon!"));
      return;
    }
    entries.forEach((entry) => {
      const card = buildCard(entry);
      if (!reduceMotion) {
        card.classList.add("fade-in");
        fadeObserver.observe(card);
      }
      list.append(card);
    });
  })
  .catch(() => list.append(el("p", "blog-empty", "Couldn't load the blog. Please try again later.")));
