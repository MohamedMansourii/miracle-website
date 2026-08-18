/* /api/orders — one encrypted blob per order under data/orders/.
   Public POST (site checkout, prices recomputed server-side); rest is admin. */
"use strict";
const L = require("./_lib.js");
const PREFIX = "data/orders/";
const STATUSES = ["nouvelle", "confirmee", "en_preparation", "expediee", "livree", "annulee", "retour"];
const STOCK_SET = ["confirmee", "en_preparation", "expediee", "livree"];
const RESTOCK_SET = ["annulee", "retour"];

function cleanCustomer(c) {
  c = c || {};
  function s(v, max) { return String(v || "").trim().slice(0, max || 120); }
  return { name: s(c.name), phone: s(c.phone, 30), city: s(c.city, 60), address: s(c.address, 240), note: s(c.note, 500) };
}
async function loadOrder(id) {
  if (!/^CMD-[A-Za-z0-9-]+$/.test(id)) return null;
  return L.readDoc(PREFIX + id, null);
}
async function saveOrder(order) {
  order.updatedAt = new Date().toISOString();
  await L.writeDoc(PREFIX + order.id, order, { encrypt: true });
  return order;
}
async function applyStock(items, dir) {
  const products = await L.readDoc("data/products", null);
  if (!products) return;
  let touched = false;
  items.forEach(function (it) {
    const p = products.find(function (x) { return x.id === it.id; });
    if (!p || !p.stock || !it.size || !(it.size in p.stock)) return;
    p.stock[it.size] = Math.max(0, (parseInt(p.stock[it.size], 10) || 0) + dir * (it.qty || 1));
    p.updatedAt = new Date().toISOString();
    touched = true;
  });
  if (touched) await L.writeDoc("data/products", products);
}

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  const authed = L.isAuthed(req);
  const body = req.body || {};

  try {
    /* -------- public: create order from the site checkout -------- */
    if (req.method === "POST" && body.action !== "manual") {
      const rawItems = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
      if (!rawItems.length) return L.err(res, 400, "Panier vide.");
      const products = await L.readDoc("data/products", null) || L.DEFAULT_PRODUCTS;
      const items = [];
      rawItems.forEach(function (it) {
        const p = products.find(function (x) { return x.id === it.id && x.active !== false; });
        if (!p) return;
        items.push({ id: p.id, title: p.title, color: p.color, size: String(it.size || ""),
          qty: Math.min(20, Math.max(1, parseInt(it.qty, 10) || 1)), price: p.price });
      });
      if (!items.length) return L.err(res, 400, "Aucune pièce valide dans le panier.");
      const order = {
        id: L.orderId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        source: "site", customer: cleanCustomer(body.customer),
        items: items,
        total: items.reduce(function (n, it) { return n + it.price * it.qty; }, 0),
        status: "nouvelle",
        delivery: { companyId: "", companyName: "", personName: "", personPhone: "", fee: null, note: "" },
        paid: false, stockApplied: false, notes: "",
        history: [{ at: new Date().toISOString(), status: "nouvelle" }]
      };
      await saveOrder(order);
      return L.ok(res, { id: order.id });
    }

    if (!authed) return L.err(res, 401, "Session expirée — reconnectez-vous.");

    /* -------- admin -------- */
    if (req.method === "GET") {
      const full = await L.readManyDocs(PREFIX, new RegExp("^data/orders/(CMD-[^/]+)/v-"));
      full.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      return L.ok(res, { orders: full });
    }

    if (req.method === "POST" && body.action === "manual") {
      const o = body.order || {};
      const rawItems = Array.isArray(o.items) ? o.items.slice(0, 30) : [];
      if (!rawItems.length) return L.err(res, 400, "Ajoutez au moins une pièce.");
      const products = await L.readDoc("data/products", null) || [];
      const items = rawItems.map(function (it) {
        const p = products.find(function (x) { return x.id === it.id; });
        return {
          id: it.id || "", title: String(it.title || (p && p.title) || "Pièce"),
          color: String(it.color || (p && p.color) || ""), size: String(it.size || ""),
          qty: Math.max(1, parseInt(it.qty, 10) || 1),
          price: it.price !== undefined && it.price !== "" ? Math.max(0, Number(it.price) || 0) : (p ? p.price : 0)
        };
      });
      const status = STATUSES.indexOf(o.status) > -1 ? o.status : "nouvelle";
      const order = {
        id: L.orderId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        source: ["manuelle", "instagram", "whatsapp", "site"].indexOf(o.source) > -1 ? o.source : "manuelle",
        customer: cleanCustomer(o.customer),
        items: items,
        total: o.total !== undefined && o.total !== "" ? Math.max(0, Number(o.total) || 0)
          : items.reduce(function (n, it) { return n + it.price * it.qty; }, 0),
        status: status,
        delivery: Object.assign({ companyId: "", companyName: "", personName: "", personPhone: "", fee: null, note: "" }, o.delivery || {}),
        paid: !!o.paid, stockApplied: false, notes: String(o.notes || ""),
        history: [{ at: new Date().toISOString(), status: status }]
      };
      if (STOCK_SET.indexOf(status) > -1) { await applyStock(items, -1); order.stockApplied = true; }
      await saveOrder(order);
      return L.ok(res, { order: order });
    }

    if (req.method === "PUT") {
      const order = await loadOrder(String(body.id || ""));
      if (!order) return L.err(res, 404, "Commande introuvable.");
      const patch = body.patch || {};

      if (patch.customer) order.customer = cleanCustomer(Object.assign({}, order.customer, patch.customer));
      if (patch.delivery) order.delivery = Object.assign({}, order.delivery, patch.delivery);
      if (patch.notes !== undefined) order.notes = String(patch.notes || "");
      if (patch.paid !== undefined) order.paid = !!patch.paid;
      if (patch.items && Array.isArray(patch.items) && patch.items.length) {
        order.items = patch.items;
        order.total = patch.items.reduce(function (n, it) { return n + (Number(it.price) || 0) * (parseInt(it.qty, 10) || 1); }, 0);
      }
      if (patch.total !== undefined && patch.total !== "") order.total = Math.max(0, Number(patch.total) || 0);

      if (patch.status && STATUSES.indexOf(patch.status) > -1 && patch.status !== order.status) {
        if (STOCK_SET.indexOf(patch.status) > -1 && !order.stockApplied) {
          await applyStock(order.items, -1); order.stockApplied = true;
        } else if (RESTOCK_SET.indexOf(patch.status) > -1 && order.stockApplied) {
          await applyStock(order.items, +1); order.stockApplied = false;
        }
        order.status = patch.status;
        order.history = order.history || [];
        order.history.push({ at: new Date().toISOString(), status: patch.status });
      }
      await saveOrder(order);
      return L.ok(res, { order: order });
    }

    if (req.method === "DELETE") {
      const id = String((req.query && req.query.id) || "");
      const found = await L.deleteDoc(PREFIX + id);
      if (!found) return L.err(res, 404, "Commande introuvable.");
      return L.ok(res, { ok: true });
    }

    return L.err(res, 405, "Méthode non autorisée.");
  } catch (e) {
    return L.err(res, 500, "Erreur serveur : " + (e && e.message ? e.message : "inconnue"));
  }
};
