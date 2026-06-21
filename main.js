// state/storage.js — persistence adapter.
// Browser: localStorage (§9.2). Node/headless: in-memory map (lets the gate run anywhere).
const mem = new Map();
const hasLS = (typeof localStorage !== "undefined");

export const Storage = {
  get(k) { return hasLS ? localStorage.getItem(k) : (mem.has(k) ? mem.get(k) : null); },
  set(k, v) { if (hasLS) localStorage.setItem(k, v); else mem.set(k, v); },
  remove(k) { if (hasLS) localStorage.removeItem(k); else mem.delete(k); },
  get backend() { return hasLS ? "localStorage" : "memory"; },
};
