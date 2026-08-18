# MIRACLE — Admin Dashboard Contract (v1)

Single source of truth for the back office. Every admin module, API endpoint and
public-site integration follows this file. French UI everywhere. Bright/light only.

## Architecture

Static site (unchanged for visitors) + Vercel serverless functions in `api/` +
Vercel Blob store `miracle-db` (public store) as database.

- Public site pages: unchanged shells; `js/store.js` now loads the catalog from
  `/api/products` (fallback: built-in array) and records orders on WhatsApp checkout.
- Admin SPA: `admin.html` (route `/admin` via vercel.json rewrite), `css/admin.css`,
  `js/admin/app.js` (shell) + one file per module in `js/admin/`.
- Sensitive blobs (orders, companies, settings) are AES-256-GCM encrypted at rest
  with a key derived from `SESSION_SECRET`. Products/journal are public data.

## Blob layout (versioned, immutable writes)

Vercel Blob **overwrites** are eventually consistent (stale reads up to ~60 s),
so every save creates a NEW immutable blob `<doc>/v-<millis>-<rand>.json`;
reads take the highest version (cross-checked against a per-instance memory
cache) and each write prunes all but the newest 3 versions (mini backup).

| doc prefix              | content                          | encrypted |
|-------------------------|----------------------------------|-----------|
| `data/products/v-…`     | array of products                | no        |
| `data/journal/v-…`      | array of journal articles        | no        |
| `data/companies/v-…`    | array of delivery companies      | yes       |
| `data/orders/<id>/v-…`  | one order document per id        | yes       |
| `data/settings/v-…`     | `{ passwordHash }`               | yes       |
| `img/…`                 | uploaded images (public URLs)    | no        |

## Data shapes

**Product** — superset of the public catalog shape (site reads the same object):
```js
{ id, title, color, price, type, cats:[], sizes:[], colors:[], img, img2, gallery:[],
  flags:[],            // "best" | "new"
  composition,
  active: true,        // false ⇒ hidden from the public site
  stock: null | { "<size>": int },  // null ⇒ stock not tracked
  cost: null | number, // prix de revient (never sent to the public site)
  createdAt, updatedAt }
```
`img`/`img2`/`gallery` values are either relative `assets/...` paths (original
photos) or absolute Blob URLs (uploads). Use them as-is in `src`.

**Order**
```js
{ id: "CMD-<yymmdd>-<4hex>", createdAt, updatedAt,
  source: "site" | "manuelle" | "instagram" | "whatsapp",
  customer: { name, phone, city, address, note },   // all optional strings
  items: [{ id, title, color, size, qty, price }],  // price = unit price at order time
  total: number,
  status: "nouvelle"|"confirmee"|"en_preparation"|"expediee"|"livree"|"annulee"|"retour",
  delivery: { companyId, companyName, personName, personPhone, fee: null|number, note },
  paid: false|true,     // encaissé à la livraison
  stockApplied: bool,   // server-managed — do not set from UI
  notes: "",
  history: [{ at, status }] }
```
Stock side-effects (server-side, in PUT /api/orders): entering any of
`confirmee|en_preparation|expediee|livree` for the first time decrements tracked
stock; entering `annulee|retour` after that restores it.

**Delivery company**
```js
{ id, name, contactName, email, phone,
  persons: [{ name, phone }],   // livreurs
  zones, priceNote, notes, active: true, createdAt, updatedAt }
```

**Journal article**
```js
{ id, title, tag, date: "2026-08-18", img, href: null|string,
  excerpt, body, active: true, createdAt, updatedAt }
```

## API endpoints (all JSON; auth = `Authorization: Bearer <token>`)

| endpoint | public | auth |
|---|---|---|
| `POST /api/auth` | `{action:"login", password}` → `{token, exp}` | `{action:"change", current, next}` → `{ok}` |
| `GET /api/products` | active only, `cost` stripped → `{products}` | full list → `{products}` |
| `POST /api/products` | — | `{product}` → `{product}` (create; id server-slugged) |
| `PUT /api/products` | — | `{product}` → `{product}` (replace by id) · or `{action:"stock", id, size, delta}` → `{product}` |
| `DELETE /api/products?id=` | — | `{ok}` |
| `GET /api/orders` | — | `{orders}` (newest first) |
| `POST /api/orders` | `{items:[{id,size,qty}], customer?}` → `{id}` (site checkout; prices recomputed server-side) | `{action:"manual", order}` → `{order}` |
| `PUT /api/orders` | — | `{id, patch}` → `{order}` (status/customer/delivery/paid/notes) |
| `DELETE /api/orders?id=` | — | `{ok}` |
| `GET /api/companies` | — | `{companies}` |
| `POST/PUT /api/companies` | — | `{company}` → `{company}` |
| `DELETE /api/companies?id=` | — | `{ok}` |
| `GET /api/journal` | active only → `{articles}` | `?all=1` full → `{articles}` |
| `POST/PUT /api/journal` | — | `{article}` → `{article}` |
| `DELETE /api/journal?id=` | — | `{ok}` |
| `POST /api/upload?name=<file>` | — | body = binary `application/octet-stream` → `{url}` |

Errors: non-2xx with `{error: "message français"}`.
First authed GET of products/journal auto-seeds the blobs from the built-in catalog.

## Admin shell API (`js/admin/app.js` exposes `window.ADMIN`)

```js
ADMIN.api(path, {method, body})        // fetch wrapper, token attached, throws Error(fr message)
ADMIN.loadProducts(force?) → [..]      // cached loaders (30 s), same for
ADMIN.loadOrders(force?) / ADMIN.loadCompanies(force?) / ADMIN.loadJournal(force?)
ADMIN.register(route, {title, icon, order, render})   // module self-registration
ADMIN.navigate(route)                  // '#/<route>'
ADMIN.rerender()                       // re-run current route's render
ADMIN.toast(msg, type)                 // type 'ok' | 'err'
ADMIN.modal({title, body, footer, wide}) → {el, close}  // body/footer = HTML strings
ADMIN.confirm(msg) → Promise<bool>
ADMIN.money(n)  ADMIN.esc(s)  ADMIN.fmtDate(iso)  ADMIN.uid()
ADMIN.STATUS                            // ordered {key:{label,cls}} for the 7 statuses
ADMIN.statusBadge(key) → html
ADMIN.uploadImage(file) → Promise<url>  // canvas-resizes ≤1400px q.82 then POSTs
ADMIN.state                             // {products, orders, companies, journal}
```

Module file pattern (plain script, no ES modules):
```js
(function(){ "use strict";
  ADMIN.register("produits", { title:"Produits", icon:'<svg…>', order:2,
    render: async function(el){ /* el = <div> inside <main>; fill innerHTML, bind events */ }
  });
})();
```

## Modules & routes

| order | route | file | owns |
|---|---|---|---|
| 1 | `dashboard` | `js/admin/dashboard.js` | KPIs, CA 6-month bars, stock faible, dernières commandes |
| 2 | `commandes` | `js/admin/commandes.js` | orders table + filters, detail modal, manual order |
| 3 | `produits` | `js/admin/produits.js` | catalog CRUD, images, per-size stock |
| 4 | `livraison` | `js/admin/livraison.js` | delivery companies CRUD + assignment overview |
| 5 | `journal` | `js/admin/journal.js` | blog articles CRUD |
| 6 | `parametres` | `js/admin/parametres.js` | password change, business info, links |

KPI definitions (dashboard): **CA encaissé** = Σ total of `livree` orders; **En cours**
= Σ total of `confirmee|en_preparation|expediee`; **Panier moyen** = CA period /
delivered count; month = createdAt month. **Stock faible** = tracked sizes with qty ≤ 2.

## Design system (css/admin.css)

Same tokens as the site (`--ivory --cream --sand --ink --ink-soft --wine --wine-deep
--rose --rose-soft --gold --gold-lite`, fonts Cormorant Garamond/Cinzel/Jost,
`--ease: cubic-bezier(.22,.61,.36,1)`) plus `--ok:#4A7C59` and `--err:#A94436`.
Bright/light only — sidebar is cream, wine is an accent, never a page background.

Core classes every module uses (defined once in admin.css):
`.a-card` `.a-card__head` `.a-title` `.a-sub` `.a-btn` `.a-btn--ghost` `.a-btn--sm`
`.a-btn--danger` `.a-table` (wrap in `.a-scroll`) `.a-badge` + `.a-badge--<status>`
`.a-field` `.a-label` `.a-input` `.a-select` `.a-textarea` `.a-check`
`.a-form-grid` (2-col responsive) `.a-kpi` `.a-kpi__num` `.a-kpi__lbl`
`.a-grid` (card grid) `.a-empty` (empty state) `.a-thumb` (44px img)
`.a-bars` (CSS bar chart: `.a-bar` with `--h:%` and `data-lbl`)
`.a-search` (search input row) `.a-actions` (right-aligned button row)
`.a-modal`/`.a-modal__box` and `.a-toast` are created by app.js only.
