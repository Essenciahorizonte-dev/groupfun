(function () {
  "use strict";
  var G = window.GF;
  G.renderChrome("index.html");
  var timer = null, active = 0;
  function renderHero(list) {
    var box = document.getElementById("hero-carousel");
    var dots = document.getElementById("hero-dots");
    if (!list.length) return;
    box.innerHTML = list.map(function (im, i) {
      return '<figure class="hero-slide' + (i === 0 ? ' is-active' : '') + '" data-slide="' + i + '"><img src="' + G.esc(G.imgUrl(im.path)) + '" alt="Destaque GROUPFUN ' + (i + 1) + '"' + (i ? ' loading="lazy"' : ' fetchpriority="high"') + '></figure>';
    }).join("") + '<div class="hero-dots" id="hero-dots">' + list.map(function (_, i) {
      return '<button type="button" class="hero-dot' + (i === 0 ? ' is-active' : '') + '" data-dot="' + i + '" aria-label="Ver imagem ' + (i + 1) + '" aria-pressed="' + (i === 0) + '"></button>';
    }).join("") + '</div><span class="hero-counter">0' + (active + 1) + ' / 0' + list.length + '</span>';
    function show(n) {
      active = n;
      box.querySelectorAll(".hero-slide").forEach(function (el, i) { el.classList.toggle("is-active", i === n); });
      box.querySelectorAll(".hero-dot").forEach(function (el, i) { el.classList.toggle("is-active", i === n); el.setAttribute("aria-pressed", String(i === n)); });
      var count = box.querySelector(".hero-counter"); if (count) count.textContent = "0" + (n + 1) + " / 0" + list.length;
    }
    dots = box.querySelector(".hero-dots");
    dots.addEventListener("click", function (e) { var b = e.target.closest("[data-dot]"); if (!b) return; show(Number(b.dataset.dot)); restart(); });
    function restart() { if (timer) clearInterval(timer); if (list.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(function () { show((active + 1) % list.length); }, 5000); }
    restart();
  }
  function renderColors(products) {
    var box = document.getElementById("color-rows"), colors = G.COLOR_LIST;
    var used = colors.filter(function (c) { return products.some(function (p) { return p.images.some(function (im) { return im.color === c; }); }); });
    if (!used.length) { document.getElementById("color-showcase").hidden = true; return; }
    box.innerHTML = used.slice(0, 8).map(function (color) {
      var matches = products.filter(function (p) { return p.images.some(function (im) { return im.color === color; }); }).slice(0, 4);
      return '<section class="color-row"><div class="color-row-title"><span class="color-swatch" style="--sw:' + G.COLOR_HEX[color] + '"></span><h3>' + G.esc(color) + '</h3><a href="catalogo.html?color=' + encodeURIComponent(color) + '">Ver peças →</a></div><div class="color-mini-grid">' + matches.map(function (p) { var im = p.images.find(function (x) { return x.color === color; }); return '<a class="color-mini" href="catalogo.html?cat=' + encodeURIComponent(p.category_slug) + '&color=' + encodeURIComponent(color) + '"><img src="' + G.esc(G.imgUrl(im.path)) + '" alt="' + G.esc(p.name) + ' — ' + color + '" loading="lazy"><b>' + G.esc(p.name) + '</b></a>'; }).join("") + '</div></section>';
    }).join("");
  }
  G.loadStore().then(function (s) {
    renderHero(s.hero);
    var news = document.getElementById("news");
    if (s.news.length) {
      document.getElementById("news-imgs").innerHTML = s.news.map(function (im, i) { return '<figure><img src="' + G.esc(G.imgUrl(im.path)) + '" alt="Novidade GROUPFUN ' + (i + 1) + '" loading="lazy"></figure>'; }).join("");
      news.hidden = false;
    }
    var cats = document.getElementById("cats");
    if (s.cats.length) {
      document.getElementById("cat-grid").innerHTML = s.cats.map(function (c) {
        var first = s.products.find(function (p) { return p.category_slug === c.slug && p.images.length; });
        var img = first ? '<img src="' + G.esc(G.imgUrl(first.images[0].path)) + '" alt="' + G.esc(c.name) + '" loading="lazy">' : '<span class="cat-placeholder">GF</span>';
        return '<a class="cat" href="catalogo.html?cat=' + encodeURIComponent(c.slug) + '">' + img + '<span class="cat-n">' + G.esc(c.name) + '</span><span class="cat-c">' + c.count + (c.count === 1 ? ' referência' : ' referências') + '</span></a>';
      }).join(""); cats.hidden = false;
    }
    renderColors(s.products);
  }).catch(function (e) { console.error("Erro ao carregar a loja:", e); });
})();
