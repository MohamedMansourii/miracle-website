/* POST /api/auth — {action:"login", password} | {action:"change", current, next} */
"use strict";
const L = require("./_lib.js");

const attempts = new Map(); // best-effort per-instance rate limit

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  if (req.method !== "POST") return L.err(res, 405, "Méthode non autorisée.");
  const body = req.body || {};

  try {
    if (body.action === "login") {
      const ip = (req.headers["x-forwarded-for"] || "?").split(",")[0].trim();
      const now = Date.now();
      const log = (attempts.get(ip) || []).filter(function (t) { return now - t < 15 * 60 * 1000; });
      if (log.length >= 10) return L.err(res, 429, "Trop de tentatives. Réessayez dans 15 minutes.");
      log.push(now); attempts.set(ip, log);

      const pw = String(body.password || "");
      const user = String(body.username || "").trim();
      if (!pw || !user) return L.err(res, 400, "Nom d'utilisateur et mot de passe requis.");
      const settings = await L.readDoc("data/settings", {});

      // 1) super admin (the owner)
      const expectedUser = settings.username || process.env.ADMIN_USERNAME || "MiracleAdmin";
      const userOk = L.safeEqual(user.toLowerCase(), String(expectedUser).toLowerCase());
      const pwOk = settings.passwordHash
        ? L.checkPassword(pw, settings.passwordHash)
        : L.safeEqual(pw, process.env.ADMIN_PASSWORD || "");
      if (userOk && pwOk) {
        attempts.set(ip, []);
        return L.ok(res, { token: L.signToken({ role: "super" }), role: "super", displayName: expectedUser });
      }

      // 2) sub-admin (staff) — logs in with their e-mail
      const team = await L.readDoc("data/team", []);
      const member = team.find(function (m) {
        return m.active !== false && m.email && m.email.toLowerCase() === user.toLowerCase();
      });
      if (member && L.checkPassword(pw, member.passwordHash)) {
        attempts.set(ip, []);
        return L.ok(res, {
          token: L.signToken({ role: "staff", email: member.email }),
          role: "staff", displayName: member.name || member.email
        });
      }
      return L.err(res, 401, "Identifiants incorrects.");
    }

    if (body.action === "change") {
      if (!L.isAuthed(req)) return L.err(res, 401, "Session expirée — reconnectez-vous.");
      if (!L.isSuper(req)) return L.err(res, 403, "Réservé au super admin.");
      const settings = await L.readDoc("data/settings", {});
      const currentOk = settings.passwordHash
        ? L.checkPassword(String(body.current || ""), settings.passwordHash)
        : L.safeEqual(String(body.current || ""), process.env.ADMIN_PASSWORD || "");
      if (!currentOk) return L.err(res, 401, "Mot de passe actuel incorrect.");
      const next = String(body.next || "");
      if (next.length < 8) return L.err(res, 400, "Le nouveau mot de passe doit faire au moins 8 caractères.");
      settings.passwordHash = L.hashPassword(next);
      if (body.newUsername !== undefined) {
        const nu = String(body.newUsername || "").trim();
        if (nu.length >= 3) settings.username = nu.slice(0, 40);
      }
      settings.updatedAt = new Date().toISOString();
      await L.writeDoc("data/settings", settings, { encrypt: true });
      return L.ok(res, { ok: true });
    }

    return L.err(res, 400, "Action inconnue.");
  } catch (e) {
    return L.err(res, 500, "Erreur serveur : " + (e && e.message ? e.message : "inconnue"));
  }
};
