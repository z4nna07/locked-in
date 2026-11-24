import { describe, it, expect } from "vitest";
import { workoutVolume, setCount, lastPerformance, bestSet, estimate1RM, exerciseHistory, newRecords, sameExercise, exerciseNames } from "./workout.js";

const workout = (day, exercises, extra = {}) => ({ day, created_at: `${day}T18:00:00Z`, amount: 60, details: { exercises, ...extra } });
const ex = (name, sets) => ({ name, sets: sets.map(([kg, reps]) => ({ kg, reps })) });

const history = [
  workout("2026-11-10", [ex("Panca piana", [[60, 8], [60, 8]]), ex("Croci ai cavi", [[12.5, 12]])]),
  workout("2026-11-14", [ex("Panca piana", [[65, 8], [65, 7]])]),
  workout("2026-11-18", [ex("panca piana ", [[70, 6], [67.5, 8]])]),
];

describe("volume e serie", () => {
  it("somma kg x ripetizioni", () => {
    expect(workoutVolume(history[0].details)).toBe(60 * 8 * 2 + 12.5 * 12);
    expect(setCount(history[0].details)).toBe(3);
  });
  it("un allenamento senza esercizi ha volume 0", () => {
    expect(workoutVolume({})).toBe(0);
  });
});

describe("nomi esercizi", () => {
  it("confronta ignorando maiuscole e spazi", () => {
    expect(sameExercise("Panca Piana", " panca piana")).toBe(true);
    expect(sameExercise("Panca", "Panca piana")).toBe(false);
  });
  it("elenca i nomi usati, senza doppioni", () => {
    expect(exerciseNames(history)).toEqual(["Panca piana", "Croci ai cavi"]);
  });
});

describe("lastPerformance", () => {
  it("trova le serie dell'ultima volta prima di un giorno", () => {
    expect(lastPerformance(history, "Panca piana", "2026-11-18")).toEqual([{ kg: 65, reps: 8 }, { kg: 65, reps: 7 }]);
    expect(lastPerformance(history, "Panca piana")).toEqual([{ kg: 70, reps: 6 }, { kg: 67.5, reps: 8 }]);
  });
  it("restituisce null se l'esercizio non e' mai stato fatto", () => {
    expect(lastPerformance(history, "Squat")).toBeNull();
  });
});

describe("record", () => {
  it("stima il massimale con la formula di Epley", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(60, 10)).toBe(80);
  });
  it("il miglior set e' il piu' pesante, a parita' quello con piu' ripetizioni", () => {
    expect(bestSet(history, "Panca piana")).toEqual({ kg: 70, reps: 6, day: "2026-11-18" });
  });
  it("storico per esercizio: carico massimo per allenamento", () => {
    expect(exerciseHistory(history, "Panca piana").map((h) => h.maxKg)).toEqual([60, 65, 70]);
  });
  it("riconosce i nuovi record rispetto allo storico precedente", () => {
    const today = workout("2026-11-22", [ex("Panca piana", [[72.5, 5]]), ex("Croci ai cavi", [[12.5, 10]]), ex("Squat", [[100, 5]])]);
    expect(newRecords(history, today.details)).toEqual([{ name: "Panca piana", kg: 72.5 }]);
  });
});
