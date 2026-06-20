/* =========================================================
   EVO — shared interactions
   - scroll reveal
   - hero / banner parallax
   - lightbox gallery
   - EN/FR language toggle (persisted)
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Parallax (hero + banners) ---------- */
  const parallaxEls = document.querySelectorAll("[data-parallax]");
  let ticking = false;
  function parallax() {
    parallaxEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const speed = parseFloat(el.dataset.parallax) || 0.18;
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -speed;
      el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
    });
    ticking = false;
  }
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(parallax);
      ticking = true;
    }
  }
  const canParallax =
    window.matchMedia("(min-width: 900px)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (parallaxEls.length && canParallax) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", parallax);
    parallax();
  } else {
    parallaxEls.forEach((el) => { el.style.transform = "none"; });
  }

  /* ---------- Lightbox ---------- */
  const figures = Array.from(document.querySelectorAll("[data-lightbox] img"));
  if (figures.length) {
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML =
      '<button class="lb-close" aria-label="Close">&times;</button>' +
      '<button class="lb-nav lb-prev" aria-label="Previous">&#8249;</button>' +
      '<img alt="">' +
      '<button class="lb-nav lb-next" aria-label="Next">&#8250;</button>' +
      '<div class="lb-count"></div>';
    document.body.appendChild(lb);
    const lbImg = lb.querySelector("img");
    const lbCount = lb.querySelector(".lb-count");
    let idx = 0;
    const srcs = figures.map((f) => f.currentSrc || f.src);

    function show(i) {
      idx = (i + srcs.length) % srcs.length;
      lbImg.src = srcs[idx];
      lbCount.textContent = (idx + 1) + " / " + srcs.length;
    }
    function open(i) {
      show(i);
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function close() {
      lb.classList.remove("open");
      document.body.style.overflow = "";
    }
    figures.forEach((f, i) => f.addEventListener("click", () => open(i)));
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
    lb.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
  }

  /* ---------- Language toggle ---------- */
  const STORE = "evo-lang";
  function setLang(lang) {
    document.documentElement.setAttribute("lang", lang);
    document.querySelectorAll("[data-en]").forEach((el) => {
      const val = lang === "fr" ? el.getAttribute("data-fr") : el.getAttribute("data-en");
      if (val !== null) {
        if (el.dataset.attr) {
          el.setAttribute(el.dataset.attr, val);
        } else {
          el.innerHTML = val;
        }
      }
    });
    document.querySelectorAll(".lang button").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === lang);
    });
    try { localStorage.setItem(STORE, lang); } catch (e) {}
  }
  document.querySelectorAll(".lang button").forEach((b) => {
    b.addEventListener("click", () => setLang(b.dataset.lang));
  });
  let saved = "en";
  try { saved = localStorage.getItem(STORE) || "en"; } catch (e) {}
  setLang(saved);
})();
