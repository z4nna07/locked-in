import { describe, it, expect } from "vitest";
import { weeklySeries, goalRate, totalsByLabel, scoreDistribution, runStats, bestStreak, firstYear, startWeek } from "./stats.js";
import { fromISO } from "./dates.js";

const e = (day, amount = 1, details = {}) => ({ day, amount, details, created_at: `${day}T10:00:00Z` });
const gym = { kind: "gym", weekly_goal: 2, options: {} };

describe("weeklySeries", () => {
  it("restituisce il valore di ogni settimana, dalla piu' vecchia", () => {
    const list = [e("2026-11-10"), e("2026-11-11"), e("2026-11-24")];
    const s = weeklySeries(gym, list, fromISO("2026-11-25"), 3);
    expect(s.map((w) => w.value)).toEqual([2, 0, 1]);
    expect(s[0].start).toBe("2026-11-09");
  });
});

describe("goalRate", () => {
  it("percentuale di settimane concluse con obiettivo raggiunto (la settimana in corso non conta)", () => {
    const series = [{ value: 2 }, { value: 0 }, { value: 3 }, { value: 1 }];
    expect(goalRate(series, 2)).toEqual({ met: 2, weeks: 3 });
  });
});

describe("goalRate dall'inizio della categoria", () => {
  it("non conta le settimane prima dell'inizio", () => {
    const series = [{ start: "2026-11-02", value: 0 }, { start: "2026-11-09", value: 0 }, { start: "2026-11-16", value: 2 }, { start: "2026-11-23", value: 0 }];
    expect(goalRate(series, 2, "2026-11-16")).toEqual({ met: 1, weeks: 1 });
  });
  it("l'inizio e' la creazione o la prima registrazione, la piu' vecchia", () => {
    expect(startWeek({ created_at: "2026-11-24T10:00:00Z" }, [])).toBe("2026-11-23");
    expect(startWeek({ created_at: "2026-11-24T10:00:00Z" }, [e("2026-11-05")])).toBe("2026-11-02");
  });
});

describe("totalsByLabel", () => {
  it("somma i minuti per materia o progetto, dal piu' grande", () => {
    const list = [e("2026-11-10", 60, { label: "Analisi" }), e("2026-11-11", 30, { label: "Fisica" }), e("2026-11-12", 45, { label: "Analisi" }), e("2026-11-12", 20)];
    expect(totalsByLabel(list)).toEqual([
      { label: "Analisi", minutes: 105 },
      { label: "Fisica", minutes: 30 },
      { label: "Senza nome", minutes: 20 },
    ]);
  });
});

describe("scoreDistribution", () => {
  it("conta i voti, uno per giorno (vale l'ultimo)", () => {
    const list = [e("2026-11-10", 3), e("2026-11-11", 1), e("2026-11-11", 2), e("2026-11-12", 3)];
    expect(scoreDistribution(list)).toEqual({ 1: 0, 2: 1, 3: 2 });
  });
});

describe("runStats", () => {
  it("km totali, corsa piu' lunga e passo migliore (solo da 1 km in su)", () => {
    const list = [e("2026-11-10", 5, { seconds: 1500 }), e("2026-11-12", 10, { seconds: 3300 }), e("2026-11-13", 0.5, { seconds: 120 })];
    expect(runStats(list)).toEqual({ km: 15.5, runs: 3, longest: 10, bestPace: 300 });
  });
  it("senza corse", () => {
    expect(runStats([])).toEqual({ km: 0, runs: 0, longest: 0, bestPace: null });
  });
});

describe("bestStreak", () => {
  it("trova la serie piu' lunga di settimane con obiettivo raggiunto", () => {
    const list = [
      e("2026-10-05"), e("2026-10-06"),
      e("2026-10-12"), e("2026-10-13"),
      e("2026-10-19"), e("2026-10-20"),
      e("2026-11-02"), e("2026-11-03"),
    ];
    expect(bestStreak("gym", 2, list)).toBe(3);
  });
  it("0 senza obiettivo o senza dati", () => {
    expect(bestStreak("gym", 0, [e("2026-10-05")])).toBe(0);
    expect(bestStreak("gym", 2, [])).toBe(0);
  });
});

describe("firstYear", () => {
  it("anno della prima registrazione, o l'anno corrente", () => {
    expect(firstYear([e("2024-03-01"), e("2026-01-01")], 2026)).toBe(2024);
    expect(firstYear([], 2026)).toBe(2026);
  });
});
