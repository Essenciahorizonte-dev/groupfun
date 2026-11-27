
/* GROUPFUN — Painel administrativo
   A segurança real está nas políticas RLS do Supabase.
*/
(function () {
  "use strict";

  var G = window.GF;
  var sb = G.sb;
  var C = G.C;
  var esc = G.esc;

  var $ = function (s) {
    return document.querySelector(s);
  };

  var cats = [];
  var products = [];
  var siteImgs = [];
  var editingId = null;
  var importRows = [];
  var variants = [];
  var V4 = false;               /* true quando upgrade-v4.sql já foi executado */
  var editingVariantId = null;

  var parseSizes = function (txt) {
    var seen = {};
    return String(txt || "").split(/[,;\s]+/).map(function (x) {
      return x.trim().toUpperCase();
    }).filter(function (x) {
      if (!x || seen[x]) return false;
      seen[x] = 1;
      return true;
    });
  };

  /* ---------- Mensagens ---------- */

  function say(t, err) {
    var e = $("#msg");
    e.textContent = t;
    e.className = "msg " + (err ? "err" : "ok");
    e.hidden = !t;

    if (t) {
      window.scrollTo(0, 0);

      setTimeout(function () {
        if (e.textContent === t) e.hidden = true;
      }, 7000);
    }
  }

  function fail(e, ctx) {
    console.error(ctx, e);
    say(
      (ctx ? ctx + ": " : "") +
      (e && e.message ? e.message : e),
      true
    );
  }

  /* ---------- Sessão ---------- */

  async function boot() {
    if (!sb) {
      $("#cfg").hidden = false;
      return;
    }

    var s = await sb.auth.getSession();

    if (s.error) throw s.error;

    if (s.data.session) {
      await enter(s.data.session.user);
    } else {
      $("#login").hidden = false;
      $("#app").hidden = true;
    }
  }

  /* ---------- Entrada do administrador ---------- */

  async function enter(user) {
    var r = await sb.from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (r.error) {
      console.error("Erro ao verificar a tabela admins:", r.error);
      await sb.auth.signOut();
      $("#login").hidden = false;
      $("#app").hidden = true;
      $("#email").value = user.email || $("#email").value;
      say("A autenticação foi aceite, mas não foi possível confirmar a permissão de administrador: " + r.error.message, true);
      return;
    }

    if (!r.data) {
      await sb.auth.signOut();
      $("#login").hidden = false;
      $("#app").hidden = true;
      $("#email").value = user.email || $("#email").value;
      say("A senha está correcta, mas esta conta ainda não está registada como administradora. Confirma o UID na tabela public.admins.", true);
      return;
    }

    $("#login").hidden = true;

    // Boas-vindas: ecrã inteiro, 2.6 segundos
    var welcome = showWelcome("Kelven");
    var started = Date.now();

    try {
      await refresh();
    } catch (err) {
      removeWelcome(welcome);
      $("#app").hidden = false;
      fail(err, "Erro ao carregar painel");
      return;
    }

    // Conta os 2.6s desde o início das boas-vindas (o carregamento já conta)
    var left = WELCOME_MS - (Date.now() - started);
    if (left > 0) {
      await new Promise(function (resolve) {
        setTimeout(resolve, left);
      });
    }

    removeWelcome(welcome);
    $("#app").hidden = false;
  }

  /* ---------- Boas-vindas ---------- */

  var WELCOME_MS = 2600;

  function showWelcome(nome) {
    // remove qualquer versão anterior (evita duplicados)
    var old = document.querySelectorAll("#gf-bv, #welcome-gf");
    for (var i = 0; i < old.length; i++) {
      if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    }

    var box = document.createElement("div");
    box.id = "gf-bv";
    box.setAttribute("role", "status");

    var hi = document.createElement("p");
    hi.className = "gf-bv-hi";
    hi.textContent = "Bem-vindo";

    var nm = document.createElement("h2");
    nm.className = "gf-bv-name";
    nm.textContent = String(nome).toUpperCase();

    var sub = document.createElement("p");
    sub.className = "gf-bv-sub";
    sub.textContent = "GROUPFUN \u00b7 GEST\u00c3O DA LOJA";

    box.appendChild(hi);
    box.appendChild(nm);
    box.appendChild(sub);

    // sempre directamente no <body>, fora de qualquer contentor escondido
    document.body.appendChild(box);
    document.documentElement.classList.add("gf-bv-lock");
    window.scrollTo(0, 0);
    return box;
  }

  function removeWelcome(box) {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    document.documentElement.classList.remove("gf-bv-lock");
  }

  /* ---------- Login ---------- */


/* ---------- Login corrigido ---------- */

$("#login").addEventListener("submit", async function (e) {
  e.preventDefault();

  var email = $("#email").value.trim();
  var password = $("#pass").value;
  var btn = $("#login").querySelector('button[type="submit"]');

  if (!email || !password) {
    return say("Preenche o email e a palavra-passe.", true);
  }

  btn.disabled = true;
  btn.textContent = "A verificar...";

  try {
    var r = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (r.error) {
      console.error("ERRO DE LOGIN:", r.error);
      throw r.error;
    }

    // Mantém o email preenchido
    $("#email").value = email;
    $("#pass").value = "";

    await enter(r.data.user);

  } catch (err) {
    console.error("ERRO COMPLETO:", err);

    $("#email").value = email;
    say(
      "Não foi possível entrar: " +
      (err.message || String(err)),
      true
    );

  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
});

  /* ---------- Terminar sessão ---------- */

  $("#logout").addEventListener("click", async function () {
    await sb.auth.signOut();

    $("#app").hidden = true;
    $("#login").hidden = false;
  });

  /* ---------- Dados ---------- */

  async function refresh() {
    var r = await Promise.all([
      sb.from("categories").select("*").order("sort"),

      sb.from("products")
        .select("*, product_images(*)")
        .order("created_at", { ascending: false }),

      sb.from("site_images").select("*").order("sort"),

      sb.from("product_variants").select("*").order("sort")
    ]);

    for (var i = 0; i < 3; i++) {
      if (r[i].error) {
        throw r[i].error;
      }
    }

    cats = r[0].data || [];
    siteImgs = r[2].data || [];
    variants = r[3].error ? [] : (r[3].data || []);

    var rawProducts = r[1].data || [];
    V4 = !r[3].error && (!rawProducts.length || ("use_variants" in rawProducts[0]));
    $("#v4-warn").hidden = V4;

    products = rawProducts.map(function (p) {
      p.product_images = p.product_images || [];

      p.product_images.sort(function (a, b) {
        return a.sort - b.sort ||
          a.created_at.localeCompare(b.created_at);
      });

      p.sizes = p.sizes || [];
      p.variants = variants.filter(function (v) {
        return v.product_id === p.id;
      });

      return p;
    }).sort(function (a, b) {
      return (Number(a.sort) || 0) - (Number(b.sort) || 0);
    });

    $("#p-cat").innerHTML = cats.map(function (c) {
      return '<option value="' + esc(c.slug) + '">' +
        esc(c.name) +
        "</option>";
    }).join("");

    var colorOpts = G.COLOR_LIST.map(function (c) {
      return "<option>" + esc(c) + "</option>";
    }).join("");

    var keepCi = $("#ci-color").value;
    $("#p-color").innerHTML = colorOpts;
    $("#v-color").innerHTML = colorOpts;
    $("#ci-color").innerHTML = colorOpts;
    if (keepCi) $("#ci-color").value = keepCi;

    renderProducts();
    renderImageCenter();
    renderSite();
  }

  var catName = function (s) {
    var c = cats.find(function (x) {
      return x.slug === s;
    });

    return c ? c.name : s;
  };

  /* ---------- Imagens: enviar ---------- */

  async function upload(file, folder) {
    var ext = (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";

    var path = folder + "/" + crypto.randomUUID() + "." + ext;

    var r = await sb.storage.from(C.BUCKET).upload(
      path,
      file,
      {
        contentType: file.type || "application/octet-stream",
        cacheControl: "31536000",
        upsert: false
      }
    );

    if (r.error) throw r.error;

    return path;
  }

  async function removeFiles(paths) {
    if (paths.length) {
      await sb.storage.from(C.BUCKET).remove(paths);
    }
  }

  /* ---------- Produtos ---------- */

  function renderProducts() {
    $("#prod-empty").hidden = products.length > 0;

    $("#prod-rows").innerHTML = products.map(function (p) {
      var im = p.product_images.filter(function (i) {
        return i.is_active !== false;
      })[0] || p.product_images[0];

      var avail = p.is_available !== false;

      return "<tr><td>" +
        (im
          ? '<img src="' + esc(G.imgUrl(im.path)) + '" alt="">'
          : "") +
        "</td>" +

        "<td><b>" + esc(p.name) + "</b>" +
        (p.reference ? ' <span class="muted small">(' + esc(p.reference) + ")</span>" : "") +
        "<br>" +
        '<span class="muted small">' +
        esc(catName(p.category_slug)) +
        (p.sizes.length
          ? " · " + esc(p.sizes.join(", "))
          : "") +
        (p.use_variants
          ? " · Modo B: " + p.variants.length + " variante(s)"
          : (V4 ? " · Modo A" : "")) +
        (Number(p.sort) ? " · Ordem " + Number(p.sort) : "") +
        "</span></td>" +

        "<td>" + G.fmtMT(p.price) + "</td>" +

        '<td><span class="' +
        (p.is_active ? "ok-t" : "err-t") +
        '">' +
        (p.is_active ? "Visível" : "Oculto") +
        "</span>" +
        (avail ? "" : '<br><span class="err-t">Indisponível</span>') +
        (p.is_new ? "<br>Novidade" : "") +
        "</td>" +

        '<td><div class="acts" data-id="' + p.id + '">' +

        '<button class="btn btn-ghost" data-a="edit" type="button">Editar</button>' +

        '<button class="btn btn-ghost" data-a="toggle" type="button">' +
        (p.is_active ? "Ocultar" : "Mostrar") +
        "</button>" +

        (V4
          ? '<button class="btn btn-ghost" data-a="avail" type="button">' +
            (avail ? "Marcar indisponível" : "Marcar disponível") +
            "</button>"
          : "") +

        '<button class="btn btn-ghost" data-a="new" type="button">' +
        (p.is_new ? "Tirar novidade" : "Novidade") +
        "</button>" +

        '<button class="btn btn-danger" data-a="del" type="button">Eliminar</button>' +

        "</div></td></tr>";
    }).join("");
  }

  $("#prod-rows").addEventListener("click", async function (e) {
    var b = e.target.closest("button[data-a]");

    if (!b) return;

    var p = products.find(function (x) {
      return x.id === b.parentNode.dataset.id;
    });

    if (!p) return;

    var a = b.dataset.a;

    if (a === "edit") {
      return openEditor(p);
    }

    if (a === "toggle" || a === "new" || a === "avail") {
      var patch = a === "toggle"
        ? { is_active: !p.is_active }
        : (a === "avail"
          ? { is_available: p.is_available === false }
          : { is_new: !p.is_new });

      var r = await sb.from("products")
        .update(patch)
        .eq("id", p.id);

      if (r.error) {
        return fail(r.error, "Erro ao actualizar");
      }

      return refresh().catch(function (err) {
        fail(err, "Erro ao actualizar painel");
      });
    }

    if (a === "del") {
      if (!confirm(
        'Eliminar "' + p.name +
        '" e todas as suas fotografias? Esta acção não pode ser desfeita.'
      )) return;

      var paths = p.product_images.map(function (i) {
        return i.path;
      });

      var d = await sb.from("products")
        .delete()
        .eq("id", p.id);

      if (d.error) {
        return fail(d.error, "Erro ao eliminar");
      }

      await removeFiles(paths);

      say("Produto eliminado.");

      refresh().catch(function (err) {
        fail(err, "Erro ao actualizar painel");
      });
    }
  });

  /* ---------- Editor de produtos ---------- */

  function openEditor(p) {
    editingId = p ? p.id : null;
    editingVariantId = null;
    $("#v-form").hidden = true;

    $("#dlg-t").textContent = p
      ? "Editar produto"
      : "Novo produto";

    $("#p-name").value = p ? p.name : "";
    $("#p-ref").value = p && p.reference ? p.reference : "";
    $("#p-desc").value = p && p.description ? p.description : "";
    $("#p-sort").value = p && p.sort ? p.sort : 0;

    $("#p-cat").value = p
      ? p.category_slug
      : (cats[0] ? cats[0].slug : "");

    $("#p-price").value = p ? p.price : "";

    $("#p-sizes").value = p
      ? p.sizes.join(", ")
      : "";

    $("#p-mode").value = p && p.use_variants ? "B" : "A";

    $("#p-active").checked = p ? p.is_active : true;
    $("#p-avail").checked = p ? p.is_available !== false : true;
    $("#p-new").checked = p ? p.is_new : false;

    /* Campos novos só funcionam depois de executar upgrade-v4.sql */
    ["#p-ref", "#p-desc", "#p-sort", "#p-mode", "#p-avail"].forEach(function (id) {
      $(id).disabled = !V4;
    });

    $("#p-imgs").hidden = !p;
    $("#p-note").hidden = !!p;

    if (p) renderThumbs(p);
    updateVariantBox();

    if (!$("#dlg").open) {
      $("#dlg").showModal();
    }
  }

  function currentProduct() {
    return products.find(function (x) {
      return x.id === editingId;
    }) || null;
  }

  function renderThumbs(p) {
    $("#p-thumbs").innerHTML =
      p.product_images.length
        ? p.product_images.map(function (i) {
            var off = i.is_active === false;
            return '<div class="thumb">' +
              '<img src="' + esc(G.imgUrl(i.path)) + '" alt=""' +
              (off ? ' style="opacity:.4"' : "") + ">" +
              "<span>" + esc(i.color) + (off ? " · inactiva" : "") + "</span>" +
              (V4
                ? '<button class="btn btn-ghost" type="button" data-toggle-img="' + i.id + '">' +
                  (off ? "Activar" : "Desactivar") + "</button>"
                : "") +
              '<button class="btn btn-danger" type="button" data-img="' +
              i.id +
              '">Remover</button>' +
              "</div>";
          }).join("")
        : '<p class="muted small">Sem fotografias.</p>';
  }

  /* ---------- Variantes (Modo B) ---------- */

  function updateVariantBox() {
    var p = currentProduct();
    var show = !!p && V4 && $("#p-mode").value === "B";
    $("#v-box").hidden = !show;
    if (show) renderVariants(p);
  }

  function renderVariants(p) {
    var list = p.variants.slice().sort(function (a, b) {
      return (Number(a.sort) || 0) - (Number(b.sort) || 0);
    });

    var used = list.map(function (v) { return v.color; });
    var orphan = [];
    p.product_images.forEach(function (i) {
      if (used.indexOf(i.color) < 0 && orphan.indexOf(i.color) < 0) orphan.push(i.color);
    });

    $("#v-list").innerHTML =
      (list.length
        ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cor</th><th>Nome</th><th>Ref.</th><th>Preço</th><th>Tamanhos</th><th>Estado</th><th></th></tr></thead><tbody>' +
          list.map(function (v) {
            var photos = p.product_images.filter(function (i) { return i.color === v.color; }).length;
            return "<tr><td><b>" + esc(v.color) + "</b><br><span class=\"muted small\">" + photos + " foto(s)</span></td>" +
              "<td>" + (v.name ? esc(v.name) : '<span class="muted small">do produto</span>') + "</td>" +
              "<td>" + (v.reference ? esc(v.reference) : '<span class="muted small">do produto</span>') + "</td>" +
              "<td>" + (v.price !== null && v.price !== undefined && v.price !== "" ? G.fmtMT(v.price) : '<span class="muted small">base</span>') + "</td>" +
              "<td>" + (v.sizes && v.sizes.length ? esc(v.sizes.join(", ")) : '<span class="muted small">do produto</span>') + "</td>" +
              "<td>" + (v.is_active ? '<span class="ok-t">Visível</span>' : '<span class="err-t">Oculta</span>') +
              (v.is_available ? "" : '<br><span class="err-t">Indisponível</span>') + "</td>" +
              '<td><div class="acts" data-vid="' + v.id + '">' +
              '<button class="btn btn-ghost" type="button" data-va="edit">Editar</button>' +
              '<button class="btn btn-danger" type="button" data-va="del">Eliminar</button>' +
              "</div></td></tr>";
          }).join("") +
          "</tbody></table></div>"
        : '<p class="muted small">Ainda não há variantes. Usa "Nova variante" ou "Criar variantes a partir das cores das fotografias".</p>') +
      (orphan.length
        ? '<p class="err-t small">Cores com fotografias mas sem variante (não aparecem no catálogo no Modo B): ' + esc(orphan.join(", ")) + ".</p>"
        : "");
  }

  function openVariantForm(v) {
    var p = currentProduct();
    if (!p) return;

    editingVariantId = v ? v.id : null;
    $("#v-form-t").textContent = v ? "Editar variante" : "Nova variante";

    var used = p.variants.map(function (x) { return x.color; });
    var free = G.COLOR_LIST.filter(function (c) { return used.indexOf(c) < 0; });

    $("#v-color").value = v ? v.color : (free[0] || G.COLOR_LIST[0]);
    $("#v-color").disabled = !!v;       /* a cor identifica a variante: não muda depois de criada */
    $("#v-name").value = v && v.name ? v.name : "";
    $("#v-ref").value = v && v.reference ? v.reference : "";
    $("#v-price").value = v && v.price !== null && v.price !== undefined ? v.price : "";
    $("#v-sizes").value = v && v.sizes ? v.sizes.join(", ") : "";
    $("#v-avail").checked = v ? v.is_available !== false : true;
    $("#v-active").checked = v ? v.is_active !== false : true;
    $("#v-form").hidden = false;
    $("#v-name").focus();
  }

  async function ensureVariant(p, color) {
    /* Produto em Modo B: a cor de uma fotografia nova passa a ter variante automaticamente. */
    if (!V4 || !p || !p.use_variants) return;
    var exists = (p.variants || []).some(function (v) { return v.color === color; });
    if (exists) return;
    var next = (p.variants || []).reduce(function (m, v) { return Math.max(m, Number(v.sort) || 0); }, 0) + 1;
    var r = await sb.from("product_variants").insert({ product_id: p.id, color: color, sort: next });
    if (r.error && r.error.code !== "23505") throw r.error;
  }

  $("#p-mode").addEventListener("change", updateVariantBox);

  $("#v-add").addEventListener("click", function () {
    openVariantForm(null);
  });

  $("#v-cancel").addEventListener("click", function () {
    $("#v-form").hidden = true;
    editingVariantId = null;
  });

  $("#v-list").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-va]");
    if (!b) return;

    var p = currentProduct();
    if (!p) return;

    var v = p.variants.find(function (x) {
      return x.id === b.parentNode.dataset.vid;
    });
    if (!v) return;

    if (b.dataset.va === "edit") {
      return openVariantForm(v);
    }

    if (b.dataset.va === "del") {
      if (!confirm('Eliminar a variante "' + v.color + '"? As fotografias desta cor ficam guardadas no produto.')) return;

      var d = await sb.from("product_variants").delete().eq("id", v.id);
      if (d.error) return fail(d.error, "Erro ao eliminar variante");

      say("Variante eliminada.");
      await refresh();
      var again = currentProduct();
      if (again) { renderThumbs(again); updateVariantBox(); }
    }
  });

  $("#v-save").addEventListener("click", async function () {
    var p = currentProduct();
    if (!p) return;

    var priceTxt = String($("#v-price").value).trim().replace(",", ".");
    var price = priceTxt === "" ? null : Number(priceTxt);

    if (price !== null && !(price >= 0)) {
      return say("Preço da variante inválido.", true);
    }

    var row = {
      name: $("#v-name").value.trim() || null,
      reference: $("#v-ref").value.trim() || null,
      price: price,
      sizes: parseSizes($("#v-sizes").value),
      is_available: $("#v-avail").checked,
      is_active: $("#v-active").checked
    };

    var btn = this;
    btn.disabled = true;

    try {
      var r;

      if (editingVariantId) {
        r = await sb.from("product_variants").update(row).eq("id", editingVariantId);
      } else {
        row.product_id = p.id;
        row.color = $("#v-color").value;
        row.sort = p.variants.reduce(function (m, v) {
          return Math.max(m, Number(v.sort) || 0);
        }, 0) + 1;
        r = await sb.from("product_variants").insert(row);
      }

      if (r.error) {
        if (r.error.code === "23505") {
          throw new Error("Já existe uma variante com esta cor neste produto. Edita a existente.");
        }
        throw r.error;
      }

      say("Variante guardada.");
      $("#v-form").hidden = true;
      editingVariantId = null;

      await refresh();
      var again = currentProduct();
      if (again) { renderThumbs(again); updateVariantBox(); }

    } catch (err) {
      fail(err, "Erro ao guardar variante");
    } finally {
      btn.disabled = false;
    }
  });

  $("#v-auto").addEventListener("click", async function () {
    var p = currentProduct();
    if (!p) return;

    var used = p.variants.map(function (v) { return v.color; });
    var colors = [];
    p.product_images.forEach(function (i) {
      if (used.indexOf(i.color) < 0 && colors.indexOf(i.color) < 0) colors.push(i.color);
    });

    if (!colors.length) {
      return say("Todas as cores com fotografias já têm variante.");
    }

    var next = p.variants.reduce(function (m, v) { return Math.max(m, Number(v.sort) || 0); }, 0);

    var r = await sb.from("product_variants").insert(colors.map(function (c, i) {
      return { product_id: p.id, color: c, sort: next + i + 1 };
    }));

    if (r.error) return fail(r.error, "Erro ao criar variantes");

    say(colors.length + " variante(s) criada(s): " + colors.join(", ") + ". Guarda o produto em Modo B para as activar no catálogo.");

    await refresh();
    var again = currentProduct();
    if (again) { renderThumbs(again); updateVariantBox(); }
  });

  $("#new-prod").addEventListener("click", function () {
    openEditor(null);
  });

  $("#p-cancel").addEventListener("click", function () {
    $("#dlg").close();
  });

  $("#pform").addEventListener("submit", async function (e) {
    e.preventDefault();

    var price = Number(
      String($("#p-price").value).replace(",", ".")
    );

    if (!(price >= 0)) {
      return say("Preço inválido.", true);
    }

    var seen = {};

    var sizes = $("#p-sizes").value
      .split(/[,;\s]+/)
      .map(function (s) {
        return s.trim().toUpperCase();
      })
      .filter(function (s) {
        if (!s || seen[s]) return false;

        seen[s] = 1;
        return true;
      });

    var row = {
      name: $("#p-name").value.trim(),
      category_slug: $("#p-cat").value,
      price: price,
      sizes: sizes,
      is_active: $("#p-active").checked,
      is_new: $("#p-new").checked
    };

    if (V4) {
      row.reference = $("#p-ref").value.trim() || null;
      row.description = $("#p-desc").value.trim() || null;
      row.sort = parseInt($("#p-sort").value, 10) || 0;
      row.is_available = $("#p-avail").checked;
      row.use_variants = $("#p-mode").value === "B";
    }

    var r = editingId
      ? await sb.from("products")
          .update(row)
          .eq("id", editingId)
          .select()
          .single()
      : await sb.from("products")
          .insert(row)
          .select()
          .single();

    if (r.error) {
      return fail(r.error, "Erro ao guardar");
    }

    say("Produto guardado.");

    await refresh();

    openEditor(
      products.find(function (p) {
        return p.id === r.data.id;
      })
    );
  });

  /* ---------- Activar / remover fotografias de produtos ---------- */

  $("#p-thumbs").addEventListener("click", async function (e) {
    var t = e.target.closest("[data-toggle-img]");
    var b = e.target.closest("[data-img]");

    if (!t && !b) return;

    var p = currentProduct();

    if (!p) return;

    if (t) {
      var cur = p.product_images.find(function (i) {
        return i.id === t.dataset.toggleImg;
      });
      if (!cur) return;

      var u = await sb.from("product_images")
        .update({ is_active: cur.is_active === false })
        .eq("id", cur.id);

      if (u.error) return fail(u.error, "Erro ao actualizar fotografia");

      await refresh();
      var q = currentProduct();
      if (q) { renderThumbs(q); updateVariantBox(); }
      return;
    }

    var im = p.product_images.find(function (i) {
      return i.id === b.dataset.img;
    });

    if (!im || !confirm("Remover esta fotografia?")) return;

    var r = await sb.from("product_images")
      .delete()
      .eq("id", im.id);

    if (r.error) {
      return fail(r.error, "Erro ao remover");
    }

    await removeFiles([im.path]);
    await refresh();

    var again = currentProduct();
    if (again) { renderThumbs(again); updateVariantBox(); }
  });

  /* ---------- Enviar fotografias de produtos ---------- */

  $("#p-upload").addEventListener("click", async function () {
    var files = Array.prototype.slice.call($("#p-files").files);

    if (!files.length) {
      return say("Escolhe pelo menos uma fotografia.", true);
    }

    var btn = this;
    btn.disabled = true;

    try {
      var product = products.find(function (x) {
        return x.id === editingId;
      });

      if (!product) {
        throw new Error("Produto não encontrado.");
      }

      var color = $("#p-color").value;
      var base = product.product_images.length;

      for (var i = 0; i < files.length; i++) {
        var path = await upload(
          files[i],
          "products/" + editingId
        );

        var r = await sb.from("product_images").insert({
          product_id: editingId,
          color: color,
          path: path,
          sort: base + i
        });

        if (r.error) {
          await removeFiles([path]);
          throw r.error;
        }
      }

      await ensureVariant(product, color);

      $("#p-files").value = "";

      say(files.length + " fotografia(s) enviada(s).");

      await refresh();

      var afterUp = currentProduct();
      if (afterUp) { renderThumbs(afterUp); updateVariantBox(); }

    } catch (err) {
      fail(err, "Erro ao enviar");
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- Importar pelo nome do ficheiro ---------- */

  $("#imp-files").addEventListener("change", function () {
    importRows = Array.prototype.slice.call(this.files)
      .map(function (f) {
        var r = G.parseFileName(f.name, cats);
        r.fileObj = f;
        return r;
      });

    $("#imp-rows").innerHTML = importRows.map(function (r) {
      return "<tr>" +
        "<td>" + esc(r.file) + "</td>" +
        "<td>" + esc(r.category_name || "—") + "</td>" +
        "<td>" + esc(r.name || "—") + "</td>" +
        "<td>" + esc(r.color || "—") + "</td>" +
        "<td>" + (r.price > 0 ? G.fmtMT(r.price) : "—") + "</td>" +
        "<td>" +
        (r.ok
          ? '<span class="ok-t">Válido</span>'
          : '<span class="err-t">' +
            r.errors.map(esc).join("; ") +
            "</span>") +
        "</td></tr>";
    }).join("");

    $("#imp-out").hidden = !importRows.length;

    $("#imp-go").disabled = !importRows.some(function (r) {
      return r.ok;
    });
  });

  $("#imp-go").addEventListener("click", async function () {
    var valid = importRows.filter(function (r) {
      return r.ok;
    });

    var btn = this;
    var done = 0;

    btn.disabled = true;

    try {
      for (var i = 0; i < valid.length; i++) {
        var r = valid[i];

        var p = products.find(function (x) {
          return x.category_slug === r.category_slug &&
            G.norm(x.name) === G.norm(r.name);
        });

        if (!p) {
          var ins = await sb.from("products")
            .insert({
              category_slug: r.category_slug,
              name: r.name,
              price: r.price,
              sizes: [],
              is_active: true,
              is_new: false
            })
            .select("*, product_images(*)")
            .single();

          if (ins.error) throw ins.error;

          p = ins.data;
          p.product_images = p.product_images || [];
          products.push(p);
        }

        var path = await upload(
          r.fileObj,
          "products/" + p.id
        );

        var im = await sb.from("product_images").insert({
          product_id: p.id,
          color: r.color,
          path: path,
          sort: (p.product_images || []).length + done
        });

        if (im.error) {
          await removeFiles([path]);
          throw im.error;
        }

        await ensureVariant(p, r.color);

        done++;
      }

      say(
        done +
        ' fotografia(s) importada(s). Define os tamanhos em "Editar" quando necessário.'
      );

      $("#imp-files").value = "";
      $("#imp-out").hidden = true;
      importRows = [];

    } catch (err) {
      fail(
        err,
        "Importação interrompida após " +
        done +
        " fotografia(s)"
      );
    }

    await refresh();
    btn.disabled = false;
  });

  /* ---------- Centro de imagens ----------
     A fotografia fica associada ao PRODUTO e à COR escolhidos aqui.
     O nome do ficheiro é irrelevante. */

  function ciProduct() {
    var id = $("#ci-prod").value;
    return products.find(function (x) { return x.id === id; }) || null;
  }

  function colorLabel(p, color) {
    var v = (p.variants || []).find(function (x) { return x.color === color; });
    if (!v) return p.use_variants ? "sem variante" : "";
    var bits = [];
    if (v.name) bits.push(v.name);
    if (v.reference) bits.push("Ref. " + v.reference);
    if (v.is_active === false) bits.push("oculta");
    if (v.is_available === false) bits.push("indisponível");
    return bits.join(" · ") || "variante";
  }

  function renderImageCenter() {
    var sel = $("#ci-prod");
    var keep = sel.value;

    sel.innerHTML = products.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.name) +
        (p.reference ? " (" + esc(p.reference) + ")" : "") + "</option>";
    }).join("");

    if (keep && products.some(function (p) { return p.id === keep; })) sel.value = keep;

    renderImageGrid();

    $("#ci-summary").innerHTML = products.length
      ? products.map(function (p) {
          var groups = {};
          var order = [];
          (p.variants || []).forEach(function (v) { groups[v.color] = 0; order.push(v.color); });
          p.product_images.forEach(function (i) {
            if (!(i.color in groups)) { groups[i.color] = 0; order.push(i.color); }
            groups[i.color]++;
          });
          if (!order.length) {
            return "<tr><td>" + esc(p.name) + '</td><td colspan="2" class="muted small">Sem fotografias.</td></tr>';
          }
          return order.map(function (c, n) {
            var info = colorLabel(p, c);
            return "<tr><td>" + (n === 0 ? "<b>" + esc(p.name) + "</b>" : "") + "</td>" +
              "<td>" + esc(c) + (info ? ' <span class="muted small">(' + esc(info) + ")</span>" : "") + "</td>" +
              "<td>" + groups[c] + "</td></tr>";
          }).join("");
        }).join("")
      : '<tr><td colspan="3" class="muted">Ainda não há produtos.</td></tr>';
  }

  function renderImageGrid() {
    var box = $("#ci-grid");
    var p = ciProduct();

    if (!p) {
      box.innerHTML = '<p class="muted small">Cria primeiro um produto.</p>';
      return;
    }

    var order = (p.variants || []).slice().sort(function (a, b) {
      return (Number(a.sort) || 0) - (Number(b.sort) || 0);
    }).map(function (v) { return v.color; });

    p.product_images.forEach(function (i) {
      if (order.indexOf(i.color) < 0) order.push(i.color);
    });

    if (!order.length) {
      box.innerHTML = '<p class="muted small">Este produto ainda não tem fotografias.</p>';
      return;
    }

    box.innerHTML = order.map(function (c) {
      var imgs = p.product_images.filter(function (i) { return i.color === c; });
      var info = colorLabel(p, c);
      return '<div class="panel"><h3>' + esc(c) +
        (info ? ' <span class="muted small">— ' + esc(info) + "</span>" : "") +
        "</h3>" +
        (imgs.length
          ? '<div class="thumbs">' + imgs.map(function (i) {
              var off = i.is_active === false;
              return '<div class="thumb"><img src="' + esc(G.imgUrl(i.path)) + '" alt=""' +
                (off ? ' style="opacity:.4"' : "") + ">" +
                (off ? "<span>inactiva</span>" : "") +
                (V4
                  ? '<button class="btn btn-ghost" type="button" data-ci-toggle="' + i.id + '">' +
                    (off ? "Activar" : "Desactivar") + "</button>"
                  : "") +
                '<label class="btn btn-ghost" style="text-align:center;cursor:pointer">Substituir' +
                '<input type="file" accept="image/*" data-ci-replace="' + i.id + '" hidden></label>' +
                '<button class="btn btn-danger" type="button" data-ci-del="' + i.id + '">Remover</button></div>';
            }).join("") + "</div>"
          : '<p class="muted small">Sem fotografias nesta cor.</p>') +
        "</div>";
    }).join("");
  }

  $("#ci-prod").addEventListener("change", function () {
    var p = ciProduct();
    if (p && p.use_variants && p.variants.length) {
      $("#ci-color").value = p.variants[0].color;
    }
    renderImageGrid();
  });

  $("#ci-go").addEventListener("click", async function () {
    var p = ciProduct();
    var files = Array.prototype.slice.call($("#ci-files").files);
    var color = $("#ci-color").value;

    if (!p) return say("Escolhe o produto.", true);
    if (!files.length) return say("Escolhe pelo menos uma fotografia.", true);

    var replace = $("#ci-replace").checked;
    var old = p.product_images.filter(function (i) { return i.color === color; });

    if (replace && old.length &&
        !confirm("Substituir as " + old.length + " fotografia(s) de " + color + " em \"" + p.name + "\"?")) {
      return;
    }

    var btn = this;
    btn.disabled = true;

    var sent = [];

    try {
      var base = p.product_images.reduce(function (m, i) {
        return Math.max(m, Number(i.sort) || 0);
      }, -1) + 1;

      for (var i = 0; i < files.length; i++) {
        var path = await upload(files[i], "products/" + p.id);

        var ins = await sb.from("product_images").insert({
          product_id: p.id, color: color, path: path, sort: base + i
        }).select("id").single();

        if (ins.error) {
          await removeFiles([path]);
          throw ins.error;
        }

        sent.push({ id: ins.data.id, path: path });
      }

      await ensureVariant(p, color);

      /* Só remove as antigas depois de as novas estarem guardadas. */
      if (replace && old.length) {
        var del = await sb.from("product_images").delete().in("id", old.map(function (x) { return x.id; }));
        if (del.error) throw del.error;
        await removeFiles(old.map(function (x) { return x.path; }));
      }

      $("#ci-files").value = "";
      $("#ci-replace").checked = false;

      say(files.length + " fotografia(s) associada(s) a " + p.name + " · " + color + ".");
      await refresh();

    } catch (err) {
      fail(err, "Erro ao associar fotografias (enviadas: " + sent.length + ")");
      await refresh().catch(function () {});
    } finally {
      btn.disabled = false;
    }
  });

  $("#ci-grid").addEventListener("click", async function (e) {
    var p = ciProduct();
    if (!p) return;

    var t = e.target.closest("[data-ci-toggle]");
    var d = e.target.closest("[data-ci-del]");

    if (t) {
      var cur = p.product_images.find(function (i) { return i.id === t.dataset.ciToggle; });
      if (!cur) return;

      var u = await sb.from("product_images").update({ is_active: cur.is_active === false }).eq("id", cur.id);
      if (u.error) return fail(u.error, "Erro ao actualizar fotografia");

      say(cur.is_active === false ? "Fotografia activada." : "Fotografia desactivada.");
      return refresh().catch(function (err) { fail(err, "Erro ao actualizar painel"); });
    }

    if (d) {
      var im = p.product_images.find(function (i) { return i.id === d.dataset.ciDel; });
      if (!im || !confirm("Remover esta fotografia?")) return;

      var r = await sb.from("product_images").delete().eq("id", im.id);
      if (r.error) return fail(r.error, "Erro ao remover");

      await removeFiles([im.path]);
      say("Fotografia removida.");
      return refresh().catch(function (err) { fail(err, "Erro ao actualizar painel"); });
    }
  });

  $("#ci-grid").addEventListener("change", async function (e) {
    var inp = e.target.closest("[data-ci-replace]");
    if (!inp || !inp.files || !inp.files[0]) return;

    var p = ciProduct();
    if (!p) return;

    var im = p.product_images.find(function (i) { return i.id === inp.dataset.ciReplace; });
    if (!im) return;

    var newPath = null;

    try {
      newPath = await upload(inp.files[0], "products/" + p.id);

      var u = await sb.from("product_images").update({ path: newPath }).eq("id", im.id);
      if (u.error) throw u.error;

      await removeFiles([im.path]);   /* só depois de o registo apontar para a nova */

      say("Fotografia substituída.");
      await refresh();
    } catch (err) {
      if (newPath) await removeFiles([newPath]);
      fail(err, "Erro ao substituir");
    }
  });

  /* ---------- Identidade e imagens da página inicial ---------- */

  function renderSite() {
    var logo = siteImgs.filter(function (s) {
      return s.kind === "logo";
    })[0];

    $("#site-logo").innerHTML =
      '<div class="panel">' +
      "<h3>Logótipo</h3>" +

      (logo
        ? '<div class="logo-preview"><img src="' +
          esc(G.imgUrl(logo.path)) +
          '" alt="Logótipo actual"></div>'
        : '<p class="muted small">Espaço reservado para o logótipo.</p>') +

      '<label class="f"><span>' +
      (logo ? "Substituir logótipo" : "Adicionar logótipo") +
      '</span><input type="file" accept="image/*" data-up="logo"></label>' +

      (logo
        ? '<p><button class="btn btn-danger" type="button" data-del="' +
          logo.id +
          '">Remover logótipo</button></p>'
        : "") +

      "</div>";

    [
      [
        "hero",
        "Imagem de fundo",
        "Até 5 imagens. Fundo principal com rotação automática."
      ],
      [
        "highlight",
        "Destaques",
        "Até 5 imagens para a secção de destaques."
      ],
      [
        "reference",
        "Referências",
        "Até 5 imagens para a secção de referências."
      ],
      [
        "news",
        "Imagens de novidades",
        "Opcional: imagens de apoio. Os produtos marcados como novidade aparecem automaticamente na página inicial."
      ]
    ].forEach(function (k) {
      var list = siteImgs
        .filter(function (x) {
          return x.kind === k[0];
        })
        .sort(function (a, b) {
          return a.sort - b.sort;
        });

      $("#site-" + k[0]).innerHTML =
        '<div class="panel">' +
        "<h3>" + k[1] + " (" + list.length + "/5)</h3>" +
        '<p class="muted small">' + k[2] + "</p>" +

        '<div class="thumbs">' +

        list.map(function (i) {
          return '<div class="thumb">' +
            '<img src="' + esc(G.imgUrl(i.path)) + '" alt="">' +
            '<button class="btn btn-danger" type="button" data-del="' +
            i.id +
            '">Remover</button>' +
            "</div>";
        }).join("") +

        "</div>" +

        (list.length < 5
          ? '<p style="margin-top:1rem"><label class="f"><span>Adicionar imagem</span><input type="file" accept="image/*" data-up="' +
            k[0] +
            '"></label></p>'
          : '<p class="muted small">Limite de 5 imagens atingido.</p>') +

        "</div>";
    });
  }

  /* ---------- Remover imagens do site ---------- */

  $("#tab-site").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-del]");

    if (!b) return;

    var im = siteImgs.find(function (i) {
      return i.id === b.dataset.del;
    });

    if (!im || !confirm("Remover esta imagem?")) return;

    var r = await sb.from("site_images")
      .delete()
      .eq("id", im.id);

    if (r.error) {
      return fail(r.error, "Erro ao remover");
    }

    await removeFiles([im.path]);

    say("Imagem removida.");

    await refresh();
  });

  /* ---------- Adicionar imagens do site ---------- */

  $("#tab-site").addEventListener("change", async function (e) {
    var inp = e.target.closest("[data-up]");
    if (!inp || !inp.files || !inp.files[0]) return;

    var kind = inp.dataset.up;
    var old = siteImgs.filter(function (item) { return item.kind === kind; });
    if (kind !== "logo" && old.length >= 5) {
      return say("Limite de 5 imagens.", true);
    }

    var path = null;
    var insertedId = null;
    try {
      path = await upload(inp.files[0], "site/" + kind);
      var nextSort = old.length
        ? Math.max.apply(null, old.map(function (item) { return Number(item.sort) || 0; })) + 1
        : 0;

      var inserted = await sb.from("site_images")
        .insert({ kind: kind, path: path, sort: nextSort })
        .select("id")
        .single();
      if (inserted.error) throw inserted.error;
      insertedId = inserted.data.id;

      // Só apaga o logótipo antigo depois de confirmar o novo registo.
      if (kind === "logo" && old.length) {
        var removed = await sb.from("site_images").delete().eq("id", old[0].id);
        if (removed.error) throw removed.error;
        await removeFiles([old[0].path]);
      }

      say(kind === "logo" ? "Logótipo actualizado." : "Imagem adicionada.");
      inp.value = "";
      await refresh();
    } catch (err) {
      // Reverte o novo registo/ficheiro se a substituição não terminar.
      if (insertedId) await sb.from("site_images").delete().eq("id", insertedId);
      if (path) await removeFiles([path]);
      fail(err, "Erro ao enviar imagem");
    }
  });

  /* ---------- Separadores ---------- */

  document.querySelectorAll("[data-tab]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-tab]").forEach(function (x) {
        var active = x === b;

        x.classList.toggle("btn-ghost", !active);

        var section = $("#tab-" + x.dataset.tab);

        if (section) {
          section.hidden = !active;
        }
      });
    });
  });

  /* ---------- Iniciar painel ---------- */

  boot().catch(function (err) {
    console.error("Erro ao iniciar GROUPFUN:", err);
    fail(err, "Erro ao iniciar painel");
  });

})();
