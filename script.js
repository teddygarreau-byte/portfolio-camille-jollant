(function(){
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header state on scroll + progress bar ---------- */
  var header = document.getElementById("siteHeader");
  var progressBar = document.getElementById("progressBar");
  var heroEl = document.getElementById("hero");

  var heroBg = document.querySelector(".hero-bg");
  var ticking = false;

  function onScroll(){
    var heroThreshold = heroEl ? heroEl.offsetHeight - header.offsetHeight : 12;
    var scrolled = window.scrollY > heroThreshold;
    header.classList.toggle("scrolled", scrolled);

    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    progressBar.style.width = pct + "%";

    /* Parallaxe : la photo du hero remonte moins vite que la page */
    if (heroBg && !reduceMotion && !ticking){
      ticking = true;
      requestAnimationFrame(function(){
        var y = window.scrollY;
        if (y < window.innerHeight * 1.2){
          heroBg.style.transform = "scale(1.08) translate3d(0," + (y * 0.22) + "px,0)";
        }
        ticking = false;
      });
    }
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

  /* ---------- Dépliants du parcours ---------- */
  document.querySelectorAll(".timeline-toggle").forEach(function(btn){
    var item = btn.closest(".timeline-item");
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    var label = btn.querySelector(".toggle-label");
    if (!item || !panel) return;

    /* replié : hors du parcours de tabulation et du lecteur d'écran */
    panel.setAttribute("inert", "");

    btn.addEventListener("click", function(){
      var open = !item.classList.contains("open");
      item.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      if (label) label.textContent = open ? "Masquer le projet" : "Voir le projet";
      if (open) panel.removeAttribute("inert");
      else panel.setAttribute("inert", "");
      /* la galerie doit se remesurer une fois le panneau ouvert */
      if (open) window.dispatchEvent(new Event("resize"));
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

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxCaption = document.getElementById("lightboxCaption");
  var lightboxClose = document.getElementById("lightboxClose");
  var lightboxPrev = document.getElementById("lightboxPrev");
  var lightboxNext = document.getElementById("lightboxNext");

  var lbGroup = [];
  var lbIndex = 0;
  var lbLastFocus = null;

  function renderLightbox(){
    var img = lbGroup[lbIndex];
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = img.alt;
    var many = lbGroup.length > 1;
    lightboxPrev.hidden = !many;
    lightboxNext.hidden = !many;
  }

  function openLightbox(group, index, trigger){
    lbGroup = group;
    lbIndex = index;
    lbLastFocus = trigger || null;
    renderLightbox();
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    lightboxClose.focus();
  }

  function closeLightbox(){
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    lightboxImg.removeAttribute("src");
    if (lbLastFocus) lbLastFocus.focus();
  }

  function stepLightbox(dir){
    if (lbGroup.length < 2) return;
    lbIndex = (lbIndex + dir + lbGroup.length) % lbGroup.length;
    renderLightbox();
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", function(){ stepLightbox(-1); });
  lightboxNext.addEventListener("click", function(){ stepLightbox(1); });
  lightbox.addEventListener("click", function(e){
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function(e){
    if (e.key === "Escape"){
      if (!lightbox.hidden) closeLightbox();
      else closeNav();
      return;
    }
    if (lightbox.hidden) return;
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  /* Images hors galerie : cliquables aussi, groupées par bloc visuel
     pour que les flèches passent d'un visuel à l'autre */
  document.querySelectorAll(".project-media:not(.gallery-wrap)").forEach(function(media){
    var imgs = Array.prototype.slice.call(media.querySelectorAll("img"));
    imgs.forEach(function(img, i){
      img.style.cursor = "zoom-in";
      img.addEventListener("click", function(){
        openLightbox(imgs, i, img);
      });
    });
  });

  /* ---------- Horizontal galleries: auto-scroll + zoom ---------- */
  var AUTOPLAY_DELAY = 4200;

  document.querySelectorAll(".gallery-wrap").forEach(function(wrap){
    var gallery = wrap.querySelector(".gallery");
    var prev = wrap.querySelector(".gallery-nav.prev");
    var next = wrap.querySelector(".gallery-nav.next");
    var playBtn = wrap.querySelector(".gallery-play");
    var dotsBox = wrap.querySelector(".gallery-dots");
    if (!gallery) return;

    var slides = Array.prototype.slice.call(gallery.querySelectorAll(".slide"));
    var images = slides.map(function(s){ return s.querySelector("img"); }).filter(Boolean);
    var dots = [];

    if (dotsBox && slides.length > 1){
      slides.forEach(function(_, i){
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Visuel " + (i + 1) + " sur " + slides.length);
        b.addEventListener("click", function(){ userPaused = true; markPaused(); scrollToSlide(i); });
        dotsBox.appendChild(b);
        dots.push(b);
      });
    }

    var timer = null;
    var userPaused = false;
    var hovering = false;
    /* optimistic: the observer below corrects this on its first callback,
       so autoplay still works if intersection callbacks are throttled */
    var visible = true;

    function currentIndex(){
      var w = gallery.clientWidth;
      return w > 0 ? Math.round(gallery.scrollLeft / w) : 0;
    }

    function updateProgress(){
      var i = currentIndex();
      dots.forEach(function(d, n){
        d.setAttribute("aria-current", n === i ? "true" : "false");
      });
      if (prev) prev.style.visibility = i <= 0 ? "hidden" : "visible";
      if (next) next.style.visibility = i >= slides.length - 1 ? "hidden" : "visible";
    }

    function scrollToSlide(i){
      if (i < 0 || i >= slides.length) return;
      gallery.scrollTo({
        left: i * gallery.clientWidth,
        behavior: reduceMotion ? "auto" : "smooth"
      });
    }

    function advance(){
      scrollToSlide((currentIndex() + 1) % slides.length);
    }

    function markPaused(){
      if (!playBtn) return;
      playBtn.classList.toggle("paused", userPaused);
      playBtn.setAttribute("aria-label", userPaused ? "Reprendre le défilement" : "Mettre le défilement en pause");
      sync();
    }

    function canPlay(){
      return !reduceMotion && !userPaused && !hovering && visible && slides.length > 1;
    }

    function sync(){
      if (canPlay()){
        if (!timer) timer = setInterval(advance, AUTOPLAY_DELAY);
      } else if (timer){
        clearInterval(timer);
        timer = null;
      }
    }

    if (prev) prev.addEventListener("click", function(){
      userPaused = true; markPaused();
      scrollToSlide(Math.max(0, currentIndex() - 1));
    });
    if (next) next.addEventListener("click", function(){
      userPaused = true; markPaused();
      scrollToSlide(Math.min(slides.length - 1, currentIndex() + 1));
    });

    if (playBtn){
      if (reduceMotion || slides.length < 2){
        playBtn.hidden = true;
      }
      playBtn.addEventListener("click", function(){
        userPaused = !userPaused;
        markPaused();
      });
    }

    wrap.addEventListener("mouseenter", function(){ hovering = true; sync(); });
    wrap.addEventListener("mouseleave", function(){ hovering = false; sync(); });
    wrap.addEventListener("focusin", function(){ hovering = true; sync(); });
    wrap.addEventListener("focusout", function(){ hovering = false; sync(); });

    gallery.addEventListener("scroll", updateProgress, { passive: true });

    slides.forEach(function(slide, i){
      slide.addEventListener("click", function(){
        openLightbox(images, i, slide);
      });
    });

    /* Slides are lazy-loaded: the strip only becomes scrollable once the
       images have their real width, so re-evaluate when each one lands. */
    images.forEach(function(img){
      if (img.complete) return;
      img.addEventListener("load", function(){
        updateProgress();
        sync();
      }, { once: true });
    });

    if ("ResizeObserver" in window){
      new ResizeObserver(function(){
        updateProgress();
        sync();
      }).observe(gallery);
    }

    new IntersectionObserver(function(entries){
      entries.forEach(function(entry){ visible = entry.isIntersecting; });
      sync();
    }, { threshold: 0.25 }).observe(wrap);

    document.addEventListener("visibilitychange", function(){
      visible = !document.hidden && visible;
      sync();
    });

    updateProgress();
    sync();
  });

  /* ---------- Apparition en cascade dans les grilles ---------- */
  [".tool-list", ".passion-grid", ".project-grid", ".formation-grid", ".timeline"].forEach(function(sel){
    document.querySelectorAll(sel).forEach(function(group){
      Array.prototype.forEach.call(group.children, function(child, i){
        child.classList.add("reveal");
        child.style.transitionDelay = Math.min(i * 70, 420) + "ms";
      });
    });
  });

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
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    revealEls.forEach(function(el){ revealObserver.observe(el); });

    /* Filet de sécurité : si l'observateur ne se déclenche pas (onglet en
       arrière-plan au chargement, rendu suspendu…), on révèle au scroll ce
       qui est entré dans la fenêtre — jamais de contenu invisible. */
    var revealFallback = function(){
      var vh = window.innerHeight;
      revealEls.forEach(function(el){
        if (el.classList.contains("in-view")) return;
        var top = el.getBoundingClientRect().top;
        if (top < vh * 0.92) el.classList.add("in-view");
      });
    };
    window.addEventListener("scroll", revealFallback, { passive: true });
    window.addEventListener("load", revealFallback);
    setTimeout(revealFallback, 1500);
  }

})();
