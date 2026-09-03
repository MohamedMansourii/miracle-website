/* Bridges the existing (req, res)-style handlers in api/ to Netlify Functions'
   web-standard (Request) => Response signature. Keeps all business logic as-is. */
"use strict";

module.exports = function wrap(handler) {
  return async function (request) {
    const url = new URL(request.url);
    const query = {};
    url.searchParams.forEach(function (v, k) { query[k] = v; });
    const headers = {};
    request.headers.forEach(function (v, k) { headers[k.toLowerCase()] = v; });

    let body;
    if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
      const ct = headers["content-type"] || "";
      if (ct.indexOf("application/json") !== -1) {
        try { body = await request.json(); } catch (e) { body = {}; }
      } else {
        body = Buffer.from(await request.arrayBuffer());
      }
    }

    const req = { method: request.method, headers: headers, query: query, body: body };
    let statusCode = 200;
    const resHeaders = {};

    const result = await new Promise(function (resolve, reject) {
      const res = {
        setHeader: function (k, v) { resHeaders[k] = v; return res; },
        status: function (c) { statusCode = c; return res; },
        json: function (obj) { resolve({ body: JSON.stringify(obj), type: "application/json" }); },
        send: function (s) { resolve({ body: s === undefined ? "" : s, type: null }); },
        end: function (s) { resolve({ body: s === undefined ? "" : s, type: null }); }
      };
      Promise.resolve(handler(req, res)).catch(reject);
    });

    if (result.type) resHeaders["Content-Type"] = result.type;
    const empty = statusCode === 204 || statusCode === 304;
    return new Response(empty ? null : result.body, { status: statusCode, headers: resHeaders });
  };
};
