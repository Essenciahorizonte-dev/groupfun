/* Lógica partilhada pelo site público e pelo painel. */
(function () {
  "use strict";
  var C = (typeof window !== "undefined" && window.GF_CONFIG) || {};

  var norm = function (s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ---------- Cores ---------- */
  var COLOR_LIST = ["Preto", "Branco", "Vermelho", "Laranja", "Amarelo", "Azul", "Azul-marinho", "Verde", "Verde-escuro", "Rosa", "Violeta", "Lilás", "Castanho", "Bege", "Creme", "Cinzento", "Prateado", "Dourado", "Bordô", "Multicolor"];
  var COLOR_ALIASES = {
    preto: "Preto", preta: "Preto", branco: "Branco", branca: "Branco",
    vermelho: "Vermelho", vermelha: "Vermelho", laranja: "Laranja", amarelo: "Amarelo", amarela: "Amarelo", azul: "Azul", azulmarinho: "Azul-marinho",
    castanho: "Castanho", castanha: "Castanho", cinzento: "Cinzento", cinzenta: "Cinzento", violeta: "Violeta", roxo: "Violeta", roxa: "Violeta",
    lilas: "Lilás", creme: "Creme", bege: "Bege", verde: "Verde", verdeescuro: "Verde-escuro", rosa: "Rosa", prateado: "Prateado", dourado: "Dourado", bordo: "Bordô", multicolor: "Multicolor"
  };
  var COLOR_HEX = {
    Preto: "#000000", Branco: "#ffffff", Vermelho: "#c8202a", Castanho: "#6b4423", Cinzento: "#8a8a8a",
    Violeta: "#6f3fa0", Lilás: "#b79bd8", Creme: "#efe6d0", Bege: "#d7c2a2", Verde: "#2f7d4f", "Verde-escuro": "#174b35", Laranja: "#ef7d22", Amarelo: "#f2d33d", Azul: "#2874b9", "Azul-marinho": "#172b4d", Rosa: "#f08fb0", Prateado: "#bfc3c7", Dourado: "#c49a35", Bordô: "#701f35", Multicolor: "linear-gradient(135deg,#e44 0 25%,#f2d33d 25% 50%,#2874b9 50% 75%,#2f7d4f 75%)"
  };
  var canonColor = function (s) { return COLOR_ALIASES[norm(s)] || null; };

  /* ---------- Dinheiro ---------- */
  function fmtMT(n) {
    var p = (Number(n) || 0).toFixed(2).split(".");
    var dec = p[1].replace(/0+$/, "");
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (dec ? "," + dec : "") + " MT";
  }

  /* ---------- Leitura do nome do ficheiro ----------
     Modelo-cor-Nome do produto-PreçoMt.jpg
     O nome pode ter hífenes; o preço é sempre o último elemento. */
  function parseFileName(file, cats) {
    var base = String(file).replace(/\.[^.]+$/, "");
    var parts = base.split("-").map(function (s) { return s.trim(); });
    if (parts.length < 4) return { ok: false, file: file, errors: ["Formato esperado: Modelo-cor-Nome-PreçoMt (ex.: Camisa1-branca-Anjo malvado-500Mt)"] };
    var errors = [];
    var model = parts[0], colorRaw = parts[1], priceRaw = parts[parts.length - 1];
    var name = parts.slice(2, -1).join("-").trim();
    var stem = norm(model.replace(/\d+$/, ""));
    var cat = (cats || []).find(function (c) { return norm(c.singular) === stem || norm(c.name) === stem; });
    if (!cat) errors.push("Categoria não reconhecida: \"" + model + "\"");
    var color = canonColor(colorRaw);
    if (!color) errors.push("Cor não reconhecida: \"" + colorRaw + "\"");
    if (!name) errors.push("Nome do produto em falta");
    var m = priceRaw.replace(/\s/g, "").match(/^(\d+(?:[.,]\d+)?)(mt)?$/i);
    var price = m ? Number(m[1].replace(",", ".")) : NaN;
    if (!m || !(price > 0)) errors.push("Preço inválido: \"" + priceRaw + "\"");
    return {
      ok: errors.length === 0, file: file, errors: errors, model: model,
      category_slug: cat ? cat.slug : null, category_name: cat ? cat.name : null,
      color: color, name: name, price: price
    };
  }

  /* ---------- Categorias visíveis (só as que têm produtos) ---------- */
  function visibleCats(cats, products) {
    var used = {};
    products.forEach(function (p) { used[p.category_slug] = (used[p.category_slug] || 0) + 1; });
    return cats.filter(function (c) { return used[c.slug] > 0; }).map(function (c) {
      return Object.assign({}, c, { count: used[c.slug] });
    });
  }

  /* ---------- Mensagem de WhatsApp ---------- */
  function buildMessage(cart, cats) {
    if (!cart || !cart.length) return "";
    var total = 0;
    var blocks = cart.map(function (it) {
      var cat = (cats || []).find(function (c) { return c.slug === it.category_slug; });
      var sing = cat ? cat.singular : it.category_name;
      var line = it.price * it.qty;
      total += line;
      var l = [sing, sing + "-" + it.name, "Preço-" + fmtMT(it.price)];
      if (it.color) l.push("Cor-" + it.color);
      if (it.size) l.push("Tamanho-" + it.size);
      l.push("Quantidade-" + it.qty, "Total-" + fmtMT(line));
      return l.join("\n");
    });
    return blocks.join("\n\n") + "\n\nTotal geral-" + fmtMT(total);
  }
  function whatsappUrl(msg) {
    return "https://wa.me/" + (C.WHATSAPP || "258853390226") + "?text=" + encodeURIComponent(msg);
  }

  var api = {
    norm: norm, esc: esc, COLOR_LIST: COLOR_LIST, COLOR_HEX: COLOR_HEX, canonColor: canonColor,
    fmtMT: fmtMT, parseFileName: parseFileName, visibleCats: visibleCats, buildMessage: buildMessage, whatsappUrl: whatsappUrl
  };
  if (typeof window === "undefined") { module.exports = api; return; }

  /* ---------- Browser: cliente Supabase ---------- */
  var sb = null;
  if (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) {
    sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  }
  var imgUrl = function (path) { return sb ? sb.storage.from(C.BUCKET).getPublicUrl(path).data.publicUrl : ""; };

  /* Carrega apenas o que é público (RLS garante o resto). */
  async function loadStore() {
    if (!sb) return { configured: false, products: [], cats: [], hero: [], news: [], allCats: [] };
    var r = await Promise.all([
      sb.from("categories").select("*").order("sort"),
      sb.from("products").select("*, product_images(*)").eq("is_active", true).order("created_at", { ascending: false }),
      sb.from("site_images").select("*").order("sort")
    ]);
    for (var i = 0; i < r.length; i++) if (r[i].error) throw r[i].error;
    var products = r[1].data.map(function (p) {
      var images = (p.product_images || []).slice().sort(function (a, b) { return a.sort - b.sort || a.created_at.localeCompare(b.created_at); });
      var colors = [];
      images.forEach(function (im) { if (colors.indexOf(im.color) < 0) colors.push(im.color); });
      return Object.assign({}, p, { images: images, colors: colors, sizes: p.sizes || [] });
    });
    var sImgs = r[2].data;
    return {
      configured: true, products: products, allCats: r[0].data,
      cats: visibleCats(r[0].data, products),
      hero: sImgs.filter(function (s) { return s.kind === "hero"; }).sort(function(a,b){return a.sort-b.sort;}).slice(0, 5),
      highlights: sImgs.filter(function (s) { return s.kind === "highlight"; }).sort(function(a,b){return a.sort-b.sort;}).slice(0, 5),
      references: sImgs.filter(function (s) { return s.kind === "reference"; }).sort(function(a,b){return a.sort-b.sort;}).slice(0, 5),
      news: sImgs.filter(function (s) { return s.kind === "news"; }).sort(function(a,b){return a.sort-b.sort;}).slice(0, 5)
    };
  }

  /* ---------- Cabeçalho e rodapé ---------- */
  function renderChrome(active) {
    var links = [["index.html", "Início"], ["catalogo.html", "Catálogo"], ["contacto.html", "Contacto"]];
    var nav = links.map(function (l) {
      return '<a href="' + l[0] + '"' + (l[0] === active ? ' aria-current="page"' : "") + ">" + l[1] + "</a>";
    }).join("");
    document.getElementById("site-header").innerHTML =
      '<div class="wrap hd-in"><a class="logo" href="index.html" aria-label="GROUPFUN — início"><span class="logo-gf">GF</span><span class="logo-t">GROUPFUN</span></a>' +
      '<div class="hd-actions"><a class="header-cart" href="catalogo.html#cart" aria-label="Abrir carrinho"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 1.9-1.4L22 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg><span class="cart-count" id="header-cart-count">0</span></a><button class="burger" type="button" aria-expanded="false" aria-controls="nav">Menu</button></div>' +
      '<nav id="nav" class="nav" aria-label="Principal">' + nav + "</nav></div>";
    document.getElementById("site-footer").innerHTML =
      '<div class="wrap ft-in"><div><p class="logo-t">GROUPFUN</p><p class="muted">Vestuário e acessórios com personalidade.</p></div>' +
      '<div><p class="ft-h">Contacto</p><a href="https://wa.me/' + C.WHATSAPP + '" target="_blank" rel="noopener">WhatsApp ' + C.WHATSAPP_DISPLAY + '</a>' +
      '<a href="' + C.INSTAGRAM_URL + '" target="_blank" rel="noopener">Instagram ' + C.INSTAGRAM_HANDLE + "</a></div>" +
      '<div><p class="ft-h">Páginas</p>' + nav + "</div></div>" +
      '<div class="wrap ft-end muted small">© ' + new Date().getFullYear() + " GROUPFUN</div>";
    
var b = document.querySelector(".burger");
var n = document.getElementById("nav");

function closeMenu() {
  n.classList.remove("open");
  b.setAttribute("aria-expanded", "false");
}

b.addEventListener("click", function () {
  var o = n.classList.toggle("open");
  b.setAttribute("aria-expanded", String(o));
});

n.addEventListener("click", function (event) {
  if (event.target.closest("a")) {
    closeMenu();
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeMenu();
  }
});

window.addEventListener("resize", function () {
  if (window.innerWidth > 700) {
    closeMenu();
  }
});

    function updateHeaderCart(){try{var items=JSON.parse(localStorage.getItem("gf_cart_v1")||"[]");var count=items.reduce(function(n,x){return n+(Number(x.qty)||0);},0);var el=document.getElementById("header-cart-count");if(el)el.textContent=count;}catch(e){}}
    updateHeaderCart(); window.addEventListener("storage",updateHeaderCart); window.addEventListener("gf-cart-updated",updateHeaderCart);
    if (sb) sb.from("site_images").select("path").eq("kind", "logo").order("sort").limit(1).maybeSingle().then(function (r) {
      if (r.error || !r.data) return;
      var src = imgUrl(r.data.path);
      document.querySelectorAll(".logo").forEach(function (el) {
        el.innerHTML = '<img class="logo-img" src="' + esc(src) + '" alt="GROUPFUN"><span class="sr">GROUPFUN</span>';
      });
      var footLogo = document.querySelector(".ft .logo-t");
      if (footLogo) footLogo.innerHTML = '<img class="logo-img" src="' + esc(src) + '" alt="GROUPFUN">';
    }).catch(function (e) { console.warn("Não foi possível carregar o logótipo:", e); });
  }

  window.GF = Object.assign(api, { C: C, sb: sb, imgUrl: imgUrl, loadStore: loadStore, renderChrome: renderChrome });
})();
