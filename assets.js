// config/zones.js — canonical exchange zones (widened UTC windows, §5.2/§5.6)
// openUTC/closeUTC are decimal UTC hours. A window with open>close wraps midnight.
export const ZONES = {
  SYDNEY:   { label: "Sydney",   city: "ASX",  openUTC: 22.0, closeUTC: 6.5,  tz: 10 },
  TOKYO:    { label: "Tokyo",    city: "TSE",  openUTC: 23.0, closeUTC: 7.0,  tz: 9  },
  HONGKONG: { label: "Hong Kong",city: "HKEX", openUTC: 0.5,  closeUTC: 9.0,  tz: 8  },
  LONDON:   { label: "London",   city: "LSE",  openUTC: 6.5,  closeUTC: 17.0, tz: 1  },
  NEWYORK:  { label: "New York", city: "NYSE", openUTC: 12.5, closeUTC: 22.0, tz: -4 },
};

export const ZONE_KEYS = Object.keys(ZONES);
