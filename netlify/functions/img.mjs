/* Serves uploaded images stored in Netlify Blobs at /api/img/<key>. */
import { getStore } from "@netlify/blobs";

const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export default async (request) => {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/api\/img\//, ""));
  if (!key || key.includes("..") || !key.startsWith("img/")) {
    return new Response("Not found", { status: 404 });
  }
  const store = getStore({ name: "miracle-db", consistency: "strong" });
  const entry = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry || !entry.data) return new Response("Not found", { status: 404 });
  const ext = key.split(".").pop().toLowerCase();
  const type = (entry.metadata && entry.metadata.contentType) || TYPES[ext] || "application/octet-stream";
  return new Response(entry.data, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*"
    }
  });
};

export const config = { path: "/api/img/*" };
