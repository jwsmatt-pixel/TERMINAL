// engine/offlineResolver.js — Phase 1 rules + plumbing ONLY (§5.4)
// Computes elapsed real time and which zones flipped open/closed while away.
// Closed markets stay frozen (no price move here). Dividend MATH + the away->return
// summary are Phase 5: this build only invokes the dividend hook with its inputs.
import { ZONE_KEYS } from "../config/zones.js";
import { MarketHours } from "./marketHours.js";
import { RealClock } from "./realClock.js";

export const OfflineResolver = {
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
