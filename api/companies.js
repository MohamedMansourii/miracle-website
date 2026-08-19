/* /api/companies — delivery companies CRUD. Admin only, encrypted at rest. */
"use strict";
const L = require("./_lib.js");
const DOC = "data/companies";

function normalize(c, existing) {
  const now = new Date().toISOString();
  const out = Object.assign({ createdAt: now }, existing || {}, c);
  function s(v, max) { return String(v || "").trim().slice(0, max || 160); }
  out.name = s(out.name) || "Société de livraison";
  out.contactName = s(out.contactName);
  out.email = s(out.email);
  out.phone = s(out.phone, 40);
  out.zones = s(out.zones, 240);
  out.priceNote = s(out.priceNote, 240);
  out.trackingUrl = s(out.trackingUrl, 300); // template with {code}, e.g. https://suivi.x.tn/{code}
  out.notes = s(out.notes, 1000);
  out.active = out.active !== false;
  out.persons = (Array.isArray(out.persons) ? out.persons : [])
    .map(function (p) { return { name: s(p && p.name), phone: s(p && p.phone, 40) }; })
    .filter(function (p) { return p.name || p.phone; });
  out.updatedAt = now;
  return out;
}

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  if (!L.isAuthed(req)) return L.err(res, 401, "Session expirée — reconnectez-vous.");
  const body = req.body || {};

  try {
    const companies = await L.readDoc(DOC, []);

    if (req.method === "GET") return L.ok(res, { companies: companies });

    if (req.method === "POST") {
      const c = normalize(body.company || {});
      c.id = "liv-" + L.slugify(c.name).slice(0, 24) + "-" + L.uid(3);
      companies.push(c);
      await L.writeDoc(DOC, companies, { encrypt: true });
      return L.ok(res, { company: c });
    }

    if (req.method === "PUT") {
      const incoming = body.company || {};
      const idx = companies.findIndex(function (x) { return x.id === incoming.id; });
      if (idx < 0) return L.err(res, 404, "Société introuvable.");
      const c = normalize(incoming, companies[idx]);
      c.id = companies[idx].id;
      companies[idx] = c;
      await L.writeDoc(DOC, companies, { encrypt: true });
      return L.ok(res, { company: c });
    }

    if (req.method === "DELETE") {
      const id = (req.query && req.query.id) || "";
      const next = companies.filter(function (x) { return x.id !== id; });
      if (next.length === companies.length) return L.err(res, 404, "Société introuvable.");
      await L.writeDoc(DOC, next, { encrypt: true });
      return L.ok(res, { ok: true });
    }

    return L.err(res, 405, "Méthode non autorisée.");
  } catch (e) {
    return L.err(res, 500, "Erreur serveur : " + (e && e.message ? e.message : "inconnue"));
  }
};
