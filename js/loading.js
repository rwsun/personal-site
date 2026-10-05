// Sims-style loading screen between pages: the swimming fish, with a question
// (and sometimes my answer) underneath that rotates every few seconds.
// Load this in <head> so the screen covers the page before anything else shows.

(() => {
  // Add more here. Leave "answer" out to show just the question.
  const QUESTIONS = [
    { question: "What's your favorite drink?", answer: "A: Mine's Diet Coke!" },
    { question: "What superpower would you want?", answer: "A: Definitely teleportation for me." },
    { question: "If you could have any job, what would it be?", answer: "A: I want to try my hand at bartending!" },
    { question: "What's your biggest non-academic, non work-related accomplishment?", answer: "A: I love writing." },
    { question: "If you were a character, what genre would you live in?", answer: "A: Probably fantasy?" },
    { question: "What's your MBTI?", answer: "I'm ENFJ!" },
    { question: "What's the closest you've ever come to dying?", answer: "A: Almost got hit by a car?" },
    { question: "What's the most memorable meal you've ever had?", answer: "A: Right now, that one meal in Singapore" },
    { question: "What's your least popular opinion?" },
    { question: "What fictional character do you most relate to?" },
    { question: "What do you get the most compliments about?", answer: "A: My eyelashes, maybe?" },
    { question: "What's the most important quality you look for in a friend?", answer: "A: Shared interests?" },
    { question: "What's your favorite quote and why?" },
    { question: "For what would you most like to become famous?", answer: "Making a cool product" },
    { question: "What city/country do you never want to go back to?", answer: "EWR for me!" },
    { question: "What songs have you memorized?", answer: "... None" },
    { question: "Are you usually early or late?", answer: "Right on time." },
    { question: "What’s the best way to start the day?", answer: "Coffee!" },
    { question: "What movie title best describes your life?" },
    { question: "What song best describes your life right now?", answer: "Enough." },
    { question: "What job do you think you’d be really good at?", answer: "Something creative!" },
    { question: "If you didn’t have to sleep, what would you do with the extra time?", answer: "Finish my homework" },
    { question: "What do you do to get rid of stress?", answer: "Call friends / gym / run" },
    { question: "What’s the best thing about your work / school?", answer: "People + Gym + Roommate + Library" },
    { question: "What’s the worst thing about your work / school?", answer: "People" },
    { question: "What do you wish you knew more about?", answer: "Building websites / backend" },
    { question: "What’s your favorite podcast?", answer: "Right now, Rotten Mango!" },
  ];

  const MIN_SHOWN_MS = 2800;
  const ROTATE_MS = 3200;
  const FADE_MS = 400;
  const FONT_WAIT_MS = 800; 
  const SAVED_KEY = "loader-question";

  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nav = performance.getEntriesByType("navigation")[0];
  let cameFromSite = false;
  try {
    cameFromSite = new URL(document.referrer).origin === location.origin;
  } catch {}
  const arriving = cameFromSite && (!nav || nav.type === "navigate");
  const shownAt = performance.now();
  if (arriving) root.classList.add("is-loading", "is-arriving");

  // keep showing the question the last page was on (and for the rest of its
  // turn), so the text doesn't jump to a different one mid-way through
  let index = Math.floor(Math.random() * QUESTIONS.length);
  let questionAt = Date.now(); // when the current question first appeared
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVED_KEY));
    sessionStorage.removeItem(SAVED_KEY);
    if (arriving && saved && Date.now() - saved.at < 10000) {
      index = saved.index % QUESTIONS.length;
      questionAt = saved.at;
    }
  } catch {}

  // the text waits (briefly) for its font: showing it in the fallback font
  // first and then swapping makes the lines jump around
  const fontReady = Promise.race([
    Promise.all([
      document.fonts.load('italic 1em "Libertinus Serif"'),
      document.fonts.load('1em "Libertinus Serif"'),
    ]),
    new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]).catch(() => {});

  let screen, text, rotateTimer;

  const showQuestion = () => {
    const { question, answer } = QUESTIONS[index];
    const q = document.createElement("em");
    q.className = "loader-question";
    q.textContent = question;
    text.replaceChildren(q);
    if (answer) {
      const a = document.createElement("span");
      a.className = "loader-answer";
      a.textContent = answer;
      text.append(a);
    }
  };

  const nextQuestion = () => {
    text.classList.add("is-changing");
    setTimeout(
      () => {
        index = (index + 1) % QUESTIONS.length;
        questionAt = Date.now();
        showQuestion();
        text.classList.remove("is-changing");
      },
      reduceMotion ? 0 : FADE_MS,
    );
  };

  // built straight away (this runs in <head>, before <body> exists), so the
  // screen covers the page from the very first paint
  const build = () => {
    screen = document.createElement("div");
    screen.className = "loader";
    screen.setAttribute("role", "status");
    screen.setAttribute("aria-live", "polite");
    const fish = document.createElement("img");
    fish.className = "loader-fish";
    fish.src = "img/cursor/fish-cursor.gif";
    fish.alt = "";
    text = document.createElement("p");
    text.className = "loader-text is-changing";
    screen.append(fish, text);
    root.append(screen);
    showQuestion();
    fontReady.then(() => text.classList.remove("is-changing"));
  };

  const stopRotating = () => {
    clearTimeout(rotateTimer);
    clearInterval(rotateTimer);
  };

  // rotate on from wherever the current question's turn is up to
  const start = () => {
    stopRotating();
    const left = Math.max(0, ROTATE_MS - (Date.now() - questionAt));
    rotateTimer = setTimeout(() => {
      nextQuestion();
      rotateTimer = setInterval(nextQuestion, ROTATE_MS);
    }, left);
  };

  const hide = () => {
    root.classList.remove("is-loading", "is-arriving");
    stopRotating();
  };

  build();
  if (arriving) {
    start();
    const finish = () =>
      setTimeout(hide, Math.max(0, MIN_SHOWN_MS - (performance.now() - shownAt)));
    if (document.readyState === "complete") finish();
    else addEventListener("load", finish, { once: true });
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target || link.hasAttribute("download")) return; // new tabs load their own
    const url = new URL(link.href, location.href);
    // pages: "/", "/portfolio" (GitHub Pages adds the .html) or "/portfolio.html"
    const isPage = /\.html$|\/$/.test(url.pathname) || !/\.[^/]*$/.test(url.pathname);
    if (url.origin !== location.origin || !isPage) return;
    if (url.pathname === location.pathname && url.hash) return; // same-page jump

    e.preventDefault();
    // a fresh question for this trip, unless the screen is still up from arriving
    if (!root.classList.contains("is-loading")) {
      index = (index + 1) % QUESTIONS.length;
      questionAt = Date.now();
      showQuestion();
    }
    root.classList.add("is-loading");
    start();
    try {
      sessionStorage.setItem(SAVED_KEY, JSON.stringify({ index, at: questionAt }));
    } catch {}
    setTimeout(() => (location.href = url.href), reduceMotion ? 0 : FADE_MS);
  });

  addEventListener("pageshow", (e) => {
    if (e.persisted) hide();
  });
})();
