
(function () {
  "use strict";

  var G = window.GF;
  G.renderChrome("index.html");

  var timer = null;

  function carousel(target, list, kind) {
    var box = document.getElementById(target);
    if (!box) return;

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    if (!list || !list.length) {
      box.innerHTML = kind === "hero"
        ? '<div class="gf-cover-fallback">GROUPFUN</div>'
        : "";
      return;
    }

    // Manter a ordem definida no painel administrativo.
    var slides = list.slice(0, 5).slice().sort(function (a, b) {
      return Number(a.sort || 0) - Number(b.sort || 0);
    });

    box.innerHTML = slides.map(function (im, i) {
      return '<figure class="gf-slide' +
        (i === 0 ? ' active' : '') +
        '"><img src="' + G.esc(G.imgUrl(im.path)) +
        '" alt="GROUPFUN ' + kind + ' ' + (i + 1) +
        '" loading="eager" decoding="async"></figure>';
    }).join('');

    if (kind === "hero" && slides.length > 1) {
      var idx = 0;

      timer = setInterval(function () {
        var all = box.querySelectorAll(".gf-slide");

        if (all.length < 2) return;

        all[idx].classList.remove("active");

        idx = (idx + 1) % all.length;

        all[idx].classList.add("active");

      }, 5000);
    }
  }

  function imageRail(id, items, kind) {
    var el = document.getElementById(id);
    var section = document.getElementById(
      kind === "highlight" ? "highlights" : "references"
    );

    if (!el || !section || !items.length) return;

    el.innerHTML = items.slice(0, 5).map(function (im, i) {
      return '<figure><img src="' +
        G.esc(G.imgUrl(im.path)) +
        '" alt="GROUPFUN ' + kind + ' ' + (i + 1) +
        '" loading="lazy"></figure>';
    }).join("");

    section.hidden = false;
  }

  G.loadStore().then(function (s) {

    carousel("hero-carousel", s.hero, "hero");

    imageRail("highlight-imgs", s.highlights, "highlight");

    imageRail("reference-imgs", s.references, "reference");

    var fresh = s.products.filter(function (p) {
      return p.is_new && p.images && p.images.length;
    }).slice(0, 4);

    var news = document.getElementById("news");
    var newsEl = document.getElementById("news-imgs");

    var newsCards = fresh.map(function (p) {
      return '<a class="news-product" href="catalogo.html?search=' +
        encodeURIComponent(p.name) + '">' +
        '<img src="' + G.esc(G.imgUrl(p.images[0].path)) +
        '" alt="' + G.esc(p.name) + '" loading="lazy">' +
        '<span>' + G.esc(p.name) + '</span></a>';
    });

    (s.news || []).forEach(function (im, i) {
      newsCards.push(
        '<figure><img src="' +
        G.esc(G.imgUrl(im.path)) +
        '" alt="Novidade GROUPFUN ' + (i + 1) +
        '" loading="lazy"></figure>'
      );
    });

    if (newsCards.length && newsEl) {
      newsEl.innerHTML = newsCards.slice(0, 5).join("");
      news.hidden = false;
    }

    var cats = document.getElementById("cats");

    if (s.cats.length) {
      document.getElementById("cat-grid").innerHTML =
        s.cats.slice(0, 4).map(function (c) {
          var first = s.products.find(function (p) {
            return p.category_slug === c.slug &&
              p.images.length;
          });

          if (!first) return "";

          return '<a class="cat" href="catalogo.html?cat=' +
            encodeURIComponent(c.slug) + '">' +
            '<img src="' +
            G.esc(G.imgUrl(first.images[0].path)) +
            '" alt="' + G.esc(c.name) + '" loading="lazy">' +
            '<span class="cat-n">' +
            G.esc(c.name) + '</span></a>';
        }).join("");
    } else {
      cats.hidden = true;
    }

  }).catch(function (e) {
    console.error("Erro ao carregar GROUPFUN:", e);
  });

})();
