(function(){
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header state on scroll + progress bar ---------- */
  var header = document.getElementById("siteHeader");
  var progressBar = document.getElementById("progressBar");

  function onScroll(){
    var scrolled = window.scrollY > 12;
    header.classList.toggle("scrolled", scrolled);

    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    progressBar.style.width = pct + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");

  function closeNav(){
    mainNav.classList.remove("open");
    document.body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  navToggle.addEventListener("click", function(){
    var isOpen = mainNav.classList.toggle("open");
    document.body.classList.toggle("nav-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.querySelectorAll("a").forEach(function(link){
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", function(e){
    if (e.key === "Escape") closeNav();
  });

  /* ---------- Smooth-scroll for internal timeline links ---------- */
  document.querySelectorAll("[data-scroll-to]").forEach(function(link){
    link.addEventListener("click", function(e){
      var id = link.getAttribute("data-scroll-to");
      var target = document.getElementById(id);
      if (target){
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  });

  /* ---------- Active nav link on scroll (scrollspy) ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.main-nav a[data-nav]'));
  var sections = navLinks
    .map(function(link){ return document.querySelector(link.getAttribute("href")); })
    .filter(Boolean);

  var spyObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      var link = navLinks.find(function(l){ return l.getAttribute("href") === "#" + entry.target.id; });
      if (!link) return;
      if (entry.isIntersecting){
        navLinks.forEach(function(l){ l.classList.remove("active"); });
        link.classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

  sections.forEach(function(section){ spyObserver.observe(section); });

  /* ---------- Reveal-on-scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)){
    revealEls.forEach(function(el){ el.classList.add("in-view"); });
  } else {
    var revealObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });

    revealEls.forEach(function(el){ revealObserver.observe(el); });
  }

})();
