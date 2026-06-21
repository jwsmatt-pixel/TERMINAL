// engine/realClock.js — the REAL clock (governs open/closed; never compressed, §5.1)
import { ZONES } from "../config/zones.js";

function toUtcHours(d) {
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}

export const RealClock = {
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
