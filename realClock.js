// config/ranks.js — Trader Rank curve (§8.2). Fast early, ~1.8x later.
export const RANKS = [10000, 15000, 25000, 50000, 100000, 180000, 324000, 583000];

export function rankFor(netWorthValue) {
  let r = 1;
  for (let i = 0; i < RANKS.length; i++) {
    if (netWorthValue >= RANKS[i]) r = i + 1;
  }
  return Math.max(1, r);
}
