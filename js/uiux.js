// uiux.html: on hover, each card's white border drifts slightly toward the
// cursor, up to MAX px in each direction. The easing lives in css/style.css.
const MAX = 6;

document.querySelectorAll(".uiux-card").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const box = card.getBoundingClientRect();
    // -1 at the left/top edge, 0 in the middle, 1 at the right/bottom edge
    const fx = ((e.clientX - box.left) / box.width) * 2 - 1;
    const fy = ((e.clientY - box.top) / box.height) * 2 - 1;
    const clamp = (n) => Math.max(-1, Math.min(1, n));
    card.style.setProperty("--dx", `${clamp(fx) * MAX}px`);
    card.style.setProperty("--dy", `${clamp(fy) * MAX}px`);
  });
  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--dx", "0px");
    card.style.setProperty("--dy", "0px");
  });
});
