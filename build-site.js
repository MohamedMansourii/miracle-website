/* Copies the static storefront into _site/ (the Netlify publish dir) so the
   repo's server code, node_modules and design docs are never published. */
"use strict";
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "_site");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const f of fs.readdirSync(__dirname)) {
  if (f.endsWith(".html")) fs.copyFileSync(path.join(__dirname, f), path.join(OUT, f));
}
for (const dir of ["css", "js", "assets"]) {
  fs.cpSync(path.join(__dirname, dir), path.join(OUT, dir), { recursive: true });
}
console.log("_site ready:", fs.readdirSync(OUT).join(", "));
