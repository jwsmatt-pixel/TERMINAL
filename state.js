// engine/marketHours.js — open/closed by real time + per-class tradability (§5.2/§5.4)
import { ZONES, ZONE_KEYS } from "../config/zones.js";
import { RealClock } from "./realClock.js";

// Is `h` inside [open, close)? Handles windows that wrap past midnight.
function inWindow(open, close, h) {
  return open < close ? (h >= open && h < close) : (h >= open || h < close);
}

export const MarketHours = {
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
