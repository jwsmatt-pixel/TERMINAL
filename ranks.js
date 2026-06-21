// config/constants.js — scalar constants only (no module coupling)
export const SCHEMA_VERSION = "0.2";

// Two-clock model (§5.3). SimClock rate by mode. 'idle' is the calm offline/at-rest rate.
export const SIM_RATES = { active: 60, fastforward: 300, idle: 1 };
export const SIM_TICK_MS = 300; // cadence the SimClock fires onTick

// Phase-5 reads these; defined here so the contract is stable.
export const OFFLINE_CRYPTO_DRIFT_PER_HOUR = 0.0; // calm offline crypto drift (Phase 5 fills behaviour)

export const STARTING_CASH = 10000; // §8.1
export const DEFAULT_HOME_ZONE = "SYDNEY";
