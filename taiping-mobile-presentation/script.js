(function () {
  "use strict";

  const stage = document.getElementById("stage");
  const track = document.getElementById("slides");
  const counter = document.getElementById("pageCount");
  const chapter = document.getElementById("chapterLabel");
  const progress = document.getElementById("progressBar");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const coverVisual = document.getElementById("coverVisual");
  const comboMotion = document.querySelector('[data-motion="combo"]');
  const actionMotion = document.querySelector('[data-motion="action"]');
  const lightCard = document.getElementById("lightCard");
  const lightToggle = document.getElementById("lightToggle");
  const randomWish = document.getElementById("randomWish");
  const randomWishResult = document.getElementById("randomWishResult");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let current = 0;
  let locked = false;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let holdTimer = 0;
  let holdMode = false;
  let suppressClick = false;
  let coverIntro = null;
  let coverFloat = null;
  let comboTimeline = null;
  let actionTimeline = null;
  let randomIndex = 0;

  const randomWishes = [
    "比如：回家的路别堵",
    "比如：手机一直有电",
    "比如：方案一次过",
    "比如：早点回家",
    "比如：今天别堵车",
    "比如：少一点烦心事"
  ];

  const pad = (value) => String(value).padStart(2, "0");

  function isControlTarget(target) {
    return Boolean(target.closest("button, a, input, textarea, select, label, [data-no-slide]"));
  }

  function setActive(nextIndex) {
    const previousIndex = current;
    current = Math.max(0, Math.min(slides.length - 1, nextIndex));
    track.style.transform = `translate3d(${-current * 100}%, 0, 0)`;
    counter.textContent = `${pad(current + 1)} / ${pad(slides.length)}`;
    chapter.textContent = slides[current].dataset.chapterLabel || "";
    progress.style.transform = `scaleX(${(current + 1) / slides.length})`;

    slides.forEach((slide, index) => {
      const active = index === current;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });

    if (current === 0 && previousIndex !== 0) {
      playCoverAnimation();
    } else if (current !== 0 && coverFloat) {
      coverFloat.pause();
    }

    playSlideAnimation(current);
  }

  function goTo(nextIndex) {
    if (locked || nextIndex === current) return;
    const bounded = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (bounded === current) return;

    locked = true;
    setActive(bounded);
    window.setTimeout(() => {
      locked = false;
    }, 460);
  }

  function next() {
    goTo(current + 1);
  }

  function previous() {
    goTo(current - 1);
  }

  function handleTap(event) {
    if (event.defaultPrevented || locked || isControlTarget(event.target)) return;
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
    if (event.touches.length !== 1 || isControlTarget(event.target)) return;
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

  function prepareCoverAnimation() {
    if (!coverVisual || reduceMotion.matches || !window.gsap) return;

    const gsap = window.gsap;
    const petals = Array.from(coverVisual.querySelectorAll(".cover-petal"));
    const cord = coverVisual.querySelectorAll(".cover-cord path");
    const seams = coverVisual.querySelectorAll(".ball-outline, .ball-seam, .ball-knot");
    const tassel = coverVisual.querySelector(".ball-tassel");
    const copy = document.querySelectorAll(".cover-copy-reveal");
    const note = coverVisual.querySelector(".cover-object-note");
    const ball = coverVisual.querySelector(".animated-ball");

    petals.forEach((petal, index) => {
      const angle = index * (Math.PI / 6) - Math.PI / 2;
      const distance = 92 + (index % 3) * 10;
      gsap.set(petal, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotation: index % 2 ? 16 : -16,
        scale: .68,
        opacity: 0,
        transformOrigin: "50% 50%"
      });
    });

    gsap.set(cord, { strokeDasharray: 90, strokeDashoffset: 90, opacity: 0 });
    gsap.set(seams, { opacity: 0, scale: .82, transformOrigin: "50% 50%" });
    gsap.set(tassel, { opacity: 0, scaleY: .3, transformOrigin: "50% 0%" });
    gsap.set(copy, { opacity: 0, y: 18 });
    gsap.set(note, { opacity: 0, y: 8 });

    coverIntro = gsap.timeline({
      paused: true,
      defaults: { ease: "power3.out" },
      onComplete: () => coverFloat && coverFloat.restart(true)
    });

    coverIntro
      .to(cord, { strokeDashoffset: 0, opacity: 1, duration: .4, stagger: .06 })
      .to(petals, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        duration: .68,
        stagger: { amount: .42, from: "random" }
      }, "-=.18")
      .to(seams, { opacity: 1, scale: 1, duration: .38, stagger: .035 }, "-=.28")
      .to(tassel, { opacity: 1, scaleY: 1, duration: .34 }, "-=.22")
      .to(note, { opacity: 1, y: 0, duration: .3 }, "-=.14")
      .to(copy, { opacity: 1, y: 0, duration: .4, stagger: .09 }, "-=.2");

    coverFloat = gsap.to(ball, {
      paused: true,
      y: -6,
      rotation: -1.2,
      duration: 2.4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      transformOrigin: "50% 42%"
    });
  }

  function playCoverAnimation() {
    if (!coverIntro || reduceMotion.matches) return;
    if (coverFloat) coverFloat.pause(0);
    coverIntro.restart(true);
  }

  function prepareSlideAnimations() {
    if (reduceMotion.matches || !window.gsap) return;

    const gsap = window.gsap;

    if (comboMotion) {
      const parts = Array.from(comboMotion.querySelectorAll(".combo-part"));
      const pluses = Array.from(comboMotion.querySelectorAll(".combo-plus"));
      const sequence = [parts[0], pluses[0], parts[1], pluses[1], parts[2]];
      const connector = comboMotion.querySelector(".combo-connector");
      const result = comboMotion.querySelector(".combo-result");
      const resultProduct = comboMotion.querySelector(".result-product");

      gsap.set(sequence, { opacity: 0, y: 12, scale: .96, transformOrigin: "50% 50%" });
      gsap.set(connector, { opacity: 0, scaleY: 0, transformOrigin: "50% 0%" });
      gsap.set(result, { opacity: 0, y: 14 });
      gsap.set(resultProduct, { rotation: -12, scale: .72, transformOrigin: "50% 50%" });

      comboTimeline = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      comboTimeline
        .to(sequence, { opacity: 1, y: 0, scale: 1, duration: .2, stagger: .045 })
        .to(connector, { opacity: 1, scaleY: 1, duration: .16 }, "-=.06")
        .to(result, { opacity: 1, y: 0, duration: .22 }, "-=.08")
        .to(resultProduct, { rotation: 0, scale: 1, duration: .28, ease: "back.out(1.3)" }, "-=.2")
        .to(parts, { opacity: .62, duration: .15 }, "-=.08");
    }

    if (actionMotion) {
      const hand = actionMotion.querySelector(".action-hand");
      const connector = actionMotion.querySelector(".action-connector");
      const confirm = actionMotion.querySelector(".action-confirm");
      const status = actionMotion.querySelector(".action-status");

      gsap.set(hand, { y: -10, opacity: .72 });
      gsap.set(connector, { y: 24, opacity: 0 });
      gsap.set(confirm, { opacity: 0 });
      gsap.set(status, { opacity: 0, y: 8 });

      actionTimeline = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      actionTimeline
        .to(hand, { y: 0, opacity: 1, duration: .24 })
        .to(connector, { y: 0, opacity: 1, duration: .24 }, "-=.14")
        .to(confirm, { opacity: 1, duration: .14 }, "-=.04")
        .to(confirm, { opacity: .28, duration: .18, ease: "power2.out" })
        .to(status, { opacity: 1, y: 0, duration: .2 }, "-=.14");
    }
  }

  function playSlideAnimation(index) {
    if (reduceMotion.matches) return;

    if (comboTimeline) {
      if (index === 15) {
        comboTimeline.restart(true);
      } else {
        comboTimeline.pause();
      }
    }

    if (actionTimeline) {
      if (index === 16) {
        actionTimeline.restart(true);
      } else {
        actionTimeline.pause();
      }
    }
  }

  function setLight(isLit) {
    if (!lightCard || !lightToggle) return;
    lightCard.classList.toggle("is-lit", isLit);
    lightToggle.setAttribute("aria-pressed", isLit ? "true" : "false");
    lightToggle.textContent = isLit ? "恢复" : "透光看纹样";
  }

  function prepareLightCard() {
    if (!lightCard || !lightToggle) return;

    lightToggle.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      holdMode = false;
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => {
        holdMode = true;
        setLight(true);
      }, 120);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((name) => {
      lightToggle.addEventListener(name, (event) => {
        event.stopPropagation();
        window.clearTimeout(holdTimer);
        if (!holdMode) return;
        holdMode = false;
        suppressClick = true;
        setLight(false);
        window.setTimeout(() => {
          suppressClick = false;
        }, 0);
      });
    });

    lightToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (suppressClick) return;
      setLight(!lightCard.classList.contains("is-lit"));
    });
  }

  function prepareRandomWish() {
    if (!randomWish || !randomWishResult) return;

    randomWish.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      let nextIndex = Math.floor(Math.random() * randomWishes.length);
      if (nextIndex === randomIndex) {
        nextIndex = (nextIndex + 1) % randomWishes.length;
      }
      randomIndex = nextIndex;
      randomWishResult.textContent = randomWishes[randomIndex];
      randomWishResult.classList.remove("is-changing");
      void randomWishResult.offsetWidth;
      randomWishResult.classList.add("is-changing");
    });
  }

  stage.addEventListener("click", handleTap);
  stage.addEventListener("touchstart", handleTouchStart, { passive: true });
  stage.addEventListener("touchend", handleTouchEnd, { passive: true });
  document.addEventListener("keydown", handleKey);

  prepareImages();
  prepareCoverAnimation();
  prepareSlideAnimations();
  prepareLightCard();
  prepareRandomWish();
  setActive(0);
  playCoverAnimation();
})();
