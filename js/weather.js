/*
 * weather.js — "weather mode". Looks up the current conditions for wherever the
 * phone is, buckets them into a simple condition (sun / cloud / rain / cold /
 * hot), and hands that back so the caption engine can pick a weather-matched
 * line.
 *
 * Offline-first & no API key: uses the free, CORS-friendly Open-Meteo API and
 * the browser's geolocation. Everything degrades silently — if the trader's
 * offline, blocks location, or we're on a desktop with no fix, getCurrent()
 * resolves to null and the app falls back to its normal cheeky lines. The last
 * good reading is cached for 30 minutes so repeat posts don't re-prompt.
 */
const Weather = (() => {
  const KEY = window.APP_CONFIG.STORAGE.WEATHER;
  const TTL = 30 * 60 * 1000; // 30 minutes

  // Map an Open-Meteo WMO weather code + temperature to one of our buckets.
  // Temperature wins first (a cold sunny day is still "cold" for banter).
  function classify(code, tempC) {
    if (tempC >= 24) return { condition: "hot", label: "roasting out", emoji: "🔥" };
    if (tempC <= 7) return { condition: "cold", label: "freezing out", emoji: "🥶" };
    if ([0, 1].includes(code)) return { condition: "sun", label: "sunny", emoji: "☀️" };
    if ([2, 3, 45, 48].includes(code)) return { condition: "cloud", label: "grey & cloudy", emoji: "☁️" };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99))
      return { condition: "rain", label: "raining", emoji: "🌧️" };
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
      return { condition: "cold", label: "snowy", emoji: "❄️" };
    return { condition: "cloud", label: "grey", emoji: "☁️" };
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const v = JSON.parse(raw);
      return Date.now() - v.at > TTL ? null : v.data;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data })); }
    catch (e) { /* ignore */ }
  }

  function geo() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      // Belt-and-braces: some browsers/webviews neither resolve nor honour the
      // geolocation timeout when permission is blocked, which would hang the
      // whole flow. A hard cap guarantees we always move on.
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const hardCap = setTimeout(() => finish(null), 7000);
      navigator.geolocation.getCurrentPosition(
        (p) => { clearTimeout(hardCap); finish({ lat: p.coords.latitude, lon: p.coords.longitude }); },
        () => { clearTimeout(hardCap); finish(null); },
        { timeout: 6000, maximumAge: TTL }
      );
    });
  }

  // Returns { condition, label, emoji, tempC } or null (offline / no location).
  async function getCurrent() {
    const cached = readCache();
    if (cached) return cached;
    const loc = await geo();
    if (!loc) return null;
    try {
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=" +
        encodeURIComponent(loc.lat) +
        "&longitude=" +
        encodeURIComponent(loc.lon) +
        "&current=temperature_2m,weather_code";
      const res = await fetch(url);
      if (!res.ok) return null;
      const j = await res.json();
      const cur = j.current || {};
      if (cur.temperature_2m == null || cur.weather_code == null) return null;
      const c = classify(cur.weather_code, cur.temperature_2m);
      const data = { condition: c.condition, label: c.label, emoji: c.emoji, tempC: cur.temperature_2m };
      writeCache(data);
      return data;
    } catch (e) {
      return null;
    }
  }

  return { getCurrent, classify };
})();
