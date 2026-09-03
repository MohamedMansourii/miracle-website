/* MIRACLE back office — shared helpers for all api/ functions.
   Underscore prefix => not deployed as an endpoint. CommonJS. */
"use strict";

const crypto = require("crypto");

/* Netlify Blobs — the database. Lazy dynamic import (the SDK is ESM-only);
   auth is automatic inside the Netlify runtime, strong consistency requested. */
let _storePromise = null;
function getBlobStore() {
  if (!_storePromise) {
    _storePromise = import("@netlify/blobs").then(function (m) {
      return m.getStore({ name: "miracle-db", consistency: "strong" });
    });
  }
  return _storePromise;
}

const SECRET = process.env.SESSION_SECRET || "dev-only-secret";
const ENC_KEY = crypto.createHash("sha256").update(SECRET + ":blob-v1").digest();
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000;

/* ---------------- tokens (HMAC-signed, stateless, role-carrying) ------ */
function b64u(buf) { return Buffer.from(buf).toString("base64url"); }
function signToken(extra) {
  const payload = b64u(JSON.stringify(Object.assign({ exp: Date.now() + TOKEN_TTL_MS, role: "super" }, extra || {})));
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return payload + "." + sig;
}
function verifyToken(token) {
  if (!token || token.indexOf(".") < 0) return false;
  const [payload, sig] = token.split(".");
  const expect = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig || ""), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!(p.exp > Date.now())) return false;
    if (!p.role) p.role = "super"; // pre-role tokens belonged to the owner
    return p;
  } catch (e) { return false; }
}
/* returns the token payload ({role, email?, exp}) or false — truthy check
   keeps every existing `if (!L.isAuthed(req))` guard working unchanged */
function isAuthed(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return false;
  return verifyToken(h.slice(7));
}
function isSuper(req) {
  const p = isAuthed(req);
  return !!(p && p.role === "super");
}

/* ---------------- password hashing (scrypt) ---------------- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 32).toString("hex");
  return { salt, hash };
}
function checkPassword(pw, rec) {
  if (!rec || !rec.salt || !rec.hash) return false;
  const h = crypto.scryptSync(pw, rec.salt, 32);
  const stored = Buffer.from(rec.hash, "hex");
  return h.length === stored.length && crypto.timingSafeEqual(h, stored);
}
function safeEqual(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ba.length !== bb.length) { crypto.timingSafeEqual(bb, bb); return false; }
  return crypto.timingSafeEqual(ba, bb);
}

/* ---------------- encryption at rest (AES-256-GCM) ---------------- */
function encJSON(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  return JSON.stringify({ enc: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), d: data.toString("base64") });
}
function maybeDecJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.enc !== 1) return parsed;
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const out = Buffer.concat([decipher.update(Buffer.from(parsed.d, "base64")), decipher.final()]);
  return JSON.parse(out.toString("utf8"));
}

/* ---------------- blob JSON store (versioned, immutable writes) --------
   Vercel Blob OVERWRITES are eventually consistent (stale reads for up to
   ~60 s), which would lose rapid successive updates. So every save creates
   a NEW immutable blob under  <prefix>/v-<millis>-<rand>.json ; reads pick
   the highest version (cross-checked against a per-instance memory cache)
   and writes prune all but the newest 3 versions. */
const memCache = {}; // prefix -> { v, data }

function versionOf(pathname) {
  const m = pathname.match(/\/v-(\d+)-/);
  return m ? parseInt(m[1], 10) : 0;
}
async function listPrefix(prefix) {
  const store = await getBlobStore();
  const res = await store.list({ prefix: prefix });
  return (res.blobs || []).map(function (b) { return { pathname: b.key }; });
}
async function fetchDoc(blob) {
  const store = await getBlobStore();
  const text = await store.get(blob.pathname, { type: "text" });
  if (text === null || text === undefined) return undefined;
  try { return maybeDecJSON(text); } catch (e) { return undefined; }
}
/* raw binary helpers (images + migration) */
function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
async function rawPut(key, buf, contentType) {
  const store = await getBlobStore();
  await store.set(key, toArrayBuffer(buf), contentType ? { metadata: { contentType: contentType } } : undefined);
}
async function rawGet(key) {
  const store = await getBlobStore();
  const ab = await store.get(key, { type: "arrayBuffer" });
  return ab ? Buffer.from(ab) : null;
}
async function rawDel(key) {
  const store = await getBlobStore();
  await store.delete(key);
}
/* prefix is a doc id like "data/products" (no trailing slash / extension) */
async function readDoc(prefix, fallback) {
  const mem = memCache[prefix];
  let blobs = [];
  try { blobs = await listPrefix(prefix + "/v-"); } catch (e) {}
  blobs.sort(function (a, b) { return versionOf(b.pathname) - versionOf(a.pathname); });
  for (let i = 0; i < blobs.length; i++) {
    const v = versionOf(blobs[i].pathname);
    if (mem && mem.v > v) return mem.data;           // this instance wrote something newer
    const data = await fetchDoc(blobs[i]);
    if (data !== undefined) {
      memCache[prefix] = { v: v, data: data };
      return data;
    }
  }
  if (mem) return mem.data;
  return fallback;
}
async function writeDoc(prefix, obj, opts) {
  const v = Date.now();
  const body = (opts && opts.encrypt) ? encJSON(obj) : JSON.stringify(obj);
  const store = await getBlobStore();
  await store.set(prefix + "/v-" + v + "-" + uid(6) + ".json", body);
  memCache[prefix] = { v: v, data: obj };
  try { // prune old versions, keep the newest 3
    const blobs = await listPrefix(prefix + "/v-");
    blobs.sort(function (a, b) { return versionOf(b.pathname) - versionOf(a.pathname); });
    const old = blobs.slice(3);
    for (const b of old) await store.delete(b.pathname);
  } catch (e) {}
  return obj;
}
async function deleteDoc(prefix) {
  const blobs = await listPrefix(prefix + "/v-");
  if (!blobs.length) return false;
  const store = await getBlobStore();
  for (const b of blobs) await store.delete(b.pathname);
  delete memCache[prefix];
  return true;
}
/* group versioned blobs of many docs under a root, newest per doc id */
function latestPerDoc(blobs, rootRe) {
  const best = {};
  blobs.forEach(function (b) {
    const m = b.pathname.match(rootRe);
    if (!m) return;
    const id = m[1], v = versionOf(b.pathname);
    if (!best[id] || v > best[id].v) best[id] = { v: v, blob: b };
  });
  return best;
}
/* read every doc under a root (e.g. all orders), memory-cache aware */
async function readManyDocs(root, rootRe) {
  const blobs = await listPrefix(root);
  const best = latestPerDoc(blobs, rootRe);
  Object.keys(memCache).forEach(function (k) {
    if (k.indexOf(root) === 0) {
      const id = k.slice(root.length);
      if (!best[id] || memCache[k].v > best[id].v) best[id] = { v: memCache[k].v, mem: memCache[k].data };
    }
  });
  const out = await Promise.all(Object.keys(best).map(async function (id) {
    const b = best[id];
    if (b.mem) return b.mem;
    const data = await fetchDoc(b.blob);
    if (data !== undefined) memCache[root + id] = { v: b.v, data: data };
    return data === undefined ? null : data;
  }));
  return out.filter(Boolean);
}

/* ---------------- http helpers ---------------- */
const ORIGIN_OK = [
  /^https:\/\/([a-z0-9-]+--)?miracle-collection-tn\.netlify\.app$/,
  /^https:\/\/miracle-website[a-z0-9-]*\.vercel\.app$/,
  /^https:\/\/mohamedmansourii\.github\.io$/,
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
];
function cors(req, res) {
  const origin = req.headers.origin || "";
  if (ORIGIN_OK.some(function (rx) { return rx.test(origin); })) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
}
function ok(res, obj, cache) {
  res.setHeader("Cache-Control", cache || "no-store");
  res.status(200).json(obj);
}
function err(res, code, message) {
  res.setHeader("Cache-Control", "no-store");
  res.status(code).json({ error: message });
}

function uid(len) { return crypto.randomBytes(Math.ceil((len || 4) / 2)).toString("hex").slice(0, len || 4); }
function orderId() {
  const d = new Date();
  const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  return "CMD-" + ymd + "-" + uid(4).toUpperCase();
}
function slugify(s) {
  return String(s || "piece").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "piece";
}

/* ---------------- default catalog (seeds data/products.json) ----------------
   Mirrors the launch catalog in js/store.js so the first admin visit starts
   from the live site's real content. */
const P = "assets/products/", M = "assets/models/";
function prod(o) {
  return Object.assign({ active: true, stock: null, cost: null,
    createdAt: "2026-07-13T10:00:00.000Z", updatedAt: "2026-07-13T10:00:00.000Z" }, o);
}
const DEFAULT_PRODUCTS = [
  prod({ id: "caraco-bordeaux", title: "Caraco Dentelle", color: "Bordeaux & Ivoire", price: 149, type: "Caraco",
    cats: ["lingerie", "sets", "nouveautes"], sizes: ["S", "M", "L", "XL"], colors: ["Bordeaux", "Ivoire"],
    img: P + "FB_IMG_1783911618872.jpg", img2: P + "Screenshot_20260713_032353_Instagram.jpg",
    gallery: [P + "FB_IMG_1783911618872.jpg", P + "Screenshot_20260713_032353_Instagram.jpg", P + "Screenshot_20260713_032414_Instagram.jpg"],
    flags: ["best", "new"], composition: "Dentelle 90% polyamide, 10% élasthanne · doublure satin" }),
  prod({ id: "boudoir-champagne", title: "Ensemble Boudoir", color: "Champagne & Plume", price: 189, type: "Ensemble",
    cats: ["lingerie", "sets"], sizes: ["S", "M", "L"], colors: ["Champagne"],
    img: P + "Screenshot_20260713_032414_Instagram.jpg", img2: P + "Screenshot_20260713_032345_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032414_Instagram.jpg", P + "Screenshot_20260713_032345_Instagram.jpg"],
    flags: ["best"], composition: "Satin de soie mélangé · appliqués dentelle brodée · plume" }),
  prod({ id: "parure-blanc", title: "Parure Mariage", color: "Blanc Nacré", price: 240, type: "Parure",
    cats: ["mariage", "sets", "nouveautes"], sizes: ["S", "M", "L", "XL"], colors: ["Blanc"],
    img: P + "Screenshot_20260713_032334_Instagram.jpg", img2: P + "Screenshot_20260713_032345_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032334_Instagram.jpg", P + "Screenshot_20260713_032345_Instagram.jpg"],
    flags: ["new"], composition: "Peignoir + nuisette + culotte · satin & guipure · fait main" }),
  prod({ id: "pyjama-sauge", title: "Pyjama 3 Pièces", color: "Sauge & Roses", price: 129, type: "Pyjama",
    cats: ["demi-manche", "nuit"], sizes: ["S", "M", "L", "XL"], colors: ["Sauge", "Écru"],
    img: P + "Screenshot_20260713_032435_Instagram.jpg", img2: P + "Screenshot_20260713_032428_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032435_Instagram.jpg", P + "Screenshot_20260713_032428_Instagram.jpg"],
    flags: [], composition: "Caraco côtelé + short + pantalon · finitions dentelle" }),
  prod({ id: "slip-dentelle", title: "Slip Dentelle", color: "Toutes teintes", price: 39, type: "Slip",
    cats: ["slips", "lingerie"], sizes: ["XS", "S", "M", "L", "XL", "2X"], colors: ["Noir", "Rose", "Écru", "Bordeaux"],
    img: P + "Screenshot_20260713_032448_Instagram.jpg", img2: P + "Screenshot_20260713_032448_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032448_Instagram.jpg"],
    flags: ["best"], composition: "Dentelle florale · fond coton" }),
  prod({ id: "caraco-terracotta", title: "Caraco & Short", color: "Terracotta", price: 119, type: "Caraco",
    cats: ["lingerie", "sets", "demi-manche"], sizes: ["S", "M", "L"], colors: ["Terracotta"],
    img: P + "FB_IMG_1783911626355.jpg", img2: P + "Screenshot_20260713_032428_Instagram.jpg",
    gallery: [P + "FB_IMG_1783911626355.jpg", P + "Screenshot_20260713_032428_Instagram.jpg"],
    flags: [], composition: "Caraco dentelle + short imprimé" }),
  prod({ id: "trousseau-ivoire", title: "Trousseau Satin", color: "Ivoire", price: 210, type: "Parure",
    cats: ["mariage", "nuit"], sizes: ["S", "M", "L"], colors: ["Ivoire"],
    img: P + "Screenshot_20260713_032345_Instagram.jpg", img2: P + "Screenshot_20260713_032334_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032345_Instagram.jpg", P + "Screenshot_20260713_032334_Instagram.jpg"],
    flags: [], composition: "Peignoir satin + nuisette dentelle + culotte" }),
  prod({ id: "pyjama-rose", title: "Pyjama Satin", color: "Bois de Rose", price: 139, type: "Pyjama",
    cats: ["nuit"], sizes: ["S", "M", "L", "XL", "2X"], colors: ["Bois de rose"],
    img: P + "Screenshot_20260713_032513_Instagram.jpg", img2: P + "Screenshot_20260713_032513_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032513_Instagram.jpg"],
    flags: ["best"], composition: "Chemise boutonnée + pantalon · satin · passepoil contrasté" }),
  prod({ id: "caraco-ecru", title: "Caraco Dentelle", color: "Écru", price: 95, type: "Caraco",
    cats: ["lingerie", "sets"], sizes: ["S", "M", "L"], colors: ["Écru"],
    img: P + "Screenshot_20260713_032353_Instagram.jpg", img2: P + "Screenshot_20260713_032414_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032353_Instagram.jpg", P + "Screenshot_20260713_032414_Instagram.jpg"],
    flags: [], composition: "Caraco + culotte · dentelle festonnée" }),
  prod({ id: "cocooning-terracotta", title: "Ensemble Cocooning", color: "Terracotta", price: 115, type: "Pyjama",
    cats: ["demi-manche", "nuit"], sizes: ["S", "M", "L", "XL"], colors: ["Terracotta"],
    img: P + "Screenshot_20260713_032428_Instagram.jpg", img2: P + "FB_IMG_1783911626355.jpg",
    gallery: [P + "Screenshot_20260713_032428_Instagram.jpg", P + "FB_IMG_1783911626355.jpg"],
    flags: [], composition: "Caraco dentelle + short + pantalon imprimé" }),
  prod({ id: "nuisette-champagne", title: "Nuisette Satin", color: "Champagne", price: 99, type: "Nuisette",
    cats: ["nuit", "mariage"], sizes: ["S", "M", "L"], colors: ["Champagne"],
    img: P + "Screenshot_20260713_032414_Instagram.jpg", img2: P + "Screenshot_20260713_032345_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032414_Instagram.jpg", P + "Screenshot_20260713_032345_Instagram.jpg"],
    flags: ["new"], composition: "Satin & dentelle brodée" }),
  prod({ id: "peignoir-fleuri", title: "Peignoir Fleuri", color: "Rose Demi-Manche", price: 135, type: "Peignoir",
    cats: ["demi-manche"], sizes: ["S", "M", "L", "XL"], colors: ["Rose fleuri"],
    img: M + "Screenshot_20260713_032144_Instagram.jpg", img2: M + "Screenshot_20260713_032131_Instagram.jpg",
    gallery: [M + "Screenshot_20260713_032144_Instagram.jpg", M + "Screenshot_20260713_032131_Instagram.jpg", M + "Screenshot_20260713_032150_Instagram.jpg"],
    flags: ["new"], composition: "Peignoir à manches volantées · voile fleuri · caraco satin" }),
  prod({ id: "balconnet-ecru", title: "Balconnet Dentelle", color: "Écru", price: 89, type: "Balconnet",
    cats: ["lingerie"], sizes: ["30", "32", "34", "36", "B", "C", "D", "E"], colors: ["Écru"],
    img: P + "Screenshot_20260713_032353_Instagram.jpg", img2: P + "Screenshot_20260713_032414_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032353_Instagram.jpg"],
    flags: [], composition: "Balconnet armé · dentelle festonnée · bretelles réglables" }),
  prod({ id: "body-champagne", title: "Body Dentelle", color: "Champagne", price: 145, type: "Body",
    cats: ["lingerie", "sets"], sizes: ["S", "M", "L", "32", "34", "36", "C", "D"], colors: ["Champagne"],
    img: P + "Screenshot_20260713_032414_Instagram.jpg", img2: P + "Screenshot_20260713_032353_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032414_Instagram.jpg"],
    flags: [], composition: "Body dentelle & satin · entrejambe pression" }),
  prod({ id: "porte-jarretelles", title: "Porte-jarretelles", color: "Dentelle", price: 55, type: "Porte-jarretelles",
    cats: ["lingerie"], sizes: ["S", "M", "L"], colors: ["Noir", "Écru"],
    img: P + "Screenshot_20260713_032448_Instagram.jpg", img2: P + "Screenshot_20260713_032353_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032448_Instagram.jpg"],
    flags: [], composition: "Dentelle · jarretelles réglables" }),
  prod({ id: "tanga-dentelle", title: "Tanga Dentelle", color: "Rose & Noir", price: 29, type: "Tanga",
    cats: ["slips"], sizes: ["XS", "S", "M", "L", "XL"], colors: ["Rose", "Noir"],
    img: P + "Screenshot_20260713_032448_Instagram.jpg", img2: P + "Screenshot_20260713_032448_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032448_Instagram.jpg"],
    flags: [], composition: "Dentelle florale · dos échancré" }),
  prod({ id: "nuisette-blanche", title: "Nuisette Mariée", color: "Blanc", price: 160, type: "Nuisette",
    cats: ["mariage", "nuit"], sizes: ["S", "M", "L"], colors: ["Blanc"],
    img: P + "Screenshot_20260713_032334_Instagram.jpg", img2: P + "Screenshot_20260713_032345_Instagram.jpg",
    gallery: [P + "Screenshot_20260713_032334_Instagram.jpg", P + "Screenshot_20260713_032345_Instagram.jpg"],
    flags: ["new"], composition: "Satin nacré · guipure · dos ouvert" }),
  prod({ id: "maillot-couvrant", title: "Maillot Couvrant", color: "Lavande", price: 120, type: "Maillot",
    cats: ["maillots", "nouveautes"], sizes: ["S", "M", "L", "XL"], colors: ["Lavande"],
    img: M + "FB_IMG_1783911600052.jpg", img2: M + "Screenshot_20260713_032217_Instagram.jpg",
    gallery: [M + "FB_IMG_1783911600052.jpg"],
    flags: [], composition: "Maillot couvrant · ceinture drapée" })
];

const DEFAULT_JOURNAL = [
  { id: "parure-mariage", tag: "Mariage", title: "Bien choisir sa parure de mariage",
    img: P + "Screenshot_20260713_032334_Instagram.jpg", href: "collections.html?cat=mariage",
    excerpt: "La parure de la mariée se choisit longtemps avant la robe, car elle en dessine la ligne. Nous vous guidons entre satin, dentelle et broderie pour une pièce qui vous ressemble le jour J." },
  { id: "art-demi-manche", tag: "Style", title: "L'art du demi-manche",
    img: M + "Screenshot_20260713_032144_Instagram.jpg", href: "collections.html?cat=demi-manche",
    excerpt: "Le demi-manche fleuri est notre façon d'habiller les matins tranquilles avec élégance. Découvrez comment porter cette loungewear de la chambre au petit-déjeuner sans jamais renoncer au raffinement." },
  { id: "entretien-satin", tag: "Entretien", title: "Prendre soin du satin & de la dentelle",
    img: M + "Screenshot_20260713_032150_Instagram.jpg", href: "styles-explained.html#entretien",
    excerpt: "Une belle pièce faite main mérite des gestes doux : lavage à la main, eau tiède et séchage à plat. Nos conseils pour garder l'éclat du satin et la finesse de la dentelle saison après saison." },
  { id: "trouver-sa-taille", tag: "Conseils", title: "Trouver sa taille, sans se tromper",
    img: P + "Screenshot_20260713_032353_Instagram.jpg", href: "size-guide.html",
    excerpt: "La bonne taille change tout : le maintien, le confort et la ligne de la pièce sur votre corps. Suivez notre guide de mesures pour commander sereinement, même à distance partout en Tunisie." },
  { id: "teintes-saison", tag: "Style", title: "Les teintes de la saison",
    img: P + "Screenshot_20260713_032448_Instagram.jpg", href: "collections.html?cat=lingerie",
    excerpt: "Bois de rose, terracotta, champagne et ivoire : notre palette s'inspire des lumières douces de Monastir. Voici comment associer ces teintes pour composer une lingerie qui vous va au teint." },
  { id: "ecrin-miracle", tag: "Coulisses", title: "L'écrin MIRACLE : l'art d'offrir",
    img: P + "Screenshot_20260713_032414_Instagram.jpg", href: "collections.html?cat=mariage",
    excerpt: "Chaque commande part de l'atelier dans un écrin cadeau offert, pensé pour prolonger l'émotion de l'ouverture. Un présent de mariée, d'anniversaire ou simplement une attention pour soi." }
].map(function (a) {
  return Object.assign({ date: "2026-07-13", body: "", active: true,
    createdAt: "2026-07-13T10:00:00.000Z", updatedAt: "2026-07-13T10:00:00.000Z" }, a, { body: a.excerpt });
});

module.exports = {
  rawPut, rawGet, rawDel,
  signToken, verifyToken, isAuthed, isSuper,
  hashPassword, checkPassword, safeEqual,
  readDoc, writeDoc, deleteDoc, listPrefix, latestPerDoc, readManyDocs, fetchDoc, versionOf,
  cors, ok, err, uid, orderId, slugify,
  DEFAULT_PRODUCTS, DEFAULT_JOURNAL
};
