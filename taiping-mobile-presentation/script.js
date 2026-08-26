(function () {
  "use strict";

  const stage = document.getElementById("stage");
  const track = document.getElementById("slides");
  const counter = document.getElementById("pageCount");
  const progress = document.getElementById("progressBar");
  const slides = Array.from(document.querySelectorAll(".slide"));

  let current = 0;
  let locked = false;
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  const pad = (value) => String(value).padStart(2, "0");

  function setActive(nextIndex) {
    current = Math.max(0, Math.min(slides.length - 1, nextIndex));
    track.style.transform = `translate3d(${-current * 100}%, 0, 0)`;
    counter.textContent = `${pad(current + 1)} / ${pad(slides.length)}`;
    progress.style.transform = `scaleX(${(current + 1) / slides.length})`;

    slides.forEach((slide, index) => {
      const active = index === current;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
  }

  function goTo(nextIndex) {
    if (locked || nextIndex === current) return;
    const bounded = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (bounded === current) return;

    locked = true;
    setActive(bounded);
    window.setTimeout(() => {
      locked = false;
    }, 500);
  }

  function next() {
    goTo(current + 1);
  }

  function previous() {
    goTo(current - 1);
  }

  function handleTap(event) {
    if (event.defaultPrevented || locked) return;
    const selectedText = window.getSelection && window.getSelection().toString();
    if (selectedText) return;

    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x > rect.width / 2) {
      next();
    } else {
      previous();
    }
  }

  function handleKey(event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    }
  }

  function handleTouchStart(event) {
    if (event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    startTime = Date.now();
  }

  function handleTouchEnd(event) {
    if (!startTime || locked) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const elapsed = Date.now() - startTime;

    startTime = 0;

    if (elapsed > 900) return;
    if (Math.abs(deltaX) < 52) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    if (deltaX < 0) {
      next();
    } else {
      previous();
    }
  }

  function prepareImages() {
    document.querySelectorAll(".image-shell img").forEach((image) => {
      const shell = image.closest(".image-shell");

      function markLoaded() {
        if (image.naturalWidth > 0) {
          shell.classList.add("is-loaded");
          shell.classList.remove("is-missing");
        }
      }

      function markMissing() {
        shell.classList.remove("is-loaded");
        shell.classList.add("is-missing");
      }

      if (image.complete) {
        if (image.naturalWidth > 0) {
          markLoaded();
        } else {
          markMissing();
        }
      }

      image.addEventListener("load", markLoaded, { once: true });
      image.addEventListener("error", markMissing, { once: true });
    });
  }

  stage.addEventListener("click", handleTap);
  stage.addEventListener("touchstart", handleTouchStart, { passive: true });
  stage.addEventListener("touchend", handleTouchEnd, { passive: true });
  document.addEventListener("keydown", handleKey);

  prepareImages();
  setActive(0);
})();
