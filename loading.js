// Sims-style loading screen between pages: the swimming fish, with a question
// (and sometimes my answer) underneath that rotates every few seconds.
// Load this in <head> so the screen covers the page before anything else shows.

(() => {
  // Add more here. Leave "answer" out to show just the question.
  const QUESTIONS = [
    { question: "What's your favorite drink?", answer: "Mine's Diet Coke!" },
    { question: "What superpower would you want?", answer: "Definitely teleportation for me." },
    { question: "If you could have any job, what would it be?", answer: "I want to try my hand at bartending." },
    { question: "What's your biggest non-academic, non work-related accomplishment?", answer: "I love writing." },
    { question: "If you were a character, what genre would you live in?" },
    { question: "What's your MBTI?", answer: "I'm ENFJ!" },
    { question: "What's the closest you've ever come to dying?" },
    { question: "What's the most memorable meal you've ever had?" },
    { question: "What's your least popular opinion?" },
    { question: "What fictional character do you most relate to?" },
    { question: "What do you get the most compliments about?", answer: "My eyelashes??" },
    { question: "What's the most important quality you look for in a friend?" },
    { question: "What's your favorite quote and why?" },
    { question: "For what would you most like to become famous?" },
    { question: "What city/country do you never want to go back to?", answer: "EWR for me." },
    { question: "What songs have you memorized?" },
    { question: "Are you usually early or late?", answer: "Right on time." },
    { question: "What’s the best way to start the day?", answer: "Coffee!" },
    { question: "What movie title best describes your life?" },
    { question: "What song best describes your life right now?" },
    { question: "What job do you think you’d be really good at?", answer: "I don't know..." },
    { question: "If you didn’t have to sleep, what would you do with the extra time?" },
    { question: "What do you do to get rid of stress?" },
    { question: "What’s the best thing about your work / school?" },
    { question: "What’s the worst thing about your work / school?" },
    { question: "What do you wish you knew more about?" },
    { question: "What’s your favorite podcast?" },
  ];

  const MIN_SHOWN_MS = 3000; 
  const ROTATE_MS = 3200;
  const FADE_MS = 400;

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

  let screen, text, rotateTimer;
  let index = Math.floor(Math.random() * QUESTIONS.length);

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
        showQuestion();
        text.classList.remove("is-changing");
      },
      reduceMotion ? 0 : FADE_MS,
    );
  };

  const build = () => {
    screen = document.createElement("div");
    screen.className = "loader";
    screen.setAttribute("role", "status");
    screen.setAttribute("aria-live", "polite");
    const fish = document.createElement("img");
    fish.className = "loader-fish";
    fish.src = "img/fish cursor.gif";
    fish.alt = "";
    text = document.createElement("p");
    text.className = "loader-text";
    screen.append(fish, text);
    document.body.append(screen);
  };

  const start = () => {
    clearInterval(rotateTimer);
    showQuestion();
    rotateTimer = setInterval(nextQuestion, ROTATE_MS);
  };

  const hide = () => {
    root.classList.remove("is-loading", "is-arriving");
    clearInterval(rotateTimer);
  };

  document.addEventListener("DOMContentLoaded", () => {
    build();
    if (!arriving) return;
    start();
    const finish = () =>
      setTimeout(hide, Math.max(0, MIN_SHOWN_MS - (performance.now() - shownAt)));
    if (document.readyState === "complete") finish();
    else addEventListener("load", finish, { once: true });
  });


  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target || link.hasAttribute("download")) return; // new tabs load their own
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return; // same-page jump

    e.preventDefault();
    root.classList.add("is-loading");
    start();
    setTimeout(() => (location.href = url.href), reduceMotion ? 0 : FADE_MS);
  });


  addEventListener("pageshow", (e) => {
    if (e.persisted) hide();
  });
})();
