// scroll effect for the subpages: every .reveal element fades up as it comes
// into view, like the homepage; cards in a group arrive one after another.
// Skipped for reduced-motion users, who just see the page.
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
  );

  document.querySelectorAll(".reveal").forEach((el) => {
    // cards in a group arrive one after another
    const prev = el.previousElementSibling;
    if (
      el.classList.contains("acad-card") &&
      prev &&
      prev.classList.contains("acad-card")
    ) {
      el.style.transitionDelay = "0.12s";
    }
    el.classList.add("fade-in");
    revealObserver.observe(el);
  });
}
