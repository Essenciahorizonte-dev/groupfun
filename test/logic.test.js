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
  assert.strictEqual(G.canonColor("azul"), null);
});
t("categorias com acento e apóstrofo", () => {
  assert.strictEqual(G.parseFileName("Calca1-preta-X-300Mt.jpg", cats).category_slug, "calcas");
  assert.strictEqual(G.parseFileName("Blusao1-preta-X-300Mt.jpg", cats).category_slug, "blusoes");
  assert.strictEqual(G.parseFileName("Chapeu-preto-X-300Mt.jpg", cats).category_slug, "chapeus");
  assert.strictEqual(G.parseFileName("Cropped1-rosa-X-300Mt.jpg", cats).category_slug, "croppeds");
});
t("nomes inválidos", () => {
  assert.ok(!G.parseFileName("foto.jpg", cats).ok);
  assert.ok(!G.parseFileName("Camisa1-azul-X-500Mt.jpg", cats).ok);
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
console.log(n + " testes passaram");
