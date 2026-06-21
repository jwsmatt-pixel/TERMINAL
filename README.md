// main.js — wires the Phase 1 core for the browser harness / future phases.
import { ZONES, ZONE_KEYS } from "./config/zones.js";
import { ASSETS } from "./config/assets.js";
import { RANKS } from "./config/ranks.js";
import { RealClock } from "./engine/realClock.js";
import { SimClock, createSimClock } from "./engine/simClock.js";
import { MarketHours } from "./engine/marketHours.js";
import { OfflineResolver } from "./engine/offlineResolver.js";
import { initialState, netWorth, rankFor } from "./state/state.js";
import { SaveSystem } from "./state/save.js";

// Static price lookup for now (seed prices). Phase 2's engine replaces this.
const priceLookup = id => (ASSETS.find(a => a.id === id) || {}).seedPrice || 0;

export const Terminal = {
  ZONES, ZONE_KEYS, ASSETS, RANKS,
  RealClock, SimClock, createSimClock, MarketHours, OfflineResolver,
  initialState, netWorth, rankFor, SaveSystem,
  priceLookup,
};

// expose for console tinkering when loaded in a browser
if (typeof window !== "undefined") window.Terminal = Terminal;
