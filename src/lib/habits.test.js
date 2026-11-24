import { describe, it, expect } from "vitest";
import { scheduleOf, describeSchedule, habitWeekValue, habitLevel, dayStreak, bestDayStreak, weeklyTarget, isoDowOf } from "./habits.js";

const e = (day, amount = 1) => ({ day, amount });
const sched = (schedule) => scheduleOf({ schedule });

describe("scheduleOf", () => {
  it("le abitudini vecchie senza frequenza valgono come settimanali", () => {
    expect(scheduleOf({}).mode).toBe("weekly");
  });
  it("normalizza valori sbagliati", () => {
    expect(sched({ mode: "perDay", perDay: 0 }).perDay).toBe(1);
    expect(sched({ mode: "days", days: [5, 1, 1, 9] }).days).toEqual([1, 5]);
    expect(sched({ mode: "days", days: [] }).days).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("descrizione", () => {
  it("in italiano", () => {
    expect(describeSchedule(sched({ mode: "daily" }))).toBe("Ogni giorno");
    expect(describeSchedule(sched({ mode: "perDay", perDay: 2 }))).toBe("2 volte al giorno");
    expect(describeSchedule(sched({ mode: "days", days: [1, 3, 5] }))).toBe("Lun, Mer, Ven");
    expect(describeSchedule(sched({ mode: "weekly" }), 3)).toBe("3 volte a settimana");
    expect(describeSchedule(sched({ mode: "weekly" }), 1)).toBe("1 volta a settimana");
  });
});

describe("giorno della settimana", () => {
  it("lunedi 23 novembre 2026 = 1, domenica 29 = 7", () => {
    expect(isoDowOf("2026-11-23")).toBe(1);
    expect(isoDowOf("2026-11-29")).toBe(7);
  });
});

describe("valore settimanale e pallini", () => {
  const teeth = sched({ mode: "perDay", perDay: 2 });
  it("N volte al giorno: conta solo i giorni in cui arrivi a N", () => {
    expect(habitWeekValue(teeth, [e("2026-11-23", 2), e("2026-11-24", 1), e("2026-11-25", 1), e("2026-11-25", 1)])).toBe(2);
    expect(habitLevel(teeth, [e("2026-11-24", 1)])).toBe(2);
    expect(habitLevel(teeth, [e("2026-11-24", 2)])).toBe(3);
    expect(habitLevel(teeth, [])).toBe(0);
  });
  it("giorni precisi: i giorni non previsti non contano", () => {
    const mwf = sched({ mode: "days", days: [1, 3, 5] });
    expect(habitWeekValue(mwf, [e("2026-11-23"), e("2026-11-24"), e("2026-11-25")])).toBe(2);
    expect(weeklyTarget(mwf, 99)).toBe(3);
  });
  it("ogni giorno: obiettivo 7", () => {
    expect(weeklyTarget(sched({ mode: "daily" }), 3)).toBe(7);
    expect(weeklyTarget(sched({ mode: "weekly" }), 3)).toBe(3);
  });
});

describe("streak in giorni", () => {
  const daily = sched({ mode: "daily" });
  it("giorni consecutivi; oggi non ancora fatto non la rompe", () => {
    const list = [e("2026-11-21"), e("2026-11-22"), e("2026-11-23")];
    expect(dayStreak(daily, list, "2026-11-24")).toBe(3);
    expect(dayStreak(daily, [...list, e("2026-11-24")], "2026-11-24")).toBe(4);
  });
  it("un giorno saltato la azzera", () => {
    expect(dayStreak(daily, [e("2026-11-20"), e("2026-11-22"), e("2026-11-23")], "2026-11-24")).toBe(2);
    expect(dayStreak(daily, [e("2026-11-20")], "2026-11-24")).toBe(0);
  });
  it("giorni precisi: i giorni di riposo non la rompono", () => {
    const mwf = sched({ mode: "days", days: [1, 3, 5] });
    // ven 20, lun 23, mer 25 fatti; oggi gio 26 e' riposo
    expect(dayStreak(mwf, [e("2026-11-20"), e("2026-11-23"), e("2026-11-25")], "2026-11-26")).toBe(3);
  });
  it("N volte al giorno: un giorno a meta' interrompe", () => {
    const teeth = sched({ mode: "perDay", perDay: 2 });
    expect(dayStreak(teeth, [e("2026-11-22", 2), e("2026-11-23", 1), e("2026-11-24", 2)], "2026-11-24")).toBe(1);
  });
  it("migliore di sempre", () => {
    expect(bestDayStreak(daily, [e("2026-11-01"), e("2026-11-02"), e("2026-11-03"), e("2026-11-10"), e("2026-11-11")])).toBe(3);
  });
});
