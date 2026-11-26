(function () {
  "use strict";
  var G = window.GF;
  G.renderChrome("index.html");
  var timer = null, active = 0;
  function carousel(list) {
    var box = document.getElementById("hero-carousel");
    if (!box || !list.length) return;
    list = list.slice(0, 5);
    box.innerHTML = list.map(function (im, i) {
      return '<figure class="hero-slide' + (i === 0 ? ' is-active' : '') + '"><img src="' + G.esc(G.imgUrl(im.path)) + '" alt="GROUPFUN" ' + (i ? 'loading="lazy"' : 'fetchpriority="high"') + '></figure>';
    }).join("");
    var slides = box.querySelectorAll(".hero-slide");
    function show(n) { active = n; slides.forEach(function (el, i) { el.classList.toggle("is-active", i === n); }); }
    function next() { show((active + 1) % slides.length); }
    if (slides.length > 1) timer = setInterval(function () { if (!document.hidden) next(); }, 5000);
  }
  G.loadStore().then(function (s) {
    carousel(s.hero || []);
    var highlights = (s.highlight || []).slice(0, 5);
    if (highlights.length) {
      var highlightBox = document.getElementById("highlight-imgs");
      highlightBox.innerHTML = highlights.map(function (im, i) {
        return '<figure class="highlight-slide' + (i === 0 ? ' is-active' : '') + '"><img src="' + G.esc(G.imgUrl(im.path)) + '" alt="Destaque GROUPFUN" loading="lazy"></figure>';
      }).join("");
      document.getElementById("highlights").hidden = false;
      var hSlides = highlightBox.querySelectorAll(".highlight-slide"), hActive = 0;
      if (hSlides.length > 1) setInterval(function () {
        if (document.hidden) return;
        hSlides[hActive].classList.remove("is-active");
        hActive = (hActive + 1) % hSlides.length;
        hSlides[hActive].classList.add("is-active");
      }, 5000);
    }
    var news = (s.news || []).slice(0, 1);
    if (news.length) {
      document.getElementById("news-imgs").innerHTML = news.map(function (im) {
        return '<figure><img src="' + G.esc(G.imgUrl(im.path)) + '" alt="Novidade GROUPFUN" loading="lazy"></figure>';
      }).join("");
      document.getElementById("news").hidden = false;
    }
  }).catch(function (e) { console.error("Erro ao carregar a loja:", e); });
})();
