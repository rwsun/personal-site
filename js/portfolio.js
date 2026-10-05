// portfolio.html: Instagram-style posts with likes and comments.

// ---------------------------------------------------------------------------
// Your art. Add a line per piece: put the image in the img/portfolio folder,
// then give it a unique id (that's what likes and comments are attached to, so
// never reuse or rename one), the file path, the caption shown under the post,
// a short description for screen readers (alt), and the number of likes it
// starts with. Posts with no image show a grey placeholder.
// ---------------------------------------------------------------------------
const POSTS = [
  { id: "campfire-shirt-back", image: "img/portfolio/campfire-shirt-back.png", caption: "Back of Campfire T-shirt, printed 15,000 times worldwide!", alt: "campfire shirt back", likes: 0 },
  { id: "counterspell-ottawa-postcard", image: "img/portfolio/counterspell-ottawa-postcard.png", caption: "First time making a postcard - for Counterspell Ottawa!", alt: "counterspell ottawa postcard", likes: 0 },
  { id: "daydream-landing-ui", image: "img/portfolio/daydream-landing-ui.png", caption: "Daydream's UI/UX - pulled an all-nighter for this!", alt: "Daydream's UI/UX - pulled an all-nighter for this", likes: 0 },
  { id: "daydream-shirt", image: "img/portfolio/daydream-shirt.png", caption: "Daydream T-shirt, printed 8,000 times worldwide! (if you speak mandarin, please ignore this)", alt: "daydream shirt", likes: 0 },
  { id: "daydream-sticker-sheet", image: "img/portfolio/daydream-sticker-sheet.png", caption: "Daydream's special sticker sheet!", alt: "daydream sticker sheet", likes: 0 },
  { id: "fallout-animatic", image: "img/portfolio/fallout-animatic.png", caption: "Fallout's animatic! Check it out on youtube :D", alt: "fallout animatic", likes: 0 },
  { id: "fallout-landing-page-ui", image: "img/portfolio/fallout-landing-page-ui.png", caption: "Fallout's landing page UI!", alt: "fallout landing page ui", likes: 0 },
  { id: "fallout-platform-ui", image: "img/portfolio/fallout-platform-ui.png", caption: "Fallout's platform UI!", alt: "fallout platform ui", likes: 0 },
  { id: "fallout-postcard-and-stickers", image: "img/portfolio/fallout-postcard-and-stickers.png", caption: "Fallout's postcards and sticker sheet - printed 10,000 times worldwide!", alt: "fallout postcard and stickers", likes: 0 },
  { id: "midnight-sticker", image: "img/portfolio/midnight-sticker.png", caption: "Midnight custom stickers!", alt: "Midnight custom stickers!", likes: 0 },
  { id: "scrapyard-hoodie", image: "img/portfolio/scrapyard-hoodie.png", caption: "Scrapyard hoodie, printed 200 times for our Austin TX hackathon!", alt: "scrapyard hoodie", likes: 0 },
  { id: "scrapyard-postcard", image: "img/portfolio/scrapyard-postcard.png", caption: "Custom postcard for Scrapyard <3", alt: "scrapyard postcard", likes: 0 },
  { id: "shipwrecked-hoodie", image: "img/portfolio/shipwrecked-hoodie.png", caption: "Custom hoodie for Shipwrecked!", alt: "shipwrecked hoodie", likes: 0 },
  { id: "shipwrecked-sticker-sheet", image: "img/portfolio/shipwrecked-sticker-sheet.png", caption: "Shipwrecked's custom sticker sheet!", alt: "shipwrecked sticker sheet", likes: 0 },
  { id: "shirt-fallout", image: "img/portfolio/shirt-fallout.png", caption: "Fallout's custom jersey - manufacturing it took so long haha", alt: "shirt fallout", likes: 0 },
  { id: "sticker-fallout", image: "img/portfolio/sticker-fallout.png", caption: "Fallout custom stickers <3 My fav's the koi fish!", alt: "sticker fallout", likes: 0 },
];

// Shared likes + comments use the Supabase settings in js/supabase-config.js
// (loaded before this file).

const MAX_COMMENT = 1000; // characters
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SHOWN_COMMENTS = 2; // latest comments shown before "View all"

// ---------- small helpers ----------

const remember = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      value === null
        ? localStorage.removeItem(key)
        : localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

// "now", "5m", "3h", "2d", "4w", like Instagram
const timeAgo = (date) => {
  const s = Math.max(0, (Date.now() - new Date(date)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
};

const HEART_PATH =
  "M12 20.5s-7.5-4.6-9.6-9.2C.9 8 2.6 4 6.4 4c2.3 0 3.9 1.3 5.6 3.3C13.7 5.3 15.3 4 17.6 4c3.8 0 5.5 4 4 7.3-2.1 4.6-9.6 9.2-9.6 9.2z";
const BUBBLE_PATH =
  "M12 3.5c-4.9 0-8.75 3.4-8.75 7.6 0 2 .9 3.9 2.4 5.2l-.9 3.9 4.1-1.9c1 .3 2 .4 3.15.4 4.9 0 8.75-3.4 8.75-7.6S16.9 3.5 12 3.5z";

// ---------- comment storage: Supabase when configured, this browser otherwise ----------

const shared = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabaseHeaders = {
  ...supabaseKeyHeaders(),
  "Content-Type": "application/json",
};

const commentStore = shared
  ? {
      async load(postIds) {
        // emails are never requested (the database doesn't let the public read them)
        const url =
          `${SUPABASE_URL}/rest/v1/comments?select=post_id,username,body,created_at` +
          `&post_id=in.(${postIds.map(encodeURIComponent).join(",")})&order=created_at.asc`;
        const res = await fetch(url, { headers: supabaseHeaders });
        if (!res.ok) throw new Error(`load failed: ${res.status}`);
        return res.json();
      },
      async add(comment) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
          method: "POST",
          headers: { ...supabaseHeaders, Prefer: "return=minimal" },
          body: JSON.stringify(comment),
        });
        if (!res.ok) throw new Error(`post failed: ${res.status}`);
      },
    }
  : {
      async load() {
        return remember.get("comments") || [];
      },
      async add(comment) {
        const { email, ...withoutEmail } = comment;
        const all = remember.get("comments") || [];
        all.push({ ...withoutEmail, created_at: new Date().toISOString() });
        remember.set("comments", all);
      },
    };

// ---------- like storage: Supabase when configured, this browser otherwise ----------

const likeStore = shared
  ? {
      async load(postIds) {
        const url =
          `${SUPABASE_URL}/rest/v1/post_likes?select=post_id,likes` +
          `&post_id=in.(${postIds.map(encodeURIComponent).join(",")})`;
        const res = await fetch(url, { headers: supabaseHeaders });
        if (!res.ok) throw new Error(`load failed: ${res.status}`);
        return res.json();
      },
      add(postId, count) {
        // keepalive lets this finish even if the page is closing
        return fetch(`${SUPABASE_URL}/rest/v1/rpc/add_likes`, {
          method: "POST",
          headers: supabaseHeaders,
          body: JSON.stringify({ p_post_id: postId, p_count: count }),
          keepalive: true,
        });
      },
    }
  : {
      async load() {
        const saved = remember.get("likes") || {};
        return Object.entries(saved).map(([post_id, likes]) => ({ post_id, likes }));
      },
      async add(postId, count) {
        const saved = remember.get("likes") || {};
        saved[postId] = (saved[postId] || 0) + count;
        remember.set("likes", saved);
      },
    };

// ---------- per-post state ----------

// saved: likes from everyone before this visit, added: this visit's clicks,
// unsent: clicks not stored yet
const state = {};
POSTS.forEach((p) => {
  state[p.id] = { saved: 0, added: 0, unsent: 0, comments: [] };
});

// clicks are sent in batches, so a burst of 30 clicks is one request
let sendTimer = null;
const sendLikes = () => {
  clearTimeout(sendTimer);
  POSTS.forEach(({ id }) => {
    const count = state[id].unsent;
    if (!count) return;
    state[id].unsent = 0;
    likeStore.add(id, count).catch(() => {});
  });
};
const queueLikes = () => {
  clearTimeout(sendTimer);
  sendTimer = setTimeout(sendLikes, 800);
};
addEventListener("pagehide", sendLikes);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) sendLikes();
});
const renderers = {}; // id -> that post's render function
const rerender = (id) => renderers[id] && renderers[id]();

// who is commenting (remembered in this browser so they only type it once)
let commenter = remember.get("commenter"); // { username, email } or null

// ---------- like animations ----------

// after 99 likes on one post in one visit: a glitchy black error screen with
// VHS sound stays up for 7 seconds, then the tab "closes"
const LOVE_LIMIT = 99;
const LOVE_SCREEN_MS = 7000;
const vhsSound = new Audio("audio/vhs.mp3");
vhsSound.preload = "auto";
let heartbroken = false;
const tooMuchLove = () => {
  if (heartbroken) return;
  heartbroken = true;
  sendLikes();

  const message = "sorry, you can’t love someone so much";
  const screen = el("div", "love-error");
  screen.setAttribute("role", "alertdialog");
  screen.setAttribute("aria-label", message);
  const text = el("p", "love-error-text", message);
  text.dataset.text = message; // the glitch layers copy this
  screen.append(text);
  // let the 99 show on screen for a moment first
  setTimeout(() => {
    document.body.append(screen);
    vhsSound.play().catch(() => {}); // allowed: it follows the visitor's click
  }, 150);

  setTimeout(() => {
    window.close();
    // browsers only let a script close tabs it opened itself, so if the tab
    // is still here, leave the site for a blank page instead
    setTimeout(() => location.replace("about:blank"), 100);
  }, 150 + LOVE_SCREEN_MS);
};

const BURST_COLORS = ["#e8336d", "#ff7a59", "#ffc83d", "#ff5fa2"];

// YouTube-style: the heart bounces, a ring pulses out, a spray of tiny hearts
// and dots flies off in every direction, and a "+1" floats up
const likeBurst = (button) => {
  button.classList.remove("pop");
  void button.offsetWidth; // restart the bounce even on rapid clicks
  button.classList.add("pop");
  if (reduceMotion) return;

  const heart = button.querySelector(".heart");
  const burst = el("span", "like-burst");
  burst.setAttribute("aria-hidden", "true");
  burst.style.left = `${heart.offsetLeft + heart.offsetWidth / 2}px`;
  burst.style.top = `${heart.offsetTop + heart.offsetHeight / 2}px`;
  burst.append(el("span", "like-ring"), el("span", "like-plus", "+1"));

  const pieces = 10;
  for (let i = 0; i < pieces; i++) {
    const angle = (i / pieces) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 26 + Math.random() * 18;
    const piece = el("span", i % 2 ? "like-particle is-dot" : "like-particle");
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    piece.style.setProperty("--spin", `${Math.round(Math.random() * 120 - 60)}deg`);
    piece.style.color = BURST_COLORS[i % BURST_COLORS.length];
    if (!piece.classList.contains("is-dot")) piece.textContent = "♥";
    burst.appendChild(piece);
  }

  button.appendChild(burst);
  setTimeout(() => burst.remove(), 900);
};

// Instagram-style big heart over the photo after a double-click
const photoHeart = (photo) => {
  if (reduceMotion) return;
  const big = icon(HEART_PATH, "photo-heart");
  photo.appendChild(big);
  setTimeout(() => big.remove(), 900);
};

// ---------- building one post ----------

const container = document.querySelector(".portfolio-posts");
const backHome = container.querySelector(".acad-back");

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const icon = (path, className) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  svg.appendChild(p);
  return svg;
};

const buildPost = (post) => {
  const s = state[post.id];
  const article = el("article", "post");

  // photo (grey placeholder when there's no image yet)
  const photo = el("div", "post-photo");
  if (post.image) {
    const img = el("img");
    img.src = post.image;
    img.alt = post.alt || "";
    img.loading = "lazy";
    photo.appendChild(img);
  }

  // like + comment buttons
  const actions = el("div", "post-actions");
  const likeButton = el("button", "like-button");
  likeButton.type = "button";
  const likeCount = el("span", "like-count");
  likeButton.append(icon(HEART_PATH, "heart"), likeCount);
  const commentButton = el("button", "comment-button");
  commentButton.type = "button";
  commentButton.setAttribute("aria-label", "comment");
  const commentCount = el("span", "comment-count");
  commentButton.append(icon(BUBBLE_PATH, "bubble"), commentCount);
  actions.append(likeButton, commentButton);

  // caption, Instagram style: "ren  caption text"
  const caption = el("p", "post-caption");
  if (post.caption) caption.append(el("strong", "comment-user", "ren"), " " + post.caption);

  // comments
  const viewAll = el("button", "view-all");
  viewAll.type = "button";
  const list = el("ul", "comment-list");
  let expanded = false;

  // the comment form: username + email (first time only), then the comment itself
  const form = el("form", "comment-form");
  form.noValidate = true;
  const identity = el("div", "comment-identity");
  const username = el("input", "comment-input");
  Object.assign(username, {
    name: "username",
    placeholder: "username",
    maxLength: 30,
    autocomplete: "nickname",
  });
  username.setAttribute("aria-label", "username");
  const email = el("input", "comment-input");
  Object.assign(email, {
    name: "email",
    type: "email",
    placeholder: "email (never shown)",
    maxLength: 254,
    autocomplete: "email",
  });
  email.setAttribute("aria-label", "email (never shown publicly)");
  identity.append(username, email);

  const row = el("div", "comment-row");
  const body = el("textarea", "comment-body");
  Object.assign(body, { rows: 1, placeholder: "Add a comment…", maxLength: MAX_COMMENT });
  body.setAttribute("aria-label", "add a comment");
  const postButton = el("button", "comment-post", "Post");
  postButton.type = "submit";
  row.append(body, postButton);

  const meta = el("div", "comment-meta");
  const as = el("span", "comment-as");
  const left = el("span", "comment-left");
  meta.append(as, left);
  const error = el("p", "comment-error");
  error.setAttribute("role", "alert");
  form.append(identity, row, meta, error);

  article.append(photo, actions, ...(post.caption ? [caption] : []), viewAll, list, form);

  // ---- render this copy from the shared state ----
  const render = () => {
    article.classList.toggle("is-liked", s.added > 0);
    likeButton.setAttribute("aria-label", "like");
    likeCount.textContent = (post.likes || 0) + s.saved + s.added;
    commentCount.textContent = s.comments.length;

    const shown = expanded ? s.comments : s.comments.slice(-SHOWN_COMMENTS);
    list.replaceChildren(
      ...shown.map((c) => {
        const li = el("li", "comment");
        // plain text only: nobody can inject HTML into the page
        li.append(
          el("strong", "comment-user", c.username),
          document.createTextNode(" " + c.body + " "),
          el("time", "comment-time", timeAgo(c.created_at)),
        );
        return li;
      }),
    );
    const hidden = s.comments.length - shown.length;
    viewAll.hidden = hidden <= 0;
    viewAll.textContent = `View all ${s.comments.length} comment${s.comments.length === 1 ? "" : "s"}`;

    // username + email only appear once someone starts commenting (or clicks "change")
    identity.hidden = commenter
      ? !form.classList.contains("is-editing")
      : !form.classList.contains("is-active");
    as.replaceChildren();
    if (commenter && identity.hidden) {
      const change = el("button", "comment-change", "change");
      change.type = "button";
      change.addEventListener("click", () => {
        form.classList.add("is-editing");
        username.value = commenter.username;
        email.value = commenter.email;
        render();
        username.focus();
      });
      as.append(`commenting as ${commenter.username} · `, change);
    }
    left.textContent = `${MAX_COMMENT - body.value.length} characters left`;
    postButton.disabled = !body.value.trim();
  };

  // ---- likes: every click adds one, and they're saved for future visitors ----
  const like = () => {
    s.added += 1;
    s.unsent += 1;
    queueLikes();
    rerender(post.id);
    likeBurst(likeButton);
    // the limit is on one visitor's clicks, so popular posts stay likeable
    if (s.added >= LOVE_LIMIT) tooMuchLove();
  };
  likeButton.addEventListener("click", like);
  // double-click the picture to like it, with a big heart over the photo
  photo.addEventListener("dblclick", () => {
    like();
    photoHeart(photo);
  });

  // ---- comments ----
  commentButton.addEventListener("click", () => body.focus());
  form.addEventListener("focusin", () => {
    if (form.classList.contains("is-active")) return;
    form.classList.add("is-active");
    render();
  });
  viewAll.addEventListener("click", () => {
    expanded = true;
    render();
  });
  body.addEventListener("input", () => {
    body.style.height = "auto";
    body.style.height = `${body.scrollHeight}px`; // grow with the text
    error.textContent = "";
    render();
  });
  // Enter posts, Shift+Enter makes a new line (like Instagram)
  body.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = body.value.trim();
    if (!text) return;

    // who's commenting: the remembered details, or what they just typed
    const who = identity.hidden
      ? commenter
      : { username: username.value.trim(), email: email.value.trim() };
    if (!/^[A-Za-z0-9._]{1,30}$/.test(who.username)) {
      error.textContent = "Usernames can use letters, numbers, . and _ (up to 30).";
      username.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who.email)) {
      error.textContent = "Please add a valid email (it's never shown).";
      email.focus();
      return;
    }

    postButton.disabled = true;
    try {
      await commentStore.add({
        post_id: post.id,
        username: who.username,
        email: who.email,
        body: text,
      });
    } catch {
      error.textContent = "Couldn't post that. Please try again.";
      postButton.disabled = false;
      return;
    }

    error.textContent = "";
    commenter = who;
    remember.set("commenter", who);
    s.comments.push({ username: who.username, body: text, created_at: new Date().toISOString() });
    body.value = "";
    body.style.height = "";
    form.classList.remove("is-editing");
    expanded = true;
    // every post's form should now show "commenting as ..."
    Object.keys(renderers).forEach(rerender);
  });

  renderers[post.id] = render;
  render();
  return article;
};

// ---------- show every post once, each fading up as it's reached ----------

const fadeObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      fadeObserver.unobserve(entry.target);
    }),
  { threshold: 0.15 },
);
POSTS.forEach((post) => {
  const article = buildPost(post);
  if (!reduceMotion) {
    article.classList.add("fade-in");
    fadeObserver.observe(article);
  }
  container.insertBefore(article, backHome);
});

// ---------- load the likes and comments ----------

likeStore
  .load(POSTS.map((p) => p.id))
  .then((rows) => {
    rows.forEach((r) => state[r.post_id] && (state[r.post_id].saved = Number(r.likes) || 0));
    POSTS.forEach((p) => rerender(p.id));
  })
  .catch(() => {
    /* counts just start from the POSTS numbers if they can't be loaded */
  });

commentStore
  .load(POSTS.map((p) => p.id))
  .then((rows) => {
    rows.forEach((c) => state[c.post_id] && state[c.post_id].comments.push(c));
    POSTS.forEach((p) => rerender(p.id));
  })
  .catch(() => {
    /* comments just stay empty if they can't be loaded */
  });

// keep "5m ago"-style times fresh
setInterval(() => POSTS.forEach((p) => rerender(p.id)), 60000);
