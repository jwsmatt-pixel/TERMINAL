<!DOCTYPE html>
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

/* ===== src/config/constants.js ===== */
// config/constants.js — scalar constants only (no module coupling)
const SCHEMA_VERSION = "0.2";

// Two-clock model (§5.3). SimClock rate by mode. 'idle' is the calm offline/at-rest rate.
const SIM_RATES = { active: 60, fastforward: 300, idle: 1 };
const SIM_TICK_MS = 300; // cadence the SimClock fires onTick

// Phase-5 reads these; defined here so the contract is stable.
const OFFLINE_CRYPTO_DRIFT_PER_HOUR = 0.0; // calm offline crypto drift (Phase 5 fills behaviour)

const STARTING_CASH = 10000; // §8.1
const DEFAULT_HOME_ZONE = "SYDNEY";


/* ===== src/config/zones.js ===== */
// config/zones.js — canonical exchange zones (widened UTC windows, §5.2/§5.6)
// openUTC/closeUTC are decimal UTC hours. A window with open>close wraps midnight.
const ZONES = {
  SYDNEY:   { label: "Sydney",   city: "ASX",  openUTC: 22.0, closeUTC: 6.5,  tz: 10 },
  TOKYO:    { label: "Tokyo",    city: "TSE",  openUTC: 23.0, closeUTC: 7.0,  tz: 9  },
  HONGKONG: { label: "Hong Kong",city: "HKEX", openUTC: 0.5,  closeUTC: 9.0,  tz: 8  },
  LONDON:   { label: "London",   city: "LSE",  openUTC: 6.5,  closeUTC: 17.0, tz: 1  },
  NEWYORK:  { label: "New York", city: "NYSE", openUTC: 12.5, closeUTC: 22.0, tz: -4 },
};

const ZONE_KEYS = Object.keys(ZONES);


/* ===== src/config/ranks.js ===== */
// config/ranks.js — Trader Rank curve (§8.2). Fast early, ~1.8x later.
const RANKS = [10000, 15000, 25000, 50000, 100000, 180000, 324000, 583000];

function rankFor(netWorthValue) {
  let r = 1;
  for (let i = 0; i < RANKS.length; i++) {
    if (netWorthValue >= RANKS[i]) r = i + 1;
  }
  return Math.max(1, r);
}


/* ===== src/config/assets.js ===== */
// config/assets.js — the 9-asset launch roster (§4.1)
// seedPrice is static & synthetic-with-grounding (§6.3). dividendYield only on BLUECHIP.
const ASSETS = [
  { id: "AVT", name: "Avalon Tech",  cls: "BLUECHIP", zone: "NEWYORK", seedPrice: 152.40,  dividendYield: 0.018, unlockRank: 1 },
  { id: "HBC", name: "Harbor Bank",  cls: "BLUECHIP", zone: "LONDON",  seedPrice: 88.10,   dividendYield: 0.041, unlockRank: 1 },
  { id: "KMG", name: "Kaimei Group", cls: "BLUECHIP", zone: "TOKYO",   seedPrice: 41.30,   dividendYield: 0.029, unlockRank: 1 },
  { id: "ORB", name: "Orbit",        cls: "CRYPTO",   zone: null,      seedPrice: 61240,    dividendYield: 0,     unlockRank: 1 },
  { id: "NVA", name: "Nova",         cls: "CRYPTO",   zone: null,      seedPrice: 3120,     dividendYield: 0,     unlockRank: 2 },
  { id: "DGE", name: "Doginu",       cls: "CRYPTO",   zone: null,      seedPrice: 0.1420,   dividendYield: 0,     unlockRank: 2 },
  { id: "AUX", name: "Gold",         cls: "GOLD",     zone: "GOLD",    seedPrice: 2014.50,  dividendYield: 0,     unlockRank: 1 },
  { id: "NEO", name: "Neodymium",    cls: "RARE",     zone: "RARE",    seedPrice: 138.0,    dividendYield: 0,     unlockRank: 4 },
  { id: "DYS", name: "Dysprosium",   cls: "RARE",     zone: "RARE",    seedPrice: 412.0,    dividendYield: 0,     unlockRank: 5 },
];

const ASSET_IDS = ASSETS.map(a => a.id);
const assetById = id => ASSETS.find(a => a.id === id) || null;


/* ===== src/engine/realClock.js ===== */
// engine/realClock.js — the REAL clock (governs open/closed; never compressed, §5.1)

function toUtcHours(d) {
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}

const RealClock = {
  now() { return Date.now(); },

  utcHours() { return toUtcHours(new Date()); },

  // UTC hours for an arbitrary timestamp (used by the offline resolver).
  utcHoursAt(ts) { return toUtcHours(new Date(ts)); },

  // Local wall time for a zone, derived from UTC + the zone's tz offset.
  localTime(zoneKey, ts = Date.now()) {
    const z = ZONES[zoneKey];
    if (!z) throw new Error("unknown zone: " + zoneKey);
    const d = new Date(ts);
    const h = ((d.getUTCHours() + z.tz) % 24 + 24) % 24;
    return { h: Math.floor(h), m: d.getUTCMinutes(), s: d.getUTCSeconds(), label: z.label };
  },
};


/* ===== src/engine/simClock.js ===== */
// engine/simClock.js — the MARKET SIM clock (governs price-evolution speed, §5.1/§5.3)
// Phase 1 provides the cadence + rate. Phase 2's price engine consumes onTick.

function createSimClock() {
  let mode = "idle";
  let timer = null;
  let last = Date.now();

  return {
    get mode() { return mode; },
    get rate() { return SIM_RATES[mode]; },

    setMode(m) {
      if (!(m in SIM_RATES)) throw new Error("bad sim mode: " + m);
      mode = m;
      return this;
    },

    // sim-milliseconds advanced for a given real-time delta, at the current rate.
    simMsFor(realDeltaMs) { return realDeltaMs * SIM_RATES[mode]; },

    start(onTick) {
      this.stop();
      last = Date.now();
      timer = setInterval(() => {
        const now = Date.now();
        const realDeltaMs = now - last;
        last = now;
        onTick({ realDeltaMs, simMs: realDeltaMs * SIM_RATES[mode], mode });
      }, SIM_TICK_MS);
      return this;
    },

    stop() {
      if (timer) { clearInterval(timer); timer = null; }
      return this;
    },

    get running() { return timer !== null; },
  };
}

// Default shared instance (matches the brief's SimClock.* surface).
const SimClock = createSimClock();


/* ===== src/engine/marketHours.js ===== */
// engine/marketHours.js — open/closed by real time + per-class tradability (§5.2/§5.4)

// Is `h` inside [open, close)? Handles windows that wrap past midnight.
function inWindow(open, close, h) {
  return open < close ? (h >= open && h < close) : (h >= open || h < close);
}

const MarketHours = {
  isOpen(zoneKey, h = RealClock.utcHours()) {
    const z = ZONES[zoneKey];
    if (!z) return false;
    return inWindow(z.openUTC, z.closeUTC, h);
  },

  openZones(h = RealClock.utcHours()) {
    return ZONE_KEYS.filter(k => this.isOpen(k, h));
  },

  // Hours until a zone next opens. 0 if currently open.
  hoursUntilOpen(zoneKey, h = RealClock.utcHours()) {
    const z = ZONES[zoneKey];
    if (!z) return Infinity;
    if (this.isOpen(zoneKey, h)) return 0;
    let d = z.openUTC - h;
    if (d < 0) d += 24;
    return d;
  },

  // Per-class rules (§5, locked):
  //  CRYPTO  -> always   RARE -> always (quiet)   GOLD -> LONDON or NEWYORK   BLUECHIP -> its own zone
  assetTradable(asset, h = RealClock.utcHours()) {
    switch (asset.cls) {
      case "CRYPTO": return true;
      case "RARE":   return true;
      case "GOLD":   return this.isOpen("LONDON", h) || this.isOpen("NEWYORK", h);
      case "BLUECHIP": return this.isOpen(asset.zone, h);
      default: return false;
    }
  },
};


/* ===== src/engine/offlineResolver.js ===== */
// engine/offlineResolver.js — Phase 1 rules + plumbing ONLY (§5.4)
// Computes elapsed real time and which zones flipped open/closed while away.
// Closed markets stay frozen (no price move here). Dividend MATH + the away->return
// summary are Phase 5: this build only invokes the dividend hook with its inputs.

const OfflineResolver = {
  resolveOnLoad(savedState, nowMs = Date.now(), dividendHook = () => {}) {
    const lastTs = typeof savedState.lastSeenTs === "number" ? savedState.lastSeenTs : nowMs;
    const elapsedMs = Math.max(0, nowMs - lastTs);
    const zoneTransitions = this.zoneTransitions(lastTs, nowMs);

    // Phase 5 will compute accrual; we wire the hook with the inputs it needs.
    dividendHook({ elapsedMs, holdings: savedState.holdings || [] });

    return { elapsedMs, zoneTransitions };
  },

  // Sample the away window to detect open<->closed flips per zone.
  // Step is coarse (15 min) but windows are widened (hours), so flips are caught.
  zoneTransitions(fromMs, toMs, stepMs = 15 * 60 * 1000) {
    const out = [];
    if (toMs <= fromMs) return out;
    for (const zk of ZONE_KEYS) {
      let prev = MarketHours.isOpen(zk, RealClock.utcHoursAt(fromMs));
      for (let t = fromMs + stepMs; t <= toMs; t += stepMs) {
        const open = MarketHours.isOpen(zk, RealClock.utcHoursAt(t));
        if (open !== prev) {
          out.push({ zone: zk, kind: open ? "opened" : "closed", atMs: t });
          prev = open;
        }
      }
    }
    out.sort((a, b) => a.atMs - b.atMs);
    return out;
  },
};


/* ===== src/state/storage.js ===== */
// state/storage.js — persistence adapter.
// Browser: localStorage (§9.2). Node/headless: in-memory map (lets the gate run anywhere).
const mem = new Map();
const hasLS = (typeof localStorage !== "undefined");

const Storage = {
  get(k) { return hasLS ? localStorage.getItem(k) : (mem.has(k) ? mem.get(k) : null); },
  set(k, v) { if (hasLS) localStorage.setItem(k, v); else mem.set(k, v); },
  remove(k) { if (hasLS) localStorage.removeItem(k); else mem.delete(k); },
  get backend() { return hasLS ? "localStorage" : "memory"; },
};


/* ===== src/state/schema.js ===== */
// state/schema.js — validators are the contract for the QA gate (§4/§8).

const CLASSES = ["BLUECHIP", "CRYPTO", "GOLD", "RARE"];
const ZONE_REFS = [...ZONE_KEYS, "GOLD", "RARE", null]; // asset.zone allowed values

function validateAsset(a) {
  const e = [];
  if (typeof a.id !== "string" || !a.id) e.push("id must be non-empty string");
  if (typeof a.name !== "string" || !a.name) e.push("name must be non-empty string");
  if (!CLASSES.includes(a.cls)) e.push("cls must be one of " + CLASSES.join("|"));
  if (!ZONE_REFS.includes(a.zone)) e.push("zone invalid");
  if (typeof a.seedPrice !== "number" || a.seedPrice <= 0) e.push("seedPrice must be > 0");
  if (typeof a.dividendYield !== "number" || a.dividendYield < 0) e.push("dividendYield must be >= 0");
  if (a.cls !== "BLUECHIP" && a.dividendYield !== 0) e.push("only BLUECHIP may pay a dividend");
  if (!Number.isInteger(a.unlockRank) || a.unlockRank < 1) e.push("unlockRank must be int >= 1");
  const allowed = ["id", "name", "cls", "zone", "seedPrice", "dividendYield", "unlockRank"];
  for (const k in a) if (!allowed.includes(k)) e.push("unknown key: " + k);
  return { ok: e.length === 0, errors: e };
}

function validateHolding(h) {
  const e = [];
  if (typeof h.assetId !== "string" || !h.assetId) e.push("assetId must be non-empty string");
  if (typeof h.qty !== "number" || h.qty < 0) e.push("qty must be >= 0");
  if (typeof h.avgCost !== "number" || h.avgCost < 0) e.push("avgCost must be >= 0");
  for (const k in h) if (!["assetId", "qty", "avgCost"].includes(k)) e.push("unknown key: " + k);
  return { ok: e.length === 0, errors: e };
}

function validateSaveState(s) {
  const e = [];
  if (s.schemaVersion !== SCHEMA_VERSION) e.push("schemaVersion must be " + SCHEMA_VERSION);
  if (!ZONE_KEYS.includes(s.homeZone)) e.push("homeZone must be a zone key");
  if (typeof s.lastSeenTs !== "number") e.push("lastSeenTs must be a number");
  if (typeof s.cash !== "number" || s.cash < 0) e.push("cash must be >= 0");
  if (!Number.isInteger(s.rank) || s.rank < 1) e.push("rank must be int >= 1");
  if (!Number.isInteger(s.prestige) || s.prestige < 0) e.push("prestige must be int >= 0");
  if (!Array.isArray(s.holdings)) e.push("holdings must be an array");
  else s.holdings.forEach((h, i) => { const r = validateHolding(h); if (!r.ok) e.push(`holdings[${i}]: ${r.errors.join(", ")}`); });
  if (typeof s.pendingDiv !== "number" || s.pendingDiv < 0) e.push("pendingDiv must be >= 0");
  if (!Array.isArray(s.unlockedAssets)) e.push("unlockedAssets must be an array");
  if (!Array.isArray(s.unlockedZones)) e.push("unlockedZones must be an array");
  if (!Array.isArray(s.achievements)) e.push("achievements must be an array");
  const allowed = ["schemaVersion", "homeZone", "lastSeenTs", "cash", "rank", "prestige",
    "holdings", "pendingDiv", "unlockedAssets", "unlockedZones", "achievements"];
  for (const k in s) if (!allowed.includes(k)) e.push("unknown key: " + k);
  return { ok: e.length === 0, errors: e };
}



/* ===== src/state/state.js ===== */
// state/state.js — canonical runtime state + pure selectors (§5/§8).

function initialState(now = Date.now()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    homeZone: DEFAULT_HOME_ZONE,
    lastSeenTs: now,
    cash: STARTING_CASH,
    rank: 1,
    prestige: 0,
    holdings: [],
    pendingDiv: 0,
    unlockedAssets: ASSETS.filter(a => a.unlockRank <= 1).map(a => a.id),
    unlockedZones: [DEFAULT_HOME_ZONE],
    achievements: [],
  };
}

// netWorth = cash + Σ qty * price. priceLookup(assetId) -> number.
function netWorth(state, priceLookup) {
  let held = 0;
  for (const h of state.holdings) held += h.qty * (priceLookup(h.assetId) || 0);
  return state.cash + held;
}



/* ===== src/state/save.js ===== */
// state/save.js — serialize / deserialize / save / load with version migration (§8).

const KEY = "terminal.save";

// v0.1 -> v0.2 migration. Additive + lossless. Returns { state, applied: string[] }.
function migrate(raw) {
  const applied = [];
  let s = { ...raw };

  // old { version } -> { schemaVersion }
  if (s.version && !s.schemaVersion) {
    s.schemaVersion = s.version === "0.1" ? "0.2" : s.version;
    delete s.version;
    applied.push("v0.1→v0.2: version → schemaVersion");
  }
  if (s.schemaVersion === "0.1") {
    s.schemaVersion = "0.2";
    applied.push("v0.1→v0.2: schemaVersion bump");
  }

  // old holdings map { id: qty } (+ separate cost map) -> Holding[]
  if (s.holdings && !Array.isArray(s.holdings)) {
    s.holdings = Object.entries(s.holdings).map(([assetId, qty]) => ({
      assetId,
      qty,
      avgCost: (s.cost && s.cost[assetId]) || 0,
    }));
    delete s.cost;
    applied.push("v0.1→v0.2: holdings map → array");
  }

  // fill any newly-required fields with defaults
  const defaults = {
    schemaVersion: SCHEMA_VERSION,
    homeZone: DEFAULT_HOME_ZONE,
    lastSeenTs: Date.now(),
    cash: STARTING_CASH,
    rank: 1,
    prestige: 0,
    holdings: [],
    pendingDiv: 0,
    unlockedAssets: [],
    unlockedZones: [DEFAULT_HOME_ZONE],
    achievements: [],
  };
  let filled = false;
  for (const k in defaults) {
    if (s[k] === undefined) { s[k] = defaults[k]; filled = true; }
  }
  if (filled) applied.push("v0.1→v0.2: filled missing defaults");

  // drop unknown keys (post-migration the shape must validate clean)
  const allowed = Object.keys(defaults);
  for (const k of Object.keys(s)) if (!allowed.includes(k)) delete s[k];

  return { state: s, applied };
}

const SaveSystem = {
  SCHEMA_VERSION,

  serialize(state) {
    const v = validateSaveState(state);
    if (!v.ok) throw new Error("invalid state: " + v.errors.join("; "));
    return JSON.stringify(state);
  },

  deserialize(json) {
    const raw = JSON.parse(json);
    const { state, applied } = migrate(raw);
    const v = validateSaveState(state);
    if (!v.ok) throw new Error("invalid after migrate: " + v.errors.join("; "));
    return { state, migrationsApplied: applied };
  },

  save(state) {
    Storage.set(KEY, this.serialize(state));
    return true;
  },

  load() {
    const json = Storage.get(KEY);
    if (!json) return null;
    return this.deserialize(json).state;
  },

  migrate(raw) { return migrate(raw); },

  clear() { Storage.remove(KEY); },
};


/* ===== dev/diagnostics.js ===== */
// dev/diagnostics.js — the Phase 1 QA gate (§8). Importable (browser) + runnable (node).

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function runAll() {
  const results = [];
  const check = (name, cond, detail = "") => results.push({ name, ok: !!cond, detail });

  // 1) SCHEMAS — accept good, reject bad
  check("schema: all 9 assets valid", ASSETS.every(a => validateAsset(a).ok));
  check("schema: rejects bad cls", !validateAsset({ ...ASSETS[0], cls: "STONKS" }).ok);
  check("schema: rejects unknown key", !validateAsset({ ...ASSETS[0], wat: 1 }).ok);
  check("schema: rejects dividend on non-bluechip", !validateAsset({ ...ASSETS[3], dividendYield: 0.05 }).ok);
  check("schema: rejects negative holding qty", !validateHolding({ assetId: "ORB", qty: -1, avgCost: 5 }).ok);
  check("schema: fresh initialState validates", validateSaveState(initialState()).ok);
  check("schema: rejects unknown save key", !validateSaveState({ ...initialState(), hacker: true }).ok);

  // 2) REALCLOCK
  const uh = RealClock.utcHours();
  check("realClock: utcHours in [0,24)", uh >= 0 && uh < 24);
  const lt = RealClock.localTime("LONDON");
  check("realClock: localTime label", lt.label === "London" && lt.h >= 0 && lt.h < 24);

  // 3) MARKETHOURS — known hours + midnight wrap
  check("hours: NEWYORK open at 14:00", MarketHours.isOpen("NEWYORK", 14));
  check("hours: NEWYORK closed at 02:00", !MarketHours.isOpen("NEWYORK", 2));
  check("hours: LONDON open at 10:00", MarketHours.isOpen("LONDON", 10));
  check("hours: SYDNEY wrap open at 23:00", MarketHours.isOpen("SYDNEY", 23));
  check("hours: SYDNEY wrap open at 00:00", MarketHours.isOpen("SYDNEY", 0));
  check("hours: SYDNEY closed at 13:00", !MarketHours.isOpen("SYDNEY", 13));
  // full 24h sweep returns booleans for every zone
  let sweepOk = true;
  for (let h = 0; h < 24; h += 0.25) for (const z of ZONE_KEYS) if (typeof MarketHours.isOpen(z, h) !== "boolean") sweepOk = false;
  check("hours: 24h sweep all boolean", sweepOk);

  // 4) ASSETTRADABLE — class rules at h=23 (TOKYO open; LON/NY closed)
  check("tradable: crypto always (h=23)", MarketHours.assetTradable(assetById("ORB"), 23));
  check("tradable: rare always (h=23)", MarketHours.assetTradable(assetById("NEO"), 23));
  check("tradable: gold closed when LON+NY closed (h=23)", !MarketHours.assetTradable(assetById("AUX"), 23));
  check("tradable: KMG(Tokyo) open at h=23", MarketHours.assetTradable(assetById("KMG"), 23));
  check("tradable: AVT(NY) closed at h=23", !MarketHours.assetTradable(assetById("AVT"), 23));
  check("tradable: gold open at h=14 (NY open)", MarketHours.assetTradable(assetById("AUX"), 14));

  // 5) SIMCLOCK — rate + mode + cadence
  const sc = createSimClock();
  check("sim: idle rate 1", sc.rate === 1);
  sc.setMode("active");
  check("sim: active rate 60", sc.rate === 60);
  check("sim: simMsFor 1000ms@60x = 60000", sc.simMsFor(1000) === 60000);
  sc.setMode("fastforward");
  check("sim: fastforward rate 300", sc.rate === 300);
  let threw = false; try { sc.setMode("warp"); } catch { threw = true; }
  check("sim: bad mode throws", threw);
  // one real tick
  sc.setMode("active");
  const tick = await new Promise(res => { sc.start(t => { sc.stop(); res(t); }); });
  check("sim: onTick shape {realDeltaMs,simMs}", typeof tick.realDeltaMs === "number" && typeof tick.simMs === "number");
  sc.stop();

  // 6) STATE selectors
  const st = initialState();
  st.holdings = [{ assetId: "ORB", qty: 2, avgCost: 60000 }];
  st.cash = 10000;
  const nw = netWorth(st, id => ({ ORB: 61240 }[id] || 0));
  check("state: netWorth = cash + qty*price", nw === 10000 + 2 * 61240);
  check("state: rankFor(60000) === 4", rankFor(60000) === 4);
  check("state: rankFor(10000) === 1", rankFor(10000) === 1);

  // 7) SAVE round-trip
  SaveSystem.clear();
  const before = initialState();
  before.holdings = [{ assetId: "AUX", qty: 3, avgCost: 2010 }];
  before.cash = 4321.55;
  SaveSystem.save(before);
  const after = SaveSystem.load();
  check("save: round-trip deep-equal", eq(before, after));

  // 8) MIGRATION v0.1 -> v0.2, lossless
  const legacy = {
    version: "0.1",
    homeZone: "TOKYO",
    lastSeenTs: 1719000000000,
    cash: 7777,
    holdings: { ORB: 2, AUX: 1 }, // old map shape
    cost: { ORB: 60000, AUX: 2000 },
  };
  const { state: migrated, migrationsApplied } = SaveSystem.deserialize(JSON.stringify(legacy));
  check("migrate: schemaVersion now 0.2", migrated.schemaVersion === "0.2");
  check("migrate: holdings became array", Array.isArray(migrated.holdings) && migrated.holdings.length === 2);
  check("migrate: cash preserved", migrated.cash === 7777);
  check("migrate: avgCost carried from old cost map", migrated.holdings.find(h => h.assetId === "ORB").avgCost === 60000);
  check("migrate: migrationsApplied recorded", migrationsApplied.length > 0);
  check("migrate: result validates", validateSaveState(migrated).ok);

  // 9) OFFLINE RESOLVER — elapsed + transitions + dividend hook
  let hookArgs = null;
  const saved = { ...initialState(), lastSeenTs: Date.now() - 11 * 3600 * 1000, holdings: [{ assetId: "HBC", qty: 5, avgCost: 88 }] };
  const res = OfflineResolver.resolveOnLoad(saved, Date.now(), a => { hookArgs = a; });
  check("offline: elapsedMs ~ 11h", Math.abs(res.elapsedMs - 11 * 3600 * 1000) < 60000);
  check("offline: zone transitions detected over 11h", res.zoneTransitions.length > 0);
  check("offline: transition shape", res.zoneTransitions.every(t => t.zone && (t.kind === "opened" || t.kind === "closed") && typeof t.atMs === "number"));
  check("offline: dividend hook called with holdings", hookArgs && Array.isArray(hookArgs.holdings) && hookArgs.holdings.length === 1);

  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  return { pass, fail, total: results.length, results };
}



var out=document.getElementById("out");
runAll().then(function(r){
  out.innerHTML=r.results.map(function(x){return '<div class="row"><span class="tag '+(x.ok?'pass':'fail')+'">'+(x.ok?'PASS':'FAIL')+'</span><span class="name">'+x.name+'</span></div>';}).join("")
   +'<div class="summary '+(r.fail===0?'ok':'bad')+'">'+(r.fail===0?'ALL PASS':r.fail+' FAILED')+' &nbsp;('+r.pass+'/'+r.total+')</div>';
});
})();
</script></body></html>