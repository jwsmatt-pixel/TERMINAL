// dev/build-standalone.mjs — concatenate the ESM sources into ONE classic-script HTML
// so the diagnostics can run from a double-clicked file:// (no server needed).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// dependency order
const order = [
  "src/config/constants.js",
  "src/config/zones.js",
  "src/config/ranks.js",
  "src/config/assets.js",
  "src/engine/realClock.js",
  "src/engine/simClock.js",
  "src/engine/marketHours.js",
  "src/engine/offlineResolver.js",
  "src/state/storage.js",
  "src/state/schema.js",
  "src/state/state.js",
  "src/state/save.js",
  "dev/diagnostics.js",
];

function strip(src) {
  return src
    .split("\n")
    .filter(l => !/^\s*import\s.+from\s.+;?\s*$/.test(l))      // drop import lines
    .filter(l => !/^\s*export\s*\{[^}]*\}\s*;?\s*$/.test(l))    // drop `export { ... };`
    .map(l => l.replace(/^(\s*)export\s+/, "$1")) // unwrap `export ...` (const/function/async function/etc.)
    .join("\n");
}

let body = "";
for (const f of order) {
  let src = readFileSync(resolve(root, f), "utf8");
  if (f.endsWith("diagnostics.js")) src = src.split("// node entrypoint")[0]; // cut node runner
  body += `\n/* ===== ${f} ===== */\n` + strip(src) + "\n";
}

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TERMINAL P1 — standalone diagnostics</title>
<style>
 body{background:#050805;color:#56ff8c;font-family:ui-monospace,Menlo,Consolas,monospace;margin:0;padding:28px;line-height:1.5}
 h1{font-size:15px;letter-spacing:1px;color:#ffb000;margin:0 0 4px}
 .sub{color:#2fae5e;font-size:13px;margin-bottom:18px}
 .row{display:flex;gap:10px;padding:3px 0;font-size:14px}
 .tag{width:46px;font-weight:bold}.pass{color:#56ff8c}.fail{color:#ff5d54}.name{color:#9cf0bd}
 .summary{margin-top:18px;padding:10px 14px;border:1px solid #16331f;border-radius:6px;font-size:16px}
 .ok{color:#56ff8c;border-color:#2fae5e}.bad{color:#ff5d54;border-color:#7a2a26}
</style></head><body>
<h1>TERMINAL v0.2 · PHASE 1 — STANDALONE DIAGNOSTICS</h1>
<div class="sub">single-file · runs from file:// · generated from /src — do not edit by hand</div>
<div id="out">running…</div>
<script>
(function(){
${body}
var out=document.getElementById("out");
runAll().then(function(r){
  out.innerHTML=r.results.map(function(x){return '<div class="row"><span class="tag '+(x.ok?'pass':'fail')+'">'+(x.ok?'PASS':'FAIL')+'</span><span class="name">'+x.name+'</span></div>';}).join("")
   +'<div class="summary '+(r.fail===0?'ok':'bad')+'">'+(r.fail===0?'ALL PASS':r.fail+' FAILED')+' &nbsp;('+r.pass+'/'+r.total+')</div>';
});
})();
</script></body></html>`;

writeFileSync(resolve(root, "dev/harness-standalone.html"), html);
console.log("wrote dev/harness-standalone.html (" + html.length + " bytes)");
