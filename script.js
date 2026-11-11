(function(){
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header state on scroll + progress bar ---------- */
  var header = document.getElementById("siteHeader");
  var progressBar = document.getElementById("progressBar");
  var heroEl = document.getElementById("hero");

  /* Hauteurs mises en cache (recalculées au redimensionnement) : aucune
     mesure de mise en page pendant le défilement. Une seule mise à jour par
     image, et la barre de progression bouge en transform (sans relayout). */
  var seuilHero = 0, hauteurDoc = 1, enAttente = false;
  function mesurer(){
    seuilHero = heroEl ? heroEl.offsetHeight - header.offsetHeight : 12;
    hauteurDoc = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }
  function majScroll(){
    enAttente = false;
    var y = window.scrollY;
    header.classList.toggle("scrolled", y > seuilHero);
    progressBar.style.transform = "scaleX(" + Math.min(1, y / hauteurDoc).toFixed(4) + ")";
  }
  function onScroll(){
    if (!enAttente){ enAttente = true; requestAnimationFrame(majScroll); }
  }
  mesurer();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function(){ mesurer(); onScroll(); });
  window.addEventListener("load", function(){ mesurer(); onScroll(); });
  majScroll();

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
  /* ---------- Projets professionnels : dossiers et feuille ----------
     Un clic sur le dossier (ou sur « Voir le projet ») fait sortir une feuille
     du dossier, par-dessus le site flouté. « Fermer », Échap ou un clic à côté
     la range dans son dossier. Le contenu de la feuille est déplacé (et non
     copié) pour garder les galeries fonctionnelles. */
  var voile = document.getElementById("feuilleVoile");
  if (voile){
    var feuille = voile.querySelector(".feuille");
    var corps = voile.querySelector(".feuille-corps");
    var fermer = voile.querySelector(".feuille-fermer");
    var dossierOuvert = null, contenuOuvert = null, enCours = false;
    var DUREE = reduceMotion ? 0 : 520;

    /* transform qui place la feuille sur le dossier (point de départ / d'arrivée) */
    var surLeDossier = function(dossier){
      var d = dossier.getBoundingClientRect(), f = feuille.getBoundingClientRect();
      var s = Math.min(.42, d.width / f.width);
      var dx = (d.left + d.width / 2) - (f.left + f.width / 2);
      var dy = (d.top + d.height * .45) - (f.top + f.height / 2);
      return "translate(" + dx + "px," + dy + "px) scale(" + s + ") rotate(-3deg)";
    };

    var ouvrir = function(dossier){
      if (enCours || dossierOuvert) return;
      var contenu = document.getElementById(dossier.getAttribute("data-feuille"));
      if (!contenu) return;
      enCours = true; dossierOuvert = dossier; contenuOuvert = contenu;
      contenu.hidden = false; corps.appendChild(contenu);
      voile.hidden = false; corps.scrollTop = 0; feuille.scrollTop = 0;
      document.body.classList.add("feuille-ouverte");
      dossier.classList.add("dossier--vide");
      feuille.style.transition = "none";
      feuille.style.transform = surLeDossier(dossier);
      feuille.style.opacity = "0";
      void feuille.offsetWidth;
      voile.classList.add("ouvert");
      feuille.style.transition = "";
      feuille.style.transform = "";
      feuille.style.opacity = "";
      setTimeout(function(){ enCours = false; fermer.focus({ preventScroll: true }); }, DUREE);
      window.dispatchEvent(new Event("resize"));
    };

    var refermer = function(){
      if (enCours || !dossierOuvert) return;
      enCours = true;
      var dossier = dossierOuvert;
      feuille.style.transform = surLeDossier(dossier);
      feuille.style.opacity = "0";
      voile.classList.remove("ouvert");
      setTimeout(function(){
        voile.hidden = true;
        feuille.style.transition = "none"; feuille.style.transform = ""; feuille.style.opacity = "";
        contenuOuvert.hidden = true; dossier.appendChild(contenuOuvert);
        dossier.classList.remove("dossier--vide");
        document.body.classList.remove("feuille-ouverte");
        var btn = dossier.querySelector(".dossier-voir");
        if (btn) btn.focus({ preventScroll: true });
        dossierOuvert = contenuOuvert = null; enCours = false;
        void feuille.offsetWidth; feuille.style.transition = "";
      }, DUREE);
    };

    document.querySelectorAll(".dossier--projet").forEach(function(dossier){
      dossier.addEventListener("click", function(e){
        if (e.target.closest(".feuille-contenu")) return;
        ouvrir(dossier);
      });
    });
    fermer.addEventListener("click", refermer);
    voile.addEventListener("click", function(e){ if (e.target === voile) refermer(); });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && dossierOuvert && !document.body.classList.contains("lightbox-open")) refermer();
    });
  }

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
    var captionBox = wrap.querySelector(".gallery-caption");
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
      /* la légende suit le visuel affiché ; le texte vient de l'alt de
         l'image, elle est donc masquée aux lecteurs d'écran (doublon) */
      if (captionBox && images[i]) captionBox.textContent = images[i].alt || "";
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
  [".passion-grid", ".project-grid"].forEach(function(sel){
    document.querySelectorAll(sel).forEach(function(group){
      Array.prototype.forEach.call(group.children, function(child, i){
        child.classList.add("reveal");
        child.style.setProperty("--d", Math.min(i * 60, 360) + "ms");
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
    }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });

    revealEls.forEach(function(el){ revealObserver.observe(el); });

    /* Filet de sécurité : si l'observateur ne se déclenche pas (onglet en
       arrière-plan au chargement, rendu suspendu…), on révèle au scroll ce
       qui est entré dans la fenêtre — jamais de contenu invisible. */
    var restants = Array.prototype.slice.call(revealEls), fallbackPrevu = false;
    var revealFallback = function(){
      fallbackPrevu = false;
      var vh = window.innerHeight;
      restants = restants.filter(function(el){
        if (el.classList.contains("in-view")) return false;
        if (el.getBoundingClientRect().top < vh * 0.97){ el.classList.add("in-view"); return false; }
        return true;
      });
      if (!restants.length) window.removeEventListener("scroll", planifierFallback);
    };
    var planifierFallback = function(){
      if (!fallbackPrevu){ fallbackPrevu = true; requestAnimationFrame(revealFallback); }
    };
    window.addEventListener("scroll", planifierFallback, { passive: true });
    window.addEventListener("load", revealFallback);
    setTimeout(revealFallback, 1500);
  }

  /* ---------- Tableau en liège : un coup de vent à chaque arrivée ----------
     Chaque fois qu'on arrive au niveau du tableau en faisant défiler la page,
     les papiers oscillent une fois autour de leur punaise, dans le sens du
     défilement, puis se stabilisent. Rien d'autre tant qu'on reste devant :
     il faut quitter le tableau puis y revenir pour une nouvelle rafale. */
  var board = document.querySelector(".profil-board");
  if (board && !reduceMotion){
    var feuilles = board.querySelectorAll(".profil-photo, .profil-text, .profil-langues, .formation-col, .skills-card");
    var dernierY = window.scrollY, ventPrevu = false, devant = false;
    var souffler = function(){
      var y = window.scrollY, dy = y - dernierY; dernierY = y;
      var r = board.getBoundingClientRect(), vh = window.innerHeight;
      var visible = r.top < vh * 0.55 && r.bottom > vh * 0.35;   // tableau bien à l'écran
      if (!visible){ devant = false; return; }
      if (devant || Math.abs(dy) < 2) return;
      devant = true;
      board.style.setProperty("--sens", dy > 0 ? 1 : -1);
      feuilles.forEach(function(f){
        f.classList.remove("vent"); void f.offsetWidth; f.classList.add("vent");
      });
    };
    window.addEventListener("scroll", function(){
      if (ventPrevu) return; ventPrevu = true;
      requestAnimationFrame(function(){ ventPrevu = false; souffler(); });
    }, { passive: true });
  }

})();
