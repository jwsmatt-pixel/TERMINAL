// engine/simClock.js — the MARKET SIM clock (governs price-evolution speed, §5.1/§5.3)
// Phase 1 provides the cadence + rate. Phase 2's price engine consumes onTick.
import { SIM_RATES, SIM_TICK_MS } from "../config/constants.js";

export function createSimClock() {
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
export const SimClock = createSimClock();
