/* /api/settings — boutique settings (TVA, username display). Admin only.
   passwordHash lives in the same doc but is never returned. */
"use strict";
const L = require("./_lib.js");
const DOC = "data/settings";

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  if (!L.isAuthed(req)) return L.err(res, 401, "Session expirée — reconnectez-vous.");

  try {
    const settings = await L.readDoc(DOC, {});

    if (req.method === "GET") {
      return L.ok(res, {
        settings: {
          tvaRate: typeof settings.tvaRate === "number" ? settings.tvaRate : 0,
          username: settings.username || process.env.ADMIN_USERNAME || "MiracleAdmin",
          currency: "TND",
          customPassword: !!settings.passwordHash
        }
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      if (body.tvaRate !== undefined) {
        const r = Number(body.tvaRate);
        if (isNaN(r) || r < 0 || r > 0.5) return L.err(res, 400, "Taux de TVA invalide (0 à 50 %).");
        settings.tvaRate = Math.round(r * 1000) / 1000;
      }
      settings.updatedAt = new Date().toISOString();
      await L.writeDoc(DOC, settings, { encrypt: true });
      return L.ok(res, { ok: true, tvaRate: settings.tvaRate || 0 });
    }

    return L.err(res, 405, "Méthode non autorisée.");
  } catch (e) {
    return L.err(res, 500, "Erreur serveur : " + (e && e.message ? e.message : "inconnue"));
  }
};
