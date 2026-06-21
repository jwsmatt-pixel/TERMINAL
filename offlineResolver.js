// config/assets.js — the 9-asset launch roster (§4.1)
// seedPrice is static & synthetic-with-grounding (§6.3). dividendYield only on BLUECHIP.
export const ASSETS = [
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

export const ASSET_IDS = ASSETS.map(a => a.id);
export const assetById = id => ASSETS.find(a => a.id === id) || null;
