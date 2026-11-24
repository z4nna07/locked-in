import { describe, it, expect } from "vitest";
import { parseClock, sleepMinutes, sleepLevel, averageBedtime, averageClock, sleepStats, minutesToClock } from "./sleep.js";

describe("parseClock", () => {
  it("legge HH:MM", () => {
    expect(parseClock("23:40")).toBe(1420);
    expect(parseClock("7:05")).toBe(425);
  });
  it("rifiuta valori non validi", () => {
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("12:60")).toBeNull();
    expect(parseClock("")).toBeNull();
  });
});

describe("sleepMinutes", () => {
  it("calcola le ore a cavallo della mezzanotte", () => {
    expect(sleepMinutes("23:40", "07:10")).toBe(450);
    expect(sleepMinutes("00:30", "08:00")).toBe(450);
  });
  it("gestisce un pisolino nello stesso giorno", () => {
    expect(sleepMinutes("14:00", "15:30")).toBe(90);
  });
  it("orari uguali valgono 24 ore (da scartare in validazione)", () => {
    expect(sleepMinutes("23:00", "23:00")).toBe(1440);
  });
});

describe("sleepLevel", () => {
  it("3 se raggiungi l'obiettivo, 2 se manca meno di un'ora, 1 altrimenti", () => {
    expect(sleepLevel(480, 8)).toBe(3);
    expect(sleepLevel(430, 8)).toBe(2);
    expect(sleepLevel(400, 8)).toBe(1);
  });
});

describe("medie degli orari", () => {
  it("la media dell'ora di addormentamento attraversa la mezzanotte", () => {
    expect(minutesToClock(averageBedtime(["23:30", "00:30"]))).toBe("00:00");
    expect(minutesToClock(averageBedtime(["22:00", "23:00"]))).toBe("22:30");
  });
  it("la media della sveglia e' una media semplice", () => {
    expect(minutesToClock(averageClock(["07:00", "08:00"]))).toBe("07:30");
  });
});

describe("sleepStats", () => {
  const night = (day, bed, wake) => ({ day, amount: sleepMinutes(bed, wake), details: { bed, wake } });
  const entries = [
    night("2026-11-20", "23:00", "07:00"), // 8 h
    night("2026-11-21", "00:00", "07:00"), // 7 h
    night("2026-11-22", "23:30", "06:30"), // 7 h
  ];

  it("calcola medie, debito e regolarita' sugli ultimi 7 giorni", () => {
    const s = sleepStats(entries, 8, "2026-11-22");
    expect(s.nights7).toBe(3);
    expect(s.avg7).toBe(440);
    expect(s.debt7).toBe(120);
    expect(minutesToClock(s.bedtime)).toBe("23:30");
    expect(s.spread).toBe(24);
  });

  it("un pisolino si somma alla notte e non sposta l'ora media di letto", () => {
    const withNap = [night("2026-11-22", "00:00", "07:00"), night("2026-11-22", "14:00", "15:00")];
    const s = sleepStats(withNap, 8, "2026-11-22");
    expect(s.nights7).toBe(1);
    expect(s.avg7).toBe(480);
    expect(s.debt7).toBe(0);
    expect(minutesToClock(s.bedtime)).toBe("00:00");
  });

  it("senza dati restituisce valori vuoti", () => {
    const s = sleepStats([], 8, "2026-11-22");
    expect(s.nights7).toBe(0);
    expect(s.avg7).toBeNull();
    expect(s.bedtime).toBeNull();
  });
});
