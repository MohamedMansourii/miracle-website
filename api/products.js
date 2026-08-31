/* /api/products — catalog CRUD. Public GET (active, no cost); auth GET full.
   Auto-seeds data/products.json from the launch catalog on first read. */
"use strict";
const L = require("./_lib.js");
const DOC = "data/products";

async function loadAll() {
  let products = await L.readDoc(DOC, null);
  if (!products) {
    products = L.DEFAULT_PRODUCTS;
    await L.writeDoc(DOC, products);
  }
  return products;
}

function normalize(p, existing) {
  const now = new Date().toISOString();
  const base = existing || { createdAt: now };
  const out = Object.assign({}, base, p);
  out.title = String(out.title || "").trim() || "Pièce sans nom";
  out.color = String(out.color || "").trim();
  out.price = Math.max(0, Number(out.price) || 0);
  out.oldPrice = out.oldPrice === null || out.oldPrice === "" || out.oldPrice === undefined ? null : Math.max(0, Number(out.oldPrice) || 0);
  if (out.oldPrice !== null && out.oldPrice <= out.price) out.oldPrice = null; // compare-at must exceed the price
  out.cost = out.cost === null || out.cost === "" || out.cost === undefined ? null : Math.max(0, Number(out.cost) || 0);
  out.type = String(out.type || "Pièce").trim();
  ["cats", "sizes", "colors", "flags", "gallery"].forEach(function (k) {
    out[k] = Array.isArray(out[k]) ? out[k].filter(Boolean) : [];
  });
  out.img = String(out.img || "").trim();
  out.img2 = String(out.img2 || out.img || "").trim();
  if (!out.gallery.length && out.img) out.gallery = [out.img];
  out.active = out.active !== false;
  if (out.stock && typeof out.stock === "object") {
    const clean = {};
    Object.keys(out.stock).forEach(function (s) {
      const v = parseInt(out.stock[s], 10);
      if (!isNaN(v)) clean[s] = Math.max(0, v);
    });
    out.stock = Object.keys(clean).length ? clean : null;
  } else out.stock = null;
  out.composition = String(out.composition || "").trim();
  out.updatedAt = now;
  return out;
}

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  const authed = L.isAuthed(req);

  try {
    if (req.method === "GET") {
      const products = await loadAll();
      if (authed) return L.ok(res, { products: products });
      const pub = products.filter(function (p) { return p.active !== false; })
        .map(function (p) { const c = Object.assign({}, p); delete c.cost; return c; });
      // shop info the storefront needs at checkout (never expose the rest of settings)
      const settings = await L.readDoc("data/settings", {});
      const shop = {
        deliveryFee: typeof settings.deliveryFee === "number" ? settings.deliveryFee : 8,
        freeShippingAbove: typeof settings.freeShippingAbove === "number" ? settings.freeShippingAbove : null
      };
      return L.ok(res, { products: pub, shop: shop }, "public, s-maxage=30, stale-while-revalidate=120");
    }

    if (!authed) return L.err(res, 401, "Session expirée — reconnectez-vous.");
    const body = req.body || {};

    if (req.method === "POST") {
      const products = await loadAll();
      const p = normalize(body.product || {});
      let id = p.id && String(p.id).trim() ? L.slugify(p.id) : L.slugify(p.title + "-" + (p.color || ""));
      while (products.some(function (x) { return x.id === id; })) id = id + "-" + L.uid(3);
      p.id = id;
      products.unshift(p);
      await L.writeDoc(DOC, products);
      return L.ok(res, { product: p });
    }

    if (req.method === "PUT") {
      const products = await loadAll();
      if (body.action === "stock") {
        const p = products.find(function (x) { return x.id === body.id; });
        if (!p) return L.err(res, 404, "Pièce introuvable.");
        if (!p.stock) p.stock = {};
        const cur = parseInt(p.stock[body.size], 10) || 0;
        p.stock[body.size] = Math.max(0, cur + (parseInt(body.delta, 10) || 0));
        p.updatedAt = new Date().toISOString();
        await L.writeDoc(DOC, products);
        return L.ok(res, { product: p });
      }
      const incoming = body.product || {};
      const idx = products.findIndex(function (x) { return x.id === incoming.id; });
      if (idx < 0) return L.err(res, 404, "Pièce introuvable.");
      const p = normalize(incoming, products[idx]);
      p.id = products[idx].id;
      products[idx] = p;
      await L.writeDoc(DOC, products);
      return L.ok(res, { product: p });
    }

    if (req.method === "DELETE") {
      const id = (req.query && req.query.id) || "";
      const products = await loadAll();
      const next = products.filter(function (x) { return x.id !== id; });
      if (next.length === products.length) return L.err(res, 404, "Pièce introuvable.");
      await L.writeDoc(DOC, next);
      return L.ok(res, { ok: true });
    }

    return L.err(res, 405, "Méthode non autorisée.");
  } catch (e) {
    return L.err(res, 500, "Erreur serveur : " + (e && e.message ? e.message : "inconnue"));
  }
};
