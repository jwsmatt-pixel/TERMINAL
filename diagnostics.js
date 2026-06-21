<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TERMINAL P1 — diagnostics</title>
<style>
  body{background:#050805;color:#56ff8c;font-family:ui-monospace,Menlo,Consolas,monospace;margin:0;padding:28px;line-height:1.5}
  h1{font-size:15px;letter-spacing:1px;color:#ffb000;margin:0 0 4px}
  .sub{color:#2fae5e;font-size:13px;margin-bottom:18px}
  .row{display:flex;gap:10px;padding:3px 0;font-size:14px}
  .tag{width:46px;font-weight:bold}
  .pass{color:#56ff8c}.fail{color:#ff5d54}
  .name{color:#9cf0bd}
  .summary{margin-top:18px;padding:10px 14px;border:1px solid #16331f;border-radius:6px;font-size:16px}
  .ok{color:#56ff8c;border-color:#2fae5e}.bad{color:#ff5d54;border-color:#7a2a26}
  a{color:#ffb000}
</style>
</head>
<body>
  <h1>TERMINAL v0.2 · PHASE 1 — DATA MODEL + TWO-CLOCK ENGINE</h1>
  <div class="sub">QA gate (§8) · run live in your browser · <a href="./index.html">status page</a> · <a href="./prototype.html">visual prototype</a></div>
  <div id="out">running…</div>
  <script type="module">
    import { runAll } from "./dev/diagnostics.js";
    const out = document.getElementById("out");
    runAll().then(r => {
      out.innerHTML = r.results.map(x =>
        `<div class="row"><span class="tag ${x.ok?'pass':'fail'}">${x.ok?'PASS':'FAIL'}</span><span class="name">${x.name}</span></div>`
      ).join("") +
      `<div class="summary ${r.fail===0?'ok':'bad'}">${r.fail===0?'ALL PASS':r.fail+' FAILED'} &nbsp;(${r.pass}/${r.total})</div>`;
    });
  </script>
</body>
</html>
