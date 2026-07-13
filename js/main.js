/* MIRACLE — interactions: announcement rotator, sticky header, mobile
   drawer, scroll reveals, testimonial slider. Vanilla, dependency-free,
   and quiet when the visitor prefers reduced motion. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Footer year ---- */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* ---- Build WhatsApp order links (keeps the number in one place) ---- */
  var WA = "https://wa.me/21692970596?text=";
  var LEAD = "Bonjour MIRACLE 🌸, je suis intéressée par : ";
  document.querySelectorAll("[data-wa]").forEach(function (el) {
    el.setAttribute("href", WA + encodeURIComponent(el.getAttribute("data-wa")));
  });
  document.querySelectorAll("[data-name]").forEach(function (el) {
    el.setAttribute("href", WA + encodeURIComponent(LEAD + el.getAttribute("data-name")));
  });

  /* ---- Rotating announcement ---- */
  var aItems = Array.prototype.slice.call(document.querySelectorAll(".announce__item"));
  if (aItems.length > 1 && !reduce) {
    var ai = 0;
    setInterval(function () {
      aItems[ai].classList.remove("is-on");
      ai = (ai + 1) % aItems.length;
      aItems[ai].classList.add("is-on");
    }, 4200);
  }

  /* ---- Sticky header shadow ---- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile drawer ---- */
  var drawer = document.getElementById("drawer");
  var overlay = document.getElementById("drawer-overlay");
  var openBtn = document.getElementById("nav-open");
  var closeBtn = document.getElementById("nav-close");
  var pageRegions = document.querySelectorAll(".announce, .site-header, #main, .footer-sub, .site-footer");
  function setPageInert(on) {
    pageRegions.forEach(function (el) {
      if (!el) return;
      if (on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("is-open");
    overlay.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    if (openBtn) openBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    setPageInert(true);
    var first = drawer.querySelector("a, button");
    if (first) first.focus();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    setPageInert(false);
    if (openBtn) { openBtn.setAttribute("aria-expanded", "false"); openBtn.focus(); }
    document.body.style.overflow = "";
  }
  if (openBtn) openBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer && drawer.classList.contains("is-open")) closeDrawer();
  });
  if (drawer) {
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeDrawer);
    });
  }

  /* ---- Scroll reveal ---- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Testimonial slider ---- */
  var slides = Array.prototype.slice.call(document.querySelectorAll(".testi__slide"));
  var dotsWrap = document.querySelector(".testi__dots");
  if (slides.length > 1 && dotsWrap && !reduce) {
    var idx = 0, timer = null;
    slides.forEach(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Avis " + (i + 1));
      if (i === 0) b.classList.add("is-on");
      b.addEventListener("click", function () { go(i); restart(); });
      dotsWrap.appendChild(b);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);
    function go(n) {
      slides[idx].classList.remove("is-on");
      dots[idx].classList.remove("is-on");
      idx = n;
      slides[idx].classList.add("is-on");
      dots[idx].classList.add("is-on");
    }
    function next() { go((idx + 1) % slides.length); }
    function start() { timer = setInterval(next, 6000); }
    function restart() { clearInterval(timer); start(); }
    var testi = document.querySelector(".testi");
    testi.addEventListener("mouseenter", function () { clearInterval(timer); });
    testi.addEventListener("mouseleave", restart);
    start();
  }
})();
