// Art, Coffee & Motivation — интерактив одностраничного сайта
(function () {
  "use strict";

  var d = document;
  d.documentElement.classList.add("js");

  /* ---------------------------------------- СТРАХОВКА: блоки не должны остаться
     невидимыми. Если что-то сломалось (или скрипт завис) — показываем всё. */
  function revealAll() {
    d.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }
  setTimeout(revealAll, 2500);
  window.addEventListener("load", function () { setTimeout(revealAll, 1200); });

  /* ------------------------------------------------ прогресс прокрутки */
  var bar = d.getElementById("progress");
  function progress() {
    var h = d.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop || d.body.scrollTop) / max : 0;
    bar.style.width = (Math.min(1, Math.max(0, p)) * 100).toFixed(2) + "%";
  }

  /* ------------------------------------------------------ появление блоков */
  var revealTargets = d.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("in"); });
  }

  /* ------------------------------------------- блик за курсором на карточках */
  d.querySelectorAll(".card,.d-card").forEach(function (el) {
    el.addEventListener("pointermove", function (ev) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", ((ev.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      el.style.setProperty("--my", ((ev.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    });
  });

  /* ------------------------------------------------------- мобильное меню */
  var burger = d.querySelector(".burger");
  var menu = d.getElementById("mobile-menu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", menu.classList.contains("open") ? "true" : "false");
    });
    menu.addEventListener("click", function (ev) {
      if (ev.target.tagName === "A") menu.classList.remove("open");
    });
  }

  /* --------------------------------- ленты: плавное перетаскивание + инерция */
  function maxScroll(el) { return Math.max(0, el.scrollWidth - el.clientWidth); }

  function clampPos(el, v) { return Math.min(maxScroll(el), Math.max(0, v)); }

  /* мягко доводим ленту к позиции (анимация, без скачка) */
  function glideTo(el, target) {
    target = clampPos(el, target);
    if (el._glide) cancelAnimationFrame(el._glide);
    var start = el.scrollLeft, delta = target - start;
    if (Math.abs(delta) < 0.6) { el.scrollLeft = target; return; }
    var t0 = performance.now();
    var dur = Math.min(520, 130 + Math.abs(delta) * 1.1);
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      el.scrollLeft = start + delta * e;
      el._glide = (k < 1) ? requestAnimationFrame(step) : 0;
    })(performance.now());
  }

  /* ближайший центр элемента — «док» после броска (через реальные координаты) */
  function nearestCenter(el) {
    var box = el.getBoundingClientRect();
    var mid = box.left + box.width / 2;
    var items = el.children, best = null, bd = Infinity;
    for (var i = 0; i < items.length; i++) {
      var r = items[i].getBoundingClientRect();
      var c = r.left + r.width / 2;
      var dd = Math.abs(c - mid);
      if (dd < bd) { bd = dd; best = c; }
    }
    if (best === null) return el.scrollLeft;
    return el.scrollLeft + (best - mid);
  }

  function dragScroll(el) {
    var down = false, startX = 0, startLeft = 0, moved = 0;
    var vel = 0, lastX = 0, lastT = 0, raf = 0, wheelTarget = null, wheelRaf = 0;

    function stopWheel() {
      if (wheelRaf) { cancelAnimationFrame(wheelRaf); wheelRaf = 0; }
      wheelTarget = null;
    }

    el.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "touch") return;      // тач скроллит сам браузер
      stopWheel();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (el._glide) { cancelAnimationFrame(el._glide); el._glide = 0; }
      down = true; moved = 0; vel = 0;
      startX = lastX = ev.clientX;
      startLeft = el.scrollLeft;
      lastT = performance.now();
      el.classList.add("dragging");
      if (el.setPointerCapture) { try { el.setPointerCapture(ev.pointerId); } catch (e) {} }
    });

    el.addEventListener("pointermove", function (ev) {
      if (!down) return;
      var dx = ev.clientX - startX;
      if (Math.abs(dx) > moved) moved = Math.abs(dx);
      el.scrollLeft = startLeft - dx;
      var now = performance.now();
      if (now - lastT >= 16) {                    // скорость для инерции
        vel = (ev.clientX - lastX) / (now - lastT);
        lastX = ev.clientX; lastT = now;
      }
      if (moved > 4) ev.preventDefault();
    });

    function release() {
      if (!down) return;
      down = false;
      el.classList.remove("dragging");
      var speed = -vel;                           // px/ms
      if (Math.abs(speed) < 0.06) { glideTo(el, nearestCenter(el)); return; }
      var last = performance.now();
      (function tick(t) {
        var dt = Math.min(34, t - last); last = t;
        el.scrollLeft += speed * dt;
        speed *= Math.pow(0.93, dt / 16);
        if (Math.abs(speed) > 0.02) raf = requestAnimationFrame(tick);
        else { raf = 0; glideTo(el, nearestCenter(el)); }
      })(performance.now());
    }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) {
      el.addEventListener(t, release);
    });

    el.addEventListener("click", function (ev) {
      if (moved > 4) { ev.preventDefault(); ev.stopPropagation(); moved = 0; }
    }, true);

    /* лента едет вбок только от ГОРИЗОНТАЛЬНОГО жеста (свайп/Shift+колесо).
       Обычное вертикальное колесо листает страницу — иначе нельзя прокрутить вниз. */
    el.addEventListener("wheel", function (ev) {
      if (maxScroll(el) < 2) return;
      var horiz = Math.abs(ev.deltaX) > Math.abs(ev.deltaY);
      if (!horiz && !ev.shiftKey) return;                 // страница едет сама
      var delta = horiz ? ev.deltaX : ev.deltaY;
      if (!delta) return;
      var base = wheelTarget === null ? el.scrollLeft : wheelTarget;
      var target = clampPos(el, base + delta);
      if (target === base && base === el.scrollLeft) return;
      ev.preventDefault();
      wheelTarget = target;
      if (!wheelRaf) {
        (function tick() {
          if (wheelTarget === null) { wheelRaf = 0; return; }
          var diff = wheelTarget - el.scrollLeft;
          if (Math.abs(diff) < 0.6) { el.scrollLeft = wheelTarget; wheelTarget = null; wheelRaf = 0; return; }
          el.scrollLeft += diff * 0.24;
          wheelRaf = requestAnimationFrame(tick);
        })();
      }
    }, { passive: false });

    el.addEventListener("scroll", function () {
      if (wheelTarget !== null) {                 // добор колеса во время анимации
        if (Math.abs(wheelTarget - el.scrollLeft) > 240) wheelTarget = el.scrollLeft;
      }
    }, { passive: true });
  }

  /* центральный элемент ленты мягко выходит вперёд */
  d.querySelectorAll("[data-strip]").forEach(function (el) {
    dragScroll(el);

    var items = Array.prototype.slice.call(el.children);

    var front = -1;
    function updateFront() {
      var box = el.getBoundingClientRect();
      var mid = box.left + box.width / 2;
      var best = -1, bestD = Infinity, curD = Infinity;
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        var dist = Math.abs(r.left + r.width / 2 - mid);
        if (i === front) curD = dist;
        if (dist < bestD) { bestD = dist; best = i; }
      }
      if (best === front) return;
      /* гистерезис: не переключаемся, пока следующий кадр лишь чуть ближе — иначе мигает */
      if (front >= 0 && bestD > curD - 70) return;
      front = best;
      items.forEach(function (it, i) { it.classList.toggle("is-front", i === best); });
    }

    el.addEventListener("scroll", updateFront, { passive: true });
    window.addEventListener("resize", updateFront);
    window.addEventListener("load", updateFront);
    el.querySelectorAll("img").forEach(function (im) {
      if (im.complete) updateFront();
      else im.addEventListener("load", updateFront, { once: true });
    });
    updateFront();
  });

  /* --------- видео: АВТОПРОИЗВЕДЕНИЕ ленивое — ролики стартуют сами, когда лента
     доскроллена до них (иначе 27 МБ улетают сразу при открытии страницы,
     а на мобильном интернете это и было причиной «вечной загрузки»).
     Если браузер всё же запретил автостарт — показываем кнопку ▶. */
  var vids = Array.prototype.slice.call(d.querySelectorAll(".clip video"));
  /* постер НЕ в разметке: атрибут poster браузер тянет сразу при открытии
     страницы (4 картинки = 4 запроса ещё до первого кадра). Ставим его
     в момент, когда ролик реально начинает играть. */
  /* src ролика НЕ в разметке: браузер всё равно начинает качать видео сразу
     при открытии страницы, игнорируя preload="none". Ставим src только
     в тот момент, когда ролик реально должен играть. */
  function loadMedia(v) {
    if (!v.getAttribute("src") && v.dataset && v.dataset.src) v.src = v.dataset.src;
  }
  function loadPoster(v) {
    if (!v.poster && v.dataset && v.dataset.poster) v.poster = v.dataset.poster;
  }
  function safePlay(v) { loadMedia(v); loadPoster(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  vids.forEach(function (v) {
    v.muted = true;
    var scr = v.parentNode;
    if (!scr) return;
    /* кнопка-запасной вариант: видна только если автозапуск не сработал */
    var btn = d.createElement("button");
    btn.type = "button";
    btn.className = "playbtn";
    btn.setAttribute("aria-label", "Смотреть видео");
    btn.innerHTML = '<span aria-hidden="true">▶</span>';
    btn.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
    btn.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (v.paused) { v.muted = true; safePlay(v); } else v.pause();
    });
    scr.appendChild(btn);
    v.addEventListener("play", function () { scr.classList.remove("show-playbtn"); });
    v.scr = scr;
  });

/* Все ролики, которые СЕЙЧАС видны на экране, играют одновременно —
   невидимые стоят на паузе (иначе 27 МБ улетают при
   открытии страницы). Один источник правды — список
   видимых карточек от IntersectionObserver; никаких «перетягиваний»
   роликов между двумя логиками нет. */
  var visible = [];
  /* На телефоне в экран влезает 1-2 ролика, и играют они ОДНОВРЕМЕННО —
     это до 7 МБ в канал разом, а на мобильном интернете вкладка от этого
     «зависала» (жалоба: «на телефоне перестал сайт грузить»). Поэтому на
     грубом/узком экране играет ОДИН — тот, что ближе к центру экрана
     (по позиции, а не по факту «краешек виден»). На десктопе играют все
     видимые (4 шт — там канал быстрый). */
  var liteVideo = !!(window.matchMedia && window.matchMedia("(pointer:coarse), (max-width:760px)").matches);
  var curV = null;

  /* Точка, у которой ролик должен оказаться, чтобы начать играть.
     Чуть правее центра: на телефоне лента узкая, и «строго по центру»
     включало ролик слишком поздно — правый крайний не успевал. */
  var LITE_X = 0.54, LITE_Y = 0.5;

  /* насколько ролик отстоит от целевой точки (меньше = лучше) */
  function offTarget(v) {
    var box = (v.closest && v.closest(".clip")) || v;
    var r = box.getBoundingClientRect();
    var W = d.documentElement.clientWidth || d.innerWidth;
    var H = d.documentElement.clientHeight || d.innerHeight;
    return Math.abs((r.left + r.right) / 2 - W * LITE_X) +
           Math.abs((r.top + r.bottom) / 2 - H * LITE_Y);
  }

  /* ближайший к целевой точке из видимых */
  function pickLite() {
    var best = null, bestD = Infinity;
    for (var i = 0; i < visible.length; i++) {
      var dd = offTarget(visible[i]);
      if (dd < bestD) { bestD = dd; best = visible[i]; }
    }
    return best ? { v: best, d: bestD } : null;
  }

  function sync() {
    if (d.hidden) {
      vids.forEach(function (x) { if (!x.paused) x.pause(); });
      return;
    }
    /* кого играем: всех видимых или только центральный */
    var on = visible;
    if (liteVideo) {
      /* Переключаемся по ПОЗИЦИИ, а не по факту «хоть краешек виден».
         Раньше включённый ролик играл, пока был в кадре, — из-за этого
         следующий ждал, пока предыдущий совсем не уедет, и самый правый
         не запускался, пока его не сдвинешь сильно влево (жалоба Рустама).
         Теперь играет тот, кто ближе к целевой точке (центр, чуть правее);
         24 px гистерезиса — чтобы на ровном совпадении не мигало. */
      var c = pickLite();
      if (!c) curV = null;
      else if (!curV || visible.indexOf(curV) < 0) curV = c.v;
      else if (c.v !== curV && c.d + 24 < offTarget(curV)) curV = c.v;
      on = curV ? [curV] : [];
    }
    vids.forEach(function (x) {
      if (on.indexOf(x) >= 0) {
        x.muted = true;
        if (x.paused) safePlay(x);
      } else if (!x.paused) {
        x.pause();
      }
    });
    /* кнопка ▶ — только там, где автозапуск реально не разрешён */
    setTimeout(function () {
      vids.forEach(function (x) {
        if (!x.scr) return;
        if (x.paused && on.indexOf(x) >= 0) x.scr.classList.add("show-playbtn");
        else x.scr.classList.remove("show-playbtn");
      });
    }, 2500);
  }

  var syncRaf = 0;
  function syncSoon() {
    if (syncRaf) return;
    syncRaf = requestAnimationFrame(function () { syncRaf = 0; sync(); });
  }
  function setVisible(v, on) {
    var i = visible.indexOf(v);
    if (on && i < 0) visible.push(v);
    else if (!on && i >= 0) visible.splice(i, 1);
    syncSoon();
  }

  if ("IntersectionObserver" in window) {
    vids.forEach(function (v) {
      var box = (v.closest && v.closest(".clip")) || v;
      new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) {
          setVisible(v, !!es[i].isIntersecting && es[i].intersectionRatio > 0.1);
        }
      }, { threshold: [0, 0.1, 0.35, 0.7], rootMargin: "0px 0px -5% 0px" }).observe(box);
    });
  }
  d.addEventListener("scroll", syncSoon, { passive: true });
  d.addEventListener("resize", syncSoon);
  sync();

  /* мобильные браузеры иногда блокируют автостарт до первого
     касания — первое касание «оживляет» видимые ролики */
  function firstTouch() {
    sync();
    d.removeEventListener("pointerdown", firstTouch, true);
    d.removeEventListener("touchstart", firstTouch, true);
  }
  d.addEventListener("pointerdown", firstTouch, true);
  d.addEventListener("touchstart", firstTouch, true);

  /* вкладка ушла в фон — пауза, чтобы не жечь трафик */
  d.addEventListener("visibilitychange", function () {
    if (d.hidden) vids.forEach(function (x) { if (!x.paused) x.pause(); });
    else syncSoon();
  });

  /* ------------------------------------------------------- плавная прокрутка */
  d.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (ev) {
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var target = d.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      var top = target.getBoundingClientRect().top + window.pageYOffset - 62;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });

  /* -------------------------------------------------------------- год в футере */
  var y = d.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());

  window.addEventListener("scroll", progress, { passive: true });
  window.addEventListener("resize", progress);
  progress();
})();