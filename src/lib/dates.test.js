import { describe, it, expect } from "vitest";
import { toISO, fromISO, addDays, startOfWeek, weekDays, daysInYear, formatDuration } from "./dates.js";

describe("dates", () => {
  it("converte una data locale in YYYY-MM-DD e ritorno", () => {
    const d = new Date(2026, 10, 23);
    expect(toISO(d)).toBe("2026-11-23");
    expect(toISO(fromISO("2026-01-05"))).toBe("2026-01-05");
  });

  it("somma i giorni anche a cavallo del mese", () => {
    expect(toISO(addDays(fromISO("2026-11-30"), 1))).toBe("2026-12-01");
    expect(toISO(addDays(fromISO("2026-03-01"), -1))).toBe("2026-02-28");
  });

  it("la settimana inizia di lunedi", () => {
    expect(toISO(startOfWeek(fromISO("2026-11-23")))).toBe("2026-11-23"); // lunedi
    expect(toISO(startOfWeek(fromISO("2026-11-29")))).toBe("2026-11-23"); // domenica
    expect(toISO(startOfWeek(fromISO("2026-11-25")))).toBe("2026-11-23");
  });

  it("elenca i 7 giorni della settimana", () => {
    const days = weekDays(fromISO("2026-11-26")).map(toISO);
    expect(days).toEqual(["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]);
  });

  it("conta i giorni dell'anno", () => {
    expect(daysInYear(2026)).toBe(365);
    expect(daysInYear(2028)).toBe(366);
  });

  it("formatta i minuti in ore e minuti", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(105)).toBe("1 h 45 min");
  });
});
