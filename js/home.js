(function () {
  "use strict";
  var G = window.GF;
  G.renderChrome("index.html");

  /* Mostra só as imagens que existem; sem imagens, o bloco inteiro fica oculto. */
  function fill(box, list, alt) {
    box.innerHTML = "";
    if (!list.length) { box.hidden = true; return false; }
    box.className = "imgs n" + list.length;
    box.innerHTML = list.map(function (im) {
      return '<figure><img src="' + G.esc(G.imgUrl(im.path)) + '" alt="' + alt + '" loading="lazy"></figure>';
    }).join("");
    box.hidden = false;
    return true;
  }

  G.loadStore().then(function (s) {
    fill(document.getElementById("hero-imgs"), s.hero, "GROUPFUN");
    var news = document.getElementById("news");
    news.hidden = !fill(document.getElementById("news-imgs"), s.news, "Novidade GROUPFUN");

    var cats = document.getElementById("cats");
    if (!s.cats.length) { cats.hidden = true; return; }
    document.getElementById("cat-grid").innerHTML = s.cats.map(function (c) {
      var first = s.products.find(function (p) { return p.category_slug === c.slug && p.images.length; });
      var img = first ? '<img src="' + G.esc(G.imgUrl(first.images[0].path)) + '" alt="" loading="lazy">' : "";
      return '<a class="cat" href="catalogo.html?cat=' + encodeURIComponent(c.slug) + '">' + img +
        '<span class="cat-n">' + G.esc(c.name) + '</span><span class="cat-c">' + c.count + (c.count === 1 ? " peça" : " peças") + "</span></a>";
    }).join("");
    cats.hidden = false;
  }).catch(function (e) { console.error("Erro ao carregar a loja:", e); });
})();
