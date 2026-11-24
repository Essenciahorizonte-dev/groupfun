
(function () {
  "use strict";

  var G = window.GF, esc = G.esc;
  var $ = function (s) { return document.querySelector(s); };

  G.renderChrome("catalogo.html");

  var KEY = "gf_cart_v1";
  var store = null, filter = "all", colorFilter = "", query = "", cart = loadCart();

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch (e) {}
  }

  function catName(slug) {
    var c = store.allCats.find(function (x) {
      return x.slug === slug;
    });
    return c ? c.name : "";
  }

  function prod(id) {
    return store.products.find(function (p) {
      return p.id === id;
    });
  }

  /* ---------- Cartões ---------- */

  function card(p) {
    var firstColor = p.colors[0];

    var first = p.images.find(function (im) {
      return im.color === firstColor;
    }) || p.images[0];

    var media = first
      ? '<img src="' + esc(G.imgUrl(first.path)) + '" alt="' +
        esc(p.name) + '" loading="lazy">'
      : '<div class="noimg">Sem fotografia</div>';

    var colors = p.colors.length
      ? '<div class="sw" role="group" aria-label="Cor">' +
        p.colors.map(function (c, i) {
          return '<button type="button" class="sw-b" data-color="' +
            esc(c) + '" aria-pressed="' + (i === 0) +
            '" title="' + esc(c) + '" style="--c:' +
            (G.COLOR_HEX[c] || "#cccccc") + '">' +
            '<span class="sr">' + esc(c) + '</span></button>';
        }).join("") +
        '</div><p class="small sel-color">' +
        esc(firstColor || "") + "</p>"
      : "";

    var sizes = p.sizes.length
      ? '<label class="f"><span>Tamanho</span><select class="size">' +
        '<option value="">Escolher</option>' +
        p.sizes.map(function (s) {
          return '<option value="' + esc(s) + '">' +
            esc(s) + "</option>";
        }).join("") +
        "</select></label>"
      : "";

    return '<article class="card" data-id="' + esc(p.id) + '">' +
      '<div class="card-img">' +
      (p.is_new ? '<span class="tag">Novo</span>' : "") +
      media + "</div>" +
      '<div class="card-b">' +
      '<p class="muted small">' +
      esc(catName(p.category_slug)) + "</p>" +
      "<h3>" + esc(p.name) + "</h3>" +
      '<p class="price">' + G.fmtMT(p.price) + "</p>" +
      colors + sizes +
      '<div class="row">' +
      '<label class="f q"><span>Qtd</span>' +
      '<input class="qty" type="number" min="1" max="99" value="1" inputmode="numeric"></label>' +
      '<button class="btn add" type="button">Adicionar</button>' +
      '</div><p class="msg-line small" role="status"></p>' +
      "</div></article>";
  }

  /* ---------- Apresentação das fotografias ---------- */

  function showSlide(el, slideIndex) {
    if (!el || !el._gfSlides || !el._gfSlides.length) return;

    var p = prod(el.dataset.id);
    if (!p) return;

    var slide = el._gfSlides[slideIndex];
    if (!slide) return;

    el._gfSlideIndex = slideIndex;

    var color = slide.color;

    /* Atualizar a bolinha da cor apresentada */
    el.querySelectorAll(".sw-b").forEach(function (b) {
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.color === color)
      );
    });

    /* Atualizar fotografia */
    var img = el.querySelector(".card-img img");

    if (img) {
      var newUrl = G.imgUrl(slide.path);

      if (img.src !== newUrl) {
        img.src = newUrl;
      }

      img.alt = p.name + " - " + color;
    }

    /* Atualizar nome da cor */
    var label = el.querySelector(".sel-color");

    if (label) {
      label.textContent = color;
    }
  }

  function showCardColor(el, sw) {
    if (!el || !sw || !el._gfSlides) return;

    var color = sw.dataset.color;

    /* Procurar a primeira fotografia dessa cor */
    var index = el._gfSlides.findIndex(function (im) {
      return im.color === color;
    });

    if (index >= 0) {
      showSlide(el, index);
    }
  }

  /* ---------- Carrossel automático de fotografias ---------- */

  function startColorRotation() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    document.querySelectorAll("#grid .card").forEach(function (el) {
      var p = prod(el.dataset.id);
      if (!p) return;

      /*
       * Reunir TODAS as fotografias deste produto.
       * Não existe limite de quantidade.
       */
      var slides = p.images.filter(function (im) {
        return im.path && im.color;
      });

      el._gfSlides = slides;

      /* Uma fotografia não precisa de carrossel */
      if (slides.length < 2) return;

      /* Evitar temporizadores duplicados */
      if (el._gfColorTimer) {
        clearInterval(el._gfColorTimer);
      }

      /* Preparar todas as fotografias */
      slides.forEach(function (im) {
        var preload = new Image();
        preload.src = G.imgUrl(im.path);
      });

      /* Identificar a fotografia actualmente apresentada */
      var img = el.querySelector(".card-img img");
      var currentUrl = img ? img.src : "";

      var initialIndex = slides.findIndex(function (im) {
        return G.imgUrl(im.path) === currentUrl;
      });

      el._gfSlideIndex = initialIndex >= 0 ? initialIndex : 0;

      /*
       * Trocar automaticamente todas as fotografias,
       * incluindo várias fotografias da mesma cor.
       */
      el._gfColorTimer = window.setInterval(function () {
        if (document.hidden) return;
        if (el.hidden) return;
        if (!el.isConnected) return;

        var next = (el._gfSlideIndex + 1) % slides.length;

        showSlide(el, next);

      }, 3500);
    });
  }

  /* ---------- Filtros e pesquisa ---------- */

  function applyFilter() {
    var q = G.norm(query), shown = 0;

    document.querySelectorAll(".card").forEach(function (el) {
      var p = prod(el.dataset.id);

      var okCat = filter === "all" ||
        (filter === "novo" ? p.is_new : p.category_slug === filter);

      var okColor = !colorFilter ||
        p.images.some(function (im) {
          return im.color === colorFilter;
        });

      var okQ = !q ||
        G.norm(p.name).indexOf(q) >= 0 ||
        G.norm(catName(p.category_slug)).indexOf(q) >= 0;

      el.hidden = !(okCat && okColor && okQ);

      if (!el.hidden) shown++;
    });

    $("#status").hidden = shown > 0;

    if (!shown) {
      $("#status").textContent =
        "Nenhum produto encontrado. Experimenta outra pesquisa ou categoria.";
    }

    document.querySelectorAll("#chips .chip").forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.dataset.f === filter));
    });

    document.querySelectorAll("#color-chips .chip").forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.dataset.color === colorFilter));
    });
  }

  function buildChips() {
    var list = [["all", "Todos"]];

    if (store.products.some(function (p) {
      return p.is_new;
    })) {
      list.push(["novo", "Novidades"]);
    }

    store.cats.forEach(function (c) {
      list.push([c.slug, c.name]);
    });

    var box = $("#chips");

    if (list.length < 3) {
      box.hidden = true;
      return;
    }

    box.innerHTML = list.map(function (c) {
      return '<button type="button" class="chip" data-f="' +
        esc(c[0]) + '" aria-pressed="false">' +
        esc(c[1]) + "</button>";
    }).join("");

    box.hidden = false;

    var want = new URLSearchParams(location.search).get("cat");

    if (want && list.some(function (c) {
      return c[0] === want;
    })) {
      filter = want;
    }
  }

  function buildColorChips() {
    var used = G.COLOR_LIST.filter(function (color) {
      return store.products.some(function (p) {
        return p.images.some(function (im) {
          return im.color === color;
        });
      });
    });

    var box = $("#color-chips");

    if (!used.length) {
      box.hidden = true;
      return;
    }

    box.innerHTML =
      '<button type="button" class="chip" data-color="" aria-pressed="true">Todas as cores</button>' +
      used.map(function (c) {
        return '<button type="button" class="chip" data-color="' +
          esc(c) + '" aria-pressed="false">' +
          '<span class="color-swatch" style="--sw:' +
          (G.COLOR_HEX[c] || "#cccccc") + '"></span>' +
          esc(c) + "</button>";
      }).join("");

    box.hidden = false;

    var want = new URLSearchParams(location.search).get("color");

    if (want && used.indexOf(want) >= 0) {
      colorFilter = want;
    }
  }

  /* ---------- Encomenda ---------- */

  function syncCart() {
    cart = cart.filter(function (it) {
      var p = prod(it.pid);

      if (!p) return false;
      if (it.color && p.colors.indexOf(it.color) < 0) return false;
      if (it.size && p.sizes.indexOf(it.size) < 0) return false;

      it.name = p.name;
      it.price = Number(p.price);
      it.category_slug = p.category_slug;
      it.category_name = catName(p.category_slug);

      return true;
    });

    saveCart();
  }

  function renderCart() {
    var n = cart.reduce(function (a, i) {
      return a + i.qty;
    }, 0);

    var total = cart.reduce(function (a, i) {
      return a + i.qty * i.price;
    }, 0);

    $("#cart-n").textContent = n;

    $("#cart-items").innerHTML = cart.length
      ? cart.map(function (it, i) {
          return '<div class="ci"><div><strong>' +
            esc(it.name) +
            '</strong><span class="muted">' +
            esc(it.category_name) +
            "</span><span>Preço: " + G.fmtMT(it.price) +
            "</span>" +
            (it.color ? "<span>Cor: " + esc(it.color) + "</span>" : "") +
            (it.size ? "<span>Tamanho: " + esc(it.size) + "</span>" : "") +
            "<span>Quantidade: " + it.qty + "</span>" +
            "<span><b>Total: " + G.fmtMT(it.price * it.qty) +
            '</b></span></div>' +
            '<button type="button" class="link rm" data-i="' +
            i + '">Remover</button></div>';
        }).join("")
      : '<p class="muted">A encomenda está vazia. Adiciona peças do catálogo.</p>';

    $("#cart-total").textContent = G.fmtMT(total);

    var send = $("#send");
    var msg = G.buildMessage(cart, store.allCats);

    send.setAttribute("aria-disabled", String(!msg));
    send.href = msg ? G.whatsappUrl(msg) : "#";

    $("#clear").hidden = !cart.length;
  }

  function addToCart(el) {
    var p = prod(el.dataset.id);
    var line = el.querySelector(".msg-line");

    var say = function (t) {
      line.textContent = t;
    };

    var pressed = el.querySelector('.sw-b[aria-pressed="true"]');
    var color = pressed ? pressed.dataset.color : "";

    var sel = el.querySelector(".size");
    var size = sel ? sel.value : "";

    if (p.sizes.length && !size) {
      say("Escolhe o tamanho.");
      sel.focus();
      return;
    }

    var qty = Math.max(
      1,
      Math.min(99, parseInt(el.querySelector(".qty").value, 10) || 1)
    );

    var ex = cart.find(function (i) {
      return i.pid === p.id &&
        i.color === color &&
        i.size === size;
    });

    if (ex) {
      ex.qty = Math.min(99, ex.qty + qty);
    } else {
      cart.push({
        pid: p.id,
        name: p.name,
        category_slug: p.category_slug,
        category_name: catName(p.category_slug),
        price: Number(p.price),
        color: color,
        size: size,
        qty: qty
      });
    }

    saveCart();
    renderCart();
    say("Adicionado à encomenda.");
  }

  function toggleCart(open) {
    $("#cart").hidden = !open;
    $("#scrim").hidden = !open;

    document.body.classList.toggle("lock", open);

    if (open) {
      $("#close-cart").focus();
    } else {
      $("#open-cart").focus();
    }
  }

  /* ---------- Eventos ---------- */

  $("#grid").addEventListener("click", function (e) {
    var el = e.target.closest(".card");
    if (!el) return;

    var sw = e.target.closest(".sw-b");

    if (sw) {
      /* Troca manual imediata para a primeira foto dessa cor */
      showCardColor(el, sw);

    } else if (e.target.closest(".add")) {
      addToCart(el);
    }
  });

  $("#chips").addEventListener("click", function (e) {
    var c = e.target.closest(".chip");

    if (c) {
      filter = c.dataset.f;
      applyFilter();
    }
  });

  $("#color-chips").addEventListener("click", function (e) {
    var c = e.target.closest(".chip");

    if (c) {
      colorFilter = c.dataset.color || "";
      applyFilter();
    }
  });

  $("#q").addEventListener("input", function (e) {
    query = e.target.value;
    applyFilter();
  });

  $("#open-cart").addEventListener("click", function () {
    toggleCart(true);
  });

  $("#close-cart").addEventListener("click", function () {
    toggleCart(false);
  });

  $("#scrim").addEventListener("click", function () {
    toggleCart(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !$("#cart").hidden) {
      toggleCart(false);
    }
  });

  $("#cart-items").addEventListener("click", function (e) {
    var b = e.target.closest(".rm");
    if (!b) return;

    cart.splice(Number(b.dataset.i), 1);
    saveCart();
    renderCart();
  });

  $("#clear").addEventListener("click", function () {
    cart = [];
    saveCart();
    renderCart();
  });

  $("#send").addEventListener("click", function (e) {
    var msg = G.buildMessage(cart, store.allCats);

    if (!msg) {
      e.preventDefault();
      return;
    }

    this.href = G.whatsappUrl(msg);
  });

  /* ---------- Arranque ---------- */

  G.loadStore().then(function (s) {
    store = s;

    if (!s.configured) {
      $("#status").textContent =
        "O catálogo ainda não está disponível.";
      $("#open-cart").hidden = true;
      return;
    }

    if (!s.products.length) {
      $("#status").textContent =
        "Ainda não há produtos disponíveis. Volta em breve.";
      $("#open-cart").hidden = true;
      return;
    }

    $("#grid").innerHTML = s.products.map(card).join("");

    buildChips();
    buildColorChips();
    syncCart();
    renderCart();
    applyFilter();

    /* Carrossel automático apenas no catálogo */
    startColorRotation();

  }).catch(function (e) {
    console.error(e);

    $("#status").textContent =
      "Não foi possível carregar o catálogo. Tenta novamente dentro de instantes.";

    $("#open-cart").hidden = true;
  });

})();
