const FISH_NOSE_Y = 13;
const FISH_TAIL_X = 38;
const FISH_TAIL_Y = -1;
const fishOn = matchMedia("(hover: hover) and (pointer: fine)").matches;
let fishCursor = null;

if (fishOn) {
  fishCursor = document.createElement("img");
  fishCursor.className = "fish-cursor";
  fishCursor.src = "img/fish cursor.gif";
  fishCursor.alt = "";
  fishCursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(fishCursor);
  document.documentElement.classList.add("fish-cursor-on");

  // hide it when the mouse leaves the window
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget) fishCursor.classList.remove("is-visible");
  });
}

document.addEventListener("mousemove", (e) => {
  const fish = fishOn && getComputedStyle(e.target).cursor === "none";

  if (fishCursor) {
    fishCursor.style.transform = `translate(${e.clientX}px, ${e.clientY - FISH_NOSE_Y}px)`;
    fishCursor.classList.toggle("is-visible", fish);
  }

  const dot = document.createElement("div");
  dot.className = "trail";
  dot.style.left = e.pageX + (fish ? FISH_TAIL_X : 0) + "px";
  dot.style.top = e.pageY + (fish ? FISH_TAIL_Y : 0) + "px";
  document.body.appendChild(dot);
  setTimeout(() => dot.remove(), 400);
});
