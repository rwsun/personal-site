window.addEventListener('scroll', () => {
  const cloud = document.querySelector('.cloud');
  const scrollY = window.scrollY;
  cloud.style.transform = `translateY(-${scrollY * 0.5}px)`;
});