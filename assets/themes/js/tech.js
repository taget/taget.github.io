/* ============================================================
   Light Tech Theme - lightweight vanilla JS effects
   No jQuery dependency. Safe to load at end of <body>.
   ============================================================ */
(function () {
  "use strict";

  function onReady(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  // Reveal elements on scroll using IntersectionObserver.
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    // Fallback: no IntersectionObserver -> show everything immediately.
    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < items.length; i++) {
        items[i].classList.add("in");
      }
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  // Add a "scrolled" class to the navbar once the page is scrolled.
  function initNavbarScroll() {
    var navbar = document.querySelector(".navbar.navbar-default");
    if (!navbar) return;

    var ticking = false;
    function update() {
      if (window.pageYOffset > 12) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  onReady(function () {
    initReveal();
    initNavbarScroll();
  });
})();
