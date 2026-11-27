// Executar: node tests/logic.test.js
const assert = require("assert");
const G = require("../js/common.js");

const cats = [
  { slug: "camisas", name: "Camisas", singular: "Camisa" }, { slug: "polos", name: "Polos", singular: "Polo" },
  { slug: "calcas", name: "Calças", singular: "Calça" }, { slug: "camisolas", name: "Camisolas", singular: "Camisola" },
  { slug: "blusoes", name: "Blusões", singular: "Blusão" }, { slug: "jaquetas", name: "Jaquetas", singular: "Jaqueta" },
  { slug: "sacolas", name: "Sacolas", singular: "Sacola" }, { slug: "chapeus", name: "Chapéus", singular: "Chapéu" },
  { slug: "croppeds", name: "Cropped's", singular: "Cropped" }
];
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

t("exemplo do enunciado", () => {
  const r = G.parseFileName("Camisa1-branca-Anjo malvado-500Mt.jpg", cats);
  assert.ok(r.ok); assert.strictEqual(r.category_slug, "camisas"); assert.strictEqual(r.color, "Branco");
  assert.strictEqual(r.name, "Anjo malvado"); assert.strictEqual(r.price, 500); assert.strictEqual(r.model, "Camisa1");
});
t("nome com hífenes e espaços", () => {
  const r = G.parseFileName("Polo2-PRETO-Rei-do-Bairro 2-1200mt.PNG", cats);
  assert.ok(r.ok); assert.strictEqual(r.name, "Rei-do-Bairro 2"); assert.strictEqual(r.price, 1200); assert.strictEqual(r.color, "Preto");
});
t("cores em minúsculas, maiúsculas e feminino", () => {
  ["preto", "Preto", "PRETO", "preta", "branca", "Vermelha", "castanha", "cinzenta", "violeta", "creme", "verde", "rosa"]
    .forEach(c => assert.ok(G.canonColor(c), c));
  assert.strictEqual(G.canonColor("azul"), "Azul");
  assert.strictEqual(G.canonColor("laranja"), "Laranja");
  assert.strictEqual(G.canonColor("amarelo"), "Amarelo");
  assert.strictEqual(G.canonColor("azul-marinho"), "Azul-marinho");
});
t("categorias com acento e apóstrofo", () => {
  assert.strictEqual(G.parseFileName("Calca1-preta-X-300Mt.jpg", cats).category_slug, "calcas");
  assert.strictEqual(G.parseFileName("Blusao1-preta-X-300Mt.jpg", cats).category_slug, "blusoes");
  assert.strictEqual(G.parseFileName("Chapeu-preto-X-300Mt.jpg", cats).category_slug, "chapeus");
  assert.strictEqual(G.parseFileName("Cropped1-rosa-X-300Mt.jpg", cats).category_slug, "croppeds");
});
t("nomes inválidos", () => {
  assert.ok(!G.parseFileName("foto.jpg", cats).ok);
  assert.ok(G.parseFileName("Camisa1-azul-X-500Mt.jpg", cats).ok);
  assert.ok(!G.parseFileName("Meia1-preta-X-500Mt.jpg", cats).ok);
  assert.ok(!G.parseFileName("Camisa1-preta-X-abcMt.jpg", cats).ok);
  assert.ok(!G.parseFileName("Camisa1-preta--500Mt.jpg", cats).ok);
});
t("categorias vazias não aparecem", () => {
  const v = G.visibleCats(cats, [{ category_slug: "polos" }, { category_slug: "polos" }, { category_slug: "sacolas" }]);
  assert.deepStrictEqual(v.map(c => c.slug), ["polos", "sacolas"]); assert.strictEqual(v[0].count, 2);
  assert.strictEqual(G.visibleCats(cats, []).length, 0);
});
t("mensagem WhatsApp — um produto (formato do enunciado)", () => {
  const m = G.buildMessage([{ category_slug: "camisas", name: "Anjo malvado", price: 500, color: "Branco", size: "M", qty: 1 }], cats);
  assert.strictEqual(m, "Camisa\nCamisa-Anjo malvado\nPreço-500 MT\nCor-Branco\nTamanho-M\nQuantidade-1\nTotal-500 MT\n\nTotal geral-500 MT");
});
t("mensagem WhatsApp — vários produtos, sem tamanho, total", () => {
  const m = G.buildMessage([
    { category_slug: "camisas", name: "A", price: 500, color: "Branco", size: "M", qty: 2 },
    { category_slug: "sacolas", name: "B", price: 1250.5, color: "", size: "", qty: 1 }], cats);
  assert.ok(m.includes("Total-1 000 MT")); assert.ok(m.includes("Sacola\nSacola-B\nPreço-1 250,5 MT\nQuantidade-1"));
  assert.ok(!/Tamanho-\n|Cor-\n/.test(m)); assert.ok(m.endsWith("Total geral-2 250,5 MT"));
  assert.strictEqual(m.split("\n\n").length, 3);
});
t("encomenda vazia não gera mensagem", () => { assert.strictEqual(G.buildMessage([], cats), ""); });
t("URL do WhatsApp", () => {
  const u = G.whatsappUrl("Camisa\nA"); assert.ok(u.startsWith("https://wa.me/258853390226?text=Camisa%0AA"));
});


/* ---------- Variantes (v4) ---------- */
const img = (color, path, extra) => Object.assign({ color, path, sort: 0 }, extra || {});
const baseProd = () => ({
  name: "Camisa GROUP FUN", reference: "GF-CAM-001", price: 500, sizes: ["M", "L"], is_available: true,
  images: [img("Branco", "b1"), img("Preto", "p1"), img("Preto", "p2"), img("Vermelho", "v1")]
});

t("produto antigo (sem variantes): uma opção por cor das fotografias", () => {
  const o = G.productOptions(baseProd());
  assert.deepStrictEqual(o.map(x => x.color), ["Branco", "Preto", "Vermelho"]);
  assert.strictEqual(o[1].images.length, 2);
  assert.strictEqual(o[0].price, 500); assert.strictEqual(o[0].reference, "GF-CAM-001");
  assert.deepStrictEqual(o[0].sizes, ["M", "L"]); assert.ok(o[0].available);
});
t("variantes: campos em branco herdam do produto; preenchidos substituem", () => {
  const p = baseProd(); p.use_variants = true;
  p.variants = [
    { id: "1", color: "Branco", name: "Camisa Branca", reference: "GF-CAM-001-B", price: 550, sizes: ["S"], is_available: true, is_active: true, sort: 1 },
    { id: "2", color: "Preto", name: "", reference: null, price: null, sizes: [], is_available: true, is_active: true, sort: 2 },
    { id: "3", color: "Vermelho", is_available: false, is_active: true, sort: 3, sizes: [] }
  ];
  const o = G.productOptions(p);
  assert.strictEqual(o.length, 3);
  assert.strictEqual(o[0].variant_name, "Camisa Branca"); assert.strictEqual(o[0].reference, "GF-CAM-001-B");
  assert.strictEqual(o[0].price, 550); assert.deepStrictEqual(o[0].sizes, ["S"]);
  assert.strictEqual(o[1].variant_name, ""); assert.strictEqual(o[1].reference, "GF-CAM-001");
  assert.strictEqual(o[1].price, 500); assert.deepStrictEqual(o[1].sizes, ["M", "L"]); assert.strictEqual(o[1].images.length, 2);
  assert.strictEqual(o[2].available, false);
  assert.strictEqual(G.defaultOption(o).color, "Branco");
});
t("variantes: preço 0 é respeitado, ocultas não aparecem, cores sem variante são ignoradas", () => {
  const p = baseProd(); p.use_variants = true;
  p.variants = [
    { id: "1", color: "Branco", price: 0, sizes: [], is_available: true, is_active: true, sort: 1 },
    { id: "2", color: "Preto", sizes: [], is_available: true, is_active: false, sort: 2 }
  ];
  const o = G.productOptions(p);
  assert.deepStrictEqual(o.map(x => x.color), ["Branco"]); assert.strictEqual(o[0].price, 0);
});
t("fotografias desactivadas não contam; produto indisponível bloqueia todas as variantes", () => {
  const p = baseProd(); p.images[0].is_active = false; p.is_available = false;
  const o = G.productOptions(p);
  assert.deepStrictEqual(o.map(x => x.color), ["Preto", "Vermelho"]); assert.ok(o.every(x => !x.available));
});
t("use_variants sem variantes cai no comportamento antigo", () => {
  const p = baseProd(); p.use_variants = true; p.variants = [];
  assert.strictEqual(G.productOptions(p).length, 3);
});
t("mensagem WhatsApp com variante e referência", () => {
  const m = G.buildMessage([{ category_slug: "camisas", name: "Camisa GROUP FUN", variant_name: "Camisa Branca", reference: "GF-CAM-001-B", price: 550, color: "Branco", size: "M", qty: 2 }], cats);
  assert.strictEqual(m, "Camisa\nCamisa-Camisa GROUP FUN\nVariante-Camisa Branca\nReferência-GF-CAM-001-B\nPreço-550 MT\nCor-Branco\nTamanho-M\nQuantidade-2\nTotal-1 100 MT\n\nTotal geral-1 100 MT");
});
t("duas cores do mesmo produto = duas linhas, total correto", () => {
  const m = G.buildMessage([
    { category_slug: "camisas", name: "X", price: 500, color: "Branco", size: "M", qty: 1 },
    { category_slug: "camisas", name: "X", price: 550, color: "Preto", size: "M", qty: 2 }], cats);
  assert.strictEqual(m.split("\n\n").length, 3); assert.ok(m.endsWith("Total geral-1 600 MT"));
});
console.log(n + " testes passaram");
