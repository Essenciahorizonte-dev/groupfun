
(function () {
  "use strict";

  var G = window.GF, esc = G.esc;
  var $ = function (s) { return document.querySelector(s); };

  G.renderChrome("catalogo.html");

  var KEY = "gf_cart_v1";
  var store = null, filter = "all", colorFilter = "", query = "", cart = loadCart();

  function loadCart() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(c) ? c : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart)); window.dispatchEvent(new Event("gf-cart-updated"));
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

  /* ---------- Opção (cor/variante) seleccionada ---------- */

  function optionOf(p, color) {
    return (p.options || []).find(function (o) { return o.color === color; }) || null;
  }

  /* O que o cartão mostra neste momento: dados da opção, ou do produto se não há cores. */
  function viewOf(p, o) {
    if (o) return o;
    return {
      color: "", variant_id: null, name: p.name, variant_name: "",
      reference: p.reference || "", price: Number(p.price),
      sizes: p.sizes || [], available: p.is_available !== false, images: []
    };
  }

  /* ---------- Cartões ---------- */

  function sizesHtml(v, keep) {
    if (!v.sizes.length) return "";
    return '<label class="f"><span>Tamanho</span><select class="size">' +
      '<option value="">Escolher</option>' +
      v.sizes.map(function (s) {
        return '<option value="' + esc(s) + '"' + (s === keep ? " selected" : "") + ">" + esc(s) + "</option>";
      }).join("") +
      "</select></label>";
  }

  function card(p) {
    var o = G.defaultOption(p.options);
    var v = viewOf(p, o);
    var first = (o && o.images[0]) || p.cover;

    var media = first
      ? '<img src="' + esc(G.imgUrl(first.path)) + '" alt="' +
        esc(p.name + (v.color ? " - " + v.color : "")) + '" loading="lazy">'
      : '<div class="noimg">Sem fotografia</div>';

    var swatches = p.options.length
      ? '<div class="sw" role="group" aria-label="Cor">' +
        p.options.map(function (c) {
          return '<button type="button" class="sw-b' + (c.available ? "" : " off") +
            '" data-color="' + esc(c.color) +
            '" aria-pressed="' + (c === o) +
            '" title="' + esc(c.color + (c.available ? "" : " (indisponível)")) +
            '" style="--c:' + (G.COLOR_HEX[c.color] || "#cccccc") + '">' +
            '<span class="sr">' + esc(c.color) + '</span></button>';
        }).join("") +
        '</div><p class="small sel-color">' + esc(v.color) + "</p>"
      : "";

    return '<article class="card" data-id="' + esc(p.id) + '">' +
      '<div class="card-img">' +
      (p.is_new ? '<span class="tag">Novo</span>' : "") +
      media + "</div>" +
      '<div class="card-b">' +
      '<p class="muted small">' + esc(catName(p.category_slug)) + "</p>" +
      '<h3 class="p-name">' + esc(v.name) + "</h3>" +
      '<p class="muted small p-var"' + (v.variant_name ? "" : " hidden") + ">" + esc(v.variant_name) + "</p>" +
      '<p class="muted small p-ref"' + (v.reference ? "" : " hidden") + ">Ref.: " + esc(v.reference) + "</p>" +
      '<p class="price">' + G.fmtMT(v.price) + "</p>" +
      swatches +
      '<div class="size-box">' + sizesHtml(v, "") + "</div>" +
      '<p class="small stock-line err-t"' + (v.available ? " hidden" : "") + ">Indisponível de momento</p>" +
      '<div class="row">' +
      '<label class="f q"><span>Qtd</span>' +
      '<input class="qty" type="number" min="1" max="99" value="1" inputmode="numeric"></label>' +
      '<button class="btn add" type="button"' + (v.available ? "" : " disabled") + ">" +
      (v.available ? "Adicionar" : "Indisponível") + "</button>" +
      '</div><p class="msg-line small" role="status"></p>' +
      "</div></article>";
  }

  /* ---------- Escolha de cor / variante ----------
     Ao escolher uma cor actualiza-se tudo: fotografia, nome, referência, preço, cor,
     tamanhos e disponibilidade. Se a cor tem várias fotografias, rodam sozinhas. */

  var ROTATE_MS = 3500;

  function stopRotation(el) {
    if (el._gfTimer) { clearInterval(el._gfTimer); el._gfTimer = null; }
    if (el._gfStart) { clearTimeout(el._gfStart); el._gfStart = null; }
  }

  function livePhotos(el) {
    var o = optionOf(prod(el.dataset.id), el._gfColor);
    var list = (o && o.images.length) ? o.images : (prod(el.dataset.id).cover ? [prod(el.dataset.id).cover] : []);
    return list.filter(function (im) { return !(el._gfBad && el._gfBad[im.path]); });
  }

  function showPhoto(el, index) {
    var list = livePhotos(el);
    var holder = el.querySelector(".card-img");
    var img = holder.querySelector("img");

    if (!list.length) {
      stopRotation(el);
      if (img) img.replaceWith(Object.assign(document.createElement("div"), { className: "noimg", textContent: "Sem fotografia" }));
      return;
    }

    index = ((index % list.length) + list.length) % list.length;
    el._gfPhoto = index;

    var p = prod(el.dataset.id);
    var noimg = holder.querySelector(".noimg");
    if (noimg) noimg.remove();
    if (!img) {
      img = document.createElement("img");
      holder.appendChild(img);
    }

    var url = G.imgUrl(list[index].path);
    if (img.getAttribute("src") !== url) img.src = url;
    img.alt = p.name + (el._gfColor ? " - " + el._gfColor : "");
  }

  function startRotation(el) {
    stopRotation(el);
    if (livePhotos(el).length < 2) return;
    el._gfTimer = window.setInterval(function () {
      if (document.hidden || el.hidden || !el.isConnected) return;
      showPhoto(el, (el._gfPhoto || 0) + 1);
    }, ROTATE_MS);
  }

  function selectColor(el, color, fromTap) {
    var p = prod(el.dataset.id);
    var o = optionOf(p, color);
    if (!p || !o) return;

    /* Tocar na cor que já está activa passa à fotografia seguinte dessa cor. */
    if (fromTap && el._gfColor === color) {
      showPhoto(el, (el._gfPhoto || 0) + 1);
      startRotation(el);
      return;
    }

    el._gfColor = color;
    el._gfPhoto = 0;

    var v = viewOf(p, o);

    el.querySelectorAll(".sw-b").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.color === color));
    });

    var lbl = el.querySelector(".sel-color");
    if (lbl) lbl.textContent = v.color;

    el.querySelector(".p-name").textContent = v.name;

    var pv = el.querySelector(".p-var");
    pv.textContent = v.variant_name;
    pv.hidden = !v.variant_name;

    var pr = el.querySelector(".p-ref");
    pr.textContent = v.reference ? "Ref.: " + v.reference : "";
    pr.hidden = !v.reference;

    el.querySelector(".price").textContent = G.fmtMT(v.price);

    var sel = el.querySelector(".size");
    var keep = sel ? sel.value : "";
    el.querySelector(".size-box").innerHTML = sizesHtml(v, v.sizes.indexOf(keep) >= 0 ? keep : "");

    el.querySelector(".stock-line").hidden = v.available;
    var add = el.querySelector(".add");
    add.disabled = !v.available;
    add.textContent = v.available ? "Adicionar" : "Indisponível";

    el.querySelector(".msg-line").textContent = "";

    showPhoto(el, 0);
    startRotation(el);
  }

  function initCards() {
    document.querySelectorAll("#grid .card").forEach(function (el, n) {
      var p = prod(el.dataset.id);
      if (!p) return;

      var o = G.defaultOption(p.options);
      el._gfColor = o ? o.color : "";
      el._gfPhoto = 0;
      el._gfBad = {};

      /* Pré-carregar as fotografias do produto */
      p.options.forEach(function (c) {
        c.images.forEach(function (im) { var pre = new Image(); pre.src = G.imgUrl(im.path); });
      });

      /* Início desfasado para os cartões não trocarem todos ao mesmo tempo */
      el._gfStart = window.setTimeout(function () { startRotation(el); }, (n % 6) * 350);
    });
  }

  /* Fotografia que falhou a carregar: salta para a seguinte e nunca deixa o cartão em branco. */
  function onImageError(e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG") return;

    var el = img.closest("#grid .card");
    if (!el) return;

    var p = prod(el.dataset.id);
    var o = optionOf(p, el._gfColor);
    var pool = (o && o.images.length) ? o.images : (p.cover ? [p.cover] : []);
    var failed = pool.find(function (im) { return G.imgUrl(im.path) === img.src; });
    if (!failed) return;

    el._gfBad[failed.path] = true;
    showPhoto(el, 0);
    startRotation(el);
  }

  /* ---------- Filtros e pesquisa ---------- */

  function applyFilter() {
    var q = G.norm(query), shown = 0;

    document.querySelectorAll(".card").forEach(function (el) {
      var p = prod(el.dataset.id);

      var okCat = filter === "all" ||
        (filter === "novo" ? p.is_new : p.category_slug === filter);

      var okColor = !colorFilter || p.options.some(function (o) {
        return o.color === colorFilter;
      });

      var hay = [p.name, catName(p.category_slug), p.reference || ""]
        .concat(p.options.map(function (o) { return o.variant_name + " " + o.reference + " " + o.color; }))
        .map(G.norm).join(" ");

      var okQ = !q || hay.indexOf(q) >= 0;

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
        return p.options.some(function (o) {
          return o.color === color;
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

  /* ---------- Encomenda (sacola) ----------
     Cada linha guarda a variante escolhida: produto + cor + tamanho. Duas cores do mesmo
     produto são sempre linhas separadas. Preço, nome, referência e disponibilidade
     são revalidados com os dados actuais sempre que a página abre. */

  function syncCart() {
    cart = cart.filter(function (it) {
      var p = prod(it.pid);
      if (!p) return false;

      var o = it.color ? optionOf(p, it.color) : null;
      if (it.color && !o) return false;

      var v = viewOf(p, o);
      if (!v.available) return false;
      if (it.size && v.sizes.indexOf(it.size) < 0) return false;

      it.name = p.name;
      it.variant_name = v.variant_name;
      it.reference = v.reference;
      it.price = Number(v.price);
      it.category_slug = p.category_slug;
      it.category_name = catName(p.category_slug);
      it.qty = Math.max(1, Math.min(99, Number(it.qty) || 1));

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
            "</span>" +
            (it.variant_name ? "<span>Variante: " + esc(it.variant_name) + "</span>" : "") +
            (it.reference ? "<span>Referência: " + esc(it.reference) + "</span>" : "") +
            (it.color ? "<span>Cor: " + esc(it.color) + "</span>" : "") +
            (it.size ? "<span>Tamanho: " + esc(it.size) + "</span>" : "") +
            "<span>Preço unitário: " + G.fmtMT(it.price) + "</span>" +
            "<span>Quantidade: " + it.qty + "</span>" +
            "<span><b>Subtotal: " + G.fmtMT(it.price * it.qty) +
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

    var color = el._gfColor || "";
    var o = color ? optionOf(p, color) : null;
    var v = viewOf(p, o);

    if (!v.available) {
      say("Esta opção está indisponível.");
      return;
    }

    var sel = el.querySelector(".size");
    var size = sel ? sel.value : "";

    if (v.sizes.length && !size) {
      say("Escolhe o tamanho.");
      if (sel) sel.focus();
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
        vid: v.variant_id || "",
        name: p.name,
        variant_name: v.variant_name,
        reference: v.reference,
        category_slug: p.category_slug,
        category_name: catName(p.category_slug),
        price: Number(v.price),
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
      selectColor(el, sw.dataset.color, true);
    } else if (e.target.closest(".add")) {
      addToCart(el);
    }
  });

  $("#grid").addEventListener("error", onImageError, true);

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

  document.querySelectorAll(".header-cart").forEach(function(el){el.addEventListener("click",function(e){e.preventDefault();toggleCart(true);});});
  if (window.location.hash === "#cart") { setTimeout(function(){toggleCart(true);},250); }
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
    var params = new URLSearchParams(location.search);
    query = params.get("search") || "";
    $("#q").value = query;
    if (params.get("filter") === "novo") filter = "novo";

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

    initCards();

  }).catch(function (e) {
    console.error(e);

    $("#status").textContent =
      "Não foi possível carregar o catálogo. Tenta novamente dentro de instantes.";

    $("#open-cart").hidden = true;
  });

})();
