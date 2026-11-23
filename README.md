# GROUPFUN (GF) — Website

Loja online em HTML, CSS e JavaScript simples (sem frameworks), pronta para GitHub Pages, com Supabase para produtos, fotografias e autenticação. Encomendas enviadas por WhatsApp.

## Estado actual (leia primeiro)

- **Verificado:** leitura dos nomes de fotografias, cores, categorias visíveis, mensagem de WhatsApp e cálculos (`node tests/logic.test.js`, 10 testes) e sintaxe de todos os scripts.
- **Ainda não verificado:** a ligação ao Supabase, o painel e o catálogo num navegador real. Não havia credenciais nem acesso à rede neste ambiente. Siga a lista "Testar depois de configurar" no fim.
- **Falta configurar:** `js/config.js` (URL e chave anon do Supabase), executar `supabase/schema.sql`, criar a conta do administrador.

## Estrutura

```
index.html  catalogo.html  contacto.html
admin/index.html           painel privado (/admin/)
css/style.css
js/config.js               <- único sítio com a configuração do Supabase
js/common.js               leitura de nomes, mensagem WhatsApp, carregamento de dados
js/home.js  js/catalog.js  js/admin.js
supabase/schema.sql        tabelas, RLS e Storage
tests/logic.test.js
```

## 1. Configurar o Supabase

1. Criar conta e um projecto em supabase.com.
2. **SQL Editor** > colar o conteúdo de `supabase/schema.sql` > Run (executar apenas uma vez).
3. **Authentication > Users > Add user**: email e palavra-passe do proprietário. Em Authentication > Providers, desactive novos registos (*Allow new users to sign up*) para ninguém mais criar contas.
4. Tornar essa conta administradora: no SQL Editor,
   `insert into public.admins (user_id) select id from auth.users where email = 'EMAIL_DO_PROPRIETARIO';`
5. **Project Settings > API**: copiar *Project URL* e a chave *anon public* para `js/config.js`.
   **Nunca** colocar a chave `service_role` nem palavras-passe em nenhum ficheiro do site.
6. **Authentication > URL Configuration**: em *Site URL* colocar o endereço do GitHub Pages.

### Estrutura da base de dados

| Tabela | Conteúdo |
|---|---|
| `categories` | slug, nome, singular, ordem (as 9 categorias pré-carregadas) |
| `products` | categoria, nome, preço (MT), `sizes` (lista), `is_active`, `is_new` |
| `product_images` | produto, **cor** (as 9 permitidas), caminho no Storage, ordem |
| `site_images` | `kind` = `hero` ou `news`, caminho, ordem (máx. 3 por tipo, imposto por trigger) |
| `admins` | utilizadores com permissão de gestão |

Bucket de Storage: `gf-media` (público para leitura; só administradores escrevem; máx. 5 MB por ficheiro; JPEG/PNG/WebP).

### Segurança (RLS)

- Visitantes: só `select` em produtos **activos**, suas fotografias, categorias e imagens da página inicial.
- Administradores (tabela `admins`): inserir, editar e apagar em todas as tabelas e no bucket.
- A chave *anon* é pública por desenho; quem protege os dados são as políticas RLS. O painel em `/admin/` não é secreto, mas sem conta de administrador não permite ler nem alterar nada privado.

## 2. Publicar no GitHub Pages

1. Criar um repositório no GitHub e enviar **todo o conteúdo desta pasta** (com `index.html` na raiz).
2. Repositório > **Settings > Pages** > *Deploy from a branch* > `main` / `(root)` > Save.
3. O site fica em `https://UTILIZADOR.github.io/REPOSITORIO/`. Todos os links são relativos, por isso funciona nesse subcaminho.
4. As alterações feitas no painel aparecem no site sem nova publicação, porque os dados vêm do Supabase.

## 3. Como o administrador usa o painel

Abrir `.../admin/` e entrar com email e palavra-passe.

- **Produtos > Novo produto:** nome, categoria, preço, tamanhos (ex.: `S, M, L, XL`; vazio = sem selector de tamanho), "Visível no site", "Novidade". Guardar. Depois podem adicionar fotografias escolhendo a **cor** e os ficheiros (podem ser várias por cor).
- **Editar / Ocultar / Novidade / Eliminar:** botões em cada linha. Eliminar apaga também as fotografias.
- **Importar fotografias:** ver abaixo. Cria produtos e fotografias de uma vez.
- **Página inicial:** até 3 imagens de destaque e até 3 de novidades. Sem imagens, a secção desaparece do site.
- As fotografias são reduzidas automaticamente para 1600 px antes do envio.
- Uma categoria só aparece no site (menu do catálogo, filtros e página inicial) quando tem pelo menos um produto visível.
- Produtos marcados como novidade mostram a etiqueta "Novo" e aparecem no filtro "Novidades" do catálogo. A secção "Novidades" da página inicial usa as imagens da secção própria do painel.

### Nomes de fotografias

`Modelo-cor-Nome do produto-PreçoMt.jpg`, por exemplo `Camisa1-branca-Anjo malvado-500Mt.jpg`.

- **Modelo:** categoria no singular ou plural, com número opcional (`Camisa1`, `Polo`, `Calca2`, `Blusao`, `Cropped`).
- **Cor:** Preto, Branco, Vermelho, Castanho, Cinzento, Violeta, Creme, Verde, Rosa (maiúsculas/minúsculas e feminino aceites: `preta`, `BRANCA`).
- **Nome:** pode ter espaços e hífenes.
- **Preço:** sempre o último elemento (`500Mt`, `1200mt`, `99,5Mt`).
- Ficheiros inválidos aparecem com o motivo na pré-visualização e não são importados.
- Fotografias com o mesmo nome de produto e categoria juntam-se ao mesmo produto (uma cor por ficheiro).
- O GitHub Pages não lista pastas; por isso as fotografias ficam no Supabase Storage e o painel é quem as lê e regista.

## Encomendas pelo WhatsApp

Mensagem gerada (número `258853390226`), sem cumprimentos:

```
Camisa
Camisa-Anjo malvado
Preço-500 MT
Cor-Branco
Tamanho-M
Quantidade-1
Total-500 MT

Total geral-500 MT
```

Vários produtos aparecem separados por linha em branco. Com a encomenda vazia o botão fica desactivado.

## Testar depois de configurar

1. Abrir o site: com a loja vazia, o catálogo mostra "Ainda não há produtos", a página inicial não mostra novidades nem categorias.
2. Entrar no painel; criar um produto, adicionar fotografias de duas cores.
3. Confirmar no site: categoria aparece; cores só as do produto; a foto muda com a cor; tamanhos só os definidos.
4. Adicionar à encomenda, remover, enviar para o WhatsApp e conferir a mensagem.
5. Ocultar o produto: a categoria deve desaparecer.
6. Sem sessão, confirmar que o painel não carrega dados privados.
7. Testar em Android, iPhone e computador.
