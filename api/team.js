/* /api/team — sub-admin accounts (staff). SUPER ADMIN ONLY.
   Members log in with their e-mail + the password the owner set.
   Stored encrypted; passwords as scrypt hashes, never returned. */
"use strict";
const L = require("./_lib.js");
const DOC = "data/team";

function pub(m) {
  return { id: m.id, name: m.name, email: m.email, active: m.active !== false, createdAt: m.createdAt, updatedAt: m.updatedAt };
}

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  if (!L.isAuthed(req)) return L.err(res, 401, "Session expirée — reconnectez-vous.");
  if (!L.isSuper(req)) return L.err(res, 403, "Réservé au super admin.");
  const body = req.body || {};

  try {
    const team = await L.readDoc(DOC, []);

    if (req.method === "GET") return L.ok(res, { team: team.map(pub) });

    if (req.method === "POST") {
      const name = String(body.name || "").trim().slice(0, 80);
      const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
      const password = String(body.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return L.err(res, 400, "Adresse e-mail invalide.");
      if (password.length < 8) return L.err(res, 400, "Le mot de passe doit faire au moins 8 caractères.");
      if (team.some(function (m) { return m.email === email; })) return L.err(res, 400, "Un compte existe déjà avec cet e-mail.");
      const now = new Date().toISOString();
      const m = { id: "adm-" + L.uid(6), name: name || email, email: email,
        passwordHash: L.hashPassword(password), active: true, createdAt: now, updatedAt: now };
      team.push(m);
      await L.writeDoc(DOC, team, { encrypt: true });
      return L.ok(res, { member: pub(m) });
    }

    if (req.method === "PUT") {
      const idx = team.findIndex(function (m) { return m.id === body.id; });
      if (idx < 0) return L.err(res, 404, "Compte introuvable.");
      const m = team[idx];
      if (body.name !== undefined) m.name = String(body.name || "").trim().slice(0, 80) || m.email;
      if (body.active !== undefined) m.active = !!body.active;
      if (body.password) {
        if (String(body.password).length < 8) return L.err(res, 400, "Le mot de passe doit faire au moins 8 caractères.");
        m.passwordHash = L.hashPassword(String(body.password));
      }
      m.updatedAt = new Date().toISOString();
      await L.writeDoc(DOC, team, { encrypt: true });
      return L.ok(res, { member: pub(m) });
    }

    if (req.method === "DELETE") {
      const id = (req.query && req.query.id) || "";
      const next = team.filter(function (m) { return m.id !== id; });
      if (next.length === team.length) return L.err(res, 404, "Compte introuvable.");
      await L.writeDoc(DOC, next, { encrypt: true });
      return L.ok(res, { ok: true });
    }

    return L.err(res, 405, "Méthode non autorisée.");
  } catch (e) {
    return L.err(res, 500, "Erreur serveur : " + (e && e.message ? e.message : "inconnue"));
  }
};
