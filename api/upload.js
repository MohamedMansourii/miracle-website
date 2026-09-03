/* POST /api/upload?name=<filename> — admin image upload to Blob storage.
   Body: raw binary (application/octet-stream), client resizes before sending. */
"use strict";
const L = require("./_lib.js");
const MAX = 4 * 1024 * 1024; // stay under Vercel's 4.5 MB function body limit

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  if (req.method !== "POST") return L.err(res, 405, "Méthode non autorisée.");
  if (!L.isAuthed(req)) return L.err(res, 401, "Session expirée — reconnectez-vous.");

  try {
    let buf;
    if (Buffer.isBuffer(req.body)) {
      buf = req.body;
    } else {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX) return L.err(res, 413, "Image trop lourde (max 4 Mo après compression).");
        chunks.push(chunk);
      }
      buf = Buffer.concat(chunks);
    }
    if (buf.length > MAX) return L.err(res, 413, "Image trop lourde (max 4 Mo après compression).");
    if (!buf.length) return L.err(res, 400, "Aucun fichier reçu.");

    // magic-byte check: JPEG / PNG / WebP only
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    const isWebp = buf.length > 11 && buf.toString("ascii", 8, 12) === "WEBP";
    if (!isJpeg && !isPng && !isWebp) return L.err(res, 415, "Format non supporté (JPEG, PNG ou WebP).");
    const ext = isJpeg ? "jpg" : isPng ? "png" : "webp";
    const type = isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/webp";

    const rawName = String((req.query && req.query.name) || "image");
    const name = L.slugify(rawName.replace(/\.[a-z0-9]+$/i, ""));
    const key = "img/" + Date.now() + "-" + name + "-" + L.uid(6) + "." + ext;

    await L.rawPut(key, buf, type);
    // absolute URL so the image also works on the GitHub Pages mirror
    const base = process.env.URL || "";
    return L.ok(res, { url: base + "/api/img/" + key });
  } catch (e) {
    return L.err(res, 500, "Erreur serveur : " + (e && e.message ? e.message : "inconnue"));
  }
};

module.exports.config = { api: { bodyParser: false } };
