
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
    $("#app").hidden = false;

    // Criar boas-vindas
    var welcome = document.getElementById("welcome-gf");

    if (!welcome) {
      welcome = document.createElement("div");
      welcome.id = "welcome-gf";

      var name = document.createElement("span");
      name.textContent = "Kelven";

      welcome.appendChild(name);
      document.body.appendChild(welcome);
    } else if (welcome.parentElement !== document.body) {
      document.body.appendChild(welcome);
    }

        
    // Ecrã de boas-vindas em ecrã inteiro
    Object.assign(welcome.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      minWidth: "100%",
      minHeight: "100vh",
      margin: "0",
      padding: "0",
      boxSizing: "border-box",
      transform: "none",
      borderRadius: "0",
      zIndex: "2147483647",
      background: "#000",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden"
    });

    var welcomeName = welcome.querySelector("span");

    welcomeName.style.cssText =
      "font-family:Archivo,sans-serif;" +
      "font-size:clamp(28px,8vw,48px);" +
      "font-weight:800;" +
      "letter-spacing:4px;" +
      "color:#fff;" +
      "text-align:center;";



    welcome.querySelector("span").style.cssText =
      "font-size:32px;" +
      "font-weight:700;" +
      "letter-spacing:4px;" +
      "color:#fff;";

    try {
      await refresh();
    } catch (err) {
      welcome.style.display = "none";
      $("#app").hidden = false;
      fail(err, "Erro ao carregar painel");
      return;
    }

    await new Promise(function (resolve) {
      setTimeout(resolve, 2300);
    });

    welcome.style.display = "none";
    $("#app").hidden = false;
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

      sb.from("site_images").select("*").order("sort")
    ]);

    for (var i = 0; i < r.length; i++) {
      if (r[i].error) {
        throw r[i].error;
      }
    }

    cats = r[0].data || [];
    siteImgs = r[2].data || [];

    products = (r[1].data || []).map(function (p) {
      p.product_images = p.product_images || [];

      p.product_images.sort(function (a, b) {
        return a.sort - b.sort ||
          a.created_at.localeCompare(b.created_at);
      });

      return p;
    });

    $("#p-cat").innerHTML = cats.map(function (c) {
      return '<option value="' + esc(c.slug) + '">' +
        esc(c.name) +
        "</option>";
    }).join("");

    $("#p-color").innerHTML = G.COLOR_LIST.map(function (c) {
      return "<option>" + esc(c) + "</option>";
    }).join("");

    renderProducts();
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
      var im = p.product_images[0];

      return "<tr><td>" +
        (im
          ? '<img src="' + esc(G.imgUrl(im.path)) + '" alt="">'
          : "") +
        "</td>" +

        "<td><b>" + esc(p.name) + "</b><br>" +
        '<span class="muted small">' +
        esc(catName(p.category_slug)) +
        (p.sizes.length
          ? " · " + esc(p.sizes.join(", "))
          : "") +
        "</span></td>" +

        "<td>" + G.fmtMT(p.price) + "</td>" +

        '<td><span class="' +
        (p.is_active ? "ok-t" : "err-t") +
        '">' +
        (p.is_active ? "Visível" : "Oculto") +
        "</span>" +
        (p.is_new ? "<br>Novidade" : "") +
        "</td>" +

        '<td><div class="acts" data-id="' + p.id + '">' +

        '<button class="btn btn-ghost" data-a="edit" type="button">Editar</button>' +

        '<button class="btn btn-ghost" data-a="toggle" type="button">' +
        (p.is_active ? "Ocultar" : "Mostrar") +
        "</button>" +

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

    if (a === "toggle" || a === "new") {
      var patch = a === "toggle"
        ? { is_active: !p.is_active }
        : { is_new: !p.is_new };

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

    $("#dlg-t").textContent = p
      ? "Editar produto"
      : "Novo produto";

    $("#p-name").value = p ? p.name : "";

    $("#p-cat").value = p
      ? p.category_slug
      : (cats[0] ? cats[0].slug : "");

    $("#p-price").value = p ? p.price : "";

    $("#p-sizes").value = p
      ? p.sizes.join(", ")
      : "";

    $("#p-active").checked = p ? p.is_active : true;
    $("#p-new").checked = p ? p.is_new : false;

    $("#p-imgs").hidden = !p;
    $("#p-note").hidden = !!p;

    if (p) renderThumbs(p);

    if (!$("#dlg").open) {
      $("#dlg").showModal();
    }
  }

  function renderThumbs(p) {
    $("#p-thumbs").innerHTML =
      p.product_images.length
        ? p.product_images.map(function (i) {
            return '<div class="thumb">' +
              '<img src="' + esc(G.imgUrl(i.path)) + '" alt="">' +
              "<span>" + esc(i.color) + "</span>" +
              '<button class="btn btn-danger" type="button" data-img="' +
              i.id +
              '">Remover</button>' +
              "</div>";
          }).join("")
        : '<p class="muted small">Sem fotografias.</p>';
  }

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

  /* ---------- Remover fotografias de produtos ---------- */

  $("#p-thumbs").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-img]");

    if (!b) return;

    var p = products.find(function (x) {
      return x.id === editingId;
    });

    if (!p) return;

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

    renderThumbs(
      products.find(function (x) {
        return x.id === editingId;
      })
    );
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

      $("#p-files").value = "";

      say(files.length + " fotografia(s) enviada(s).");

      await refresh();

      renderThumbs(
        products.find(function (x) {
          return x.id === editingId;
        })
      );

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
