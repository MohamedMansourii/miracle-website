/* /api/journal — blog articles. Public GET (active only); CRUD is admin.
   Auto-seeds data/journal.json from the launch articles on first read. */
"use strict";
const L = require("./_lib.js");
const DOC = "data/journal";

async function loadAll() {
  let articles = await L.readDoc(DOC, null);
  if (!articles) {
    articles = L.DEFAULT_JOURNAL;
    await L.writeDoc(DOC, articles);
  }
  return articles;
}

function normalize(a, existing) {
  const now = new Date().toISOString();
  const out = Object.assign({ createdAt: now }, existing || {}, a);
  function s(v, max) { return String(v || "").trim().slice(0, max || 200); }
  out.title = s(out.title) || "Article sans titre";
  out.tag = s(out.tag, 40) || "Journal";
  out.date = /^\d{4}-\d{2}-\d{2}$/.test(out.date) ? out.date : new Date().toISOString().slice(0, 10);
  out.img = s(out.img, 500);
  out.href = out.href ? s(out.href, 500) : null;
  out.excerpt = String(out.excerpt || "").trim().slice(0, 600);
  out.body = String(out.body || "").trim().slice(0, 20000);
  out.active = out.active !== false;
  out.updatedAt = now;
  return out;
}

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  const authed = L.isAuthed(req);

  try {
    if (req.method === "GET") {
      const articles = await loadAll();
      if (authed && req.query && req.query.all) return L.ok(res, { articles: articles });
      const pub = articles.filter(function (a) { return a.active !== false; });
      return L.ok(res, { articles: pub }, "public, s-maxage=60, stale-while-revalidate=300");
    }

    if (!authed) return L.err(res, 401, "Session expirée — reconnectez-vous.");
    const body = req.body || {};

    if (req.method === "POST") {
      const articles = await loadAll();
      const a = normalize(body.article || {});
      let id = L.slugify(a.title);
      while (articles.some(function (x) { return x.id === id; })) id = id + "-" + L.uid(3);
      a.id = id;
      articles.unshift(a);
      await L.writeDoc(DOC, articles);
      return L.ok(res, { article: a });
    }

    if (req.method === "PUT") {
      const articles = await loadAll();
      const incoming = body.article || {};
      const idx = articles.findIndex(function (x) { return x.id === incoming.id; });
      if (idx < 0) return L.err(res, 404, "Article introuvable.");
      const a = normalize(incoming, articles[idx]);
      a.id = articles[idx].id;
      articles[idx] = a;
      await L.writeDoc(DOC, articles);
      return L.ok(res, { article: a });
    }

    if (req.method === "DELETE") {
      const id = (req.query && req.query.id) || "";
      const articles = await loadAll();
      const next = articles.filter(function (x) { return x.id !== id; });
      if (next.length === articles.length) return L.err(res, 404, "Article introuvable.");
      await L.writeDoc(DOC, next);
      return L.ok(res, { ok: true });
    }

    return L.err(res, 405, "Méthode non autorisée.");
  } catch (e) {
    return L.err(res, 500, "Erreur serveur : " + (e && e.message ? e.message : "inconnue"));
  }
};
