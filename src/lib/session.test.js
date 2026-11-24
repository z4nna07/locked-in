import { describe, it, expect } from "vitest";
import { prefillSets, newSession, finalizeSession } from "./session.js";

const history = [
  { day: "2026-11-18", created_at: "2026-11-18T18:00:00Z", details: { exercises: [{ name: "Panca piana", sets: [{ kg: 70, reps: 6 }, { kg: 67.5, reps: 8 }] }] } },
];

describe("prefillSets", () => {
  it("usa i pesi dell'ultima volta", () => {
    expect(prefillSets(history, "Panca piana", { sets: 2, reps: 8 }, "2026-11-23")).toEqual([
      { kg: "70", reps: "6", done: false },
      { kg: "67.5", reps: "8", done: false },
    ]);
  });
  it("se la scheda ha piu' serie ripete l'ultima", () => {
    expect(prefillSets(history, "Panca piana", { sets: 3, reps: 8 }, "2026-11-23")[2]).toEqual({ kg: "67.5", reps: "8", done: false });
  });
  it("esercizio nuovo: kg vuoti e ripetizioni della scheda", () => {
    expect(prefillSets(history, "Squat", { sets: 2, reps: 5 }, "2026-11-23")).toEqual([
      { kg: "", reps: "5", done: false },
      { kg: "", reps: "5", done: false },
    ]);
  });
});

describe("newSession e finalizeSession", () => {
  it("crea la sessione dalla scheda", () => {
    const s = newSession({ categoryId: "c1", day: "2026-11-23", template: { id: "t1", name: "Push", exercises: [{ name: "Panca piana", sets: 2, reps: 8 }] }, history });
    expect(s.templateName).toBe("Push");
    expect(s.exercises[0].sets).toHaveLength(2);
  });

  it("salva solo le serie con ripetizioni e accetta la virgola nei kg", () => {
    const s = {
      templateName: "Push", templateId: "t1", note: " ",
      exercises: [
        { name: "Panca piana", sets: [{ kg: "72,5", reps: "5" }, { kg: "", reps: "" }] },
        { name: "Vuoto", sets: [{ kg: "10", reps: "" }] },
      ],
    };
    expect(finalizeSession(s)).toEqual({
      exercises: [{ name: "Panca piana", sets: [{ kg: 72.5, reps: 5 }] }],
      template: "Push", template_id: "t1", note: undefined,
    });
  });

  it("rifiuta un allenamento vuoto o con valori assurdi", () => {
    expect(() => finalizeSession({ templateName: "X", templateId: null, note: "", exercises: [] })).toThrow();
    expect(() => finalizeSession({ templateName: "X", templateId: null, note: "", exercises: [{ name: "Panca", sets: [{ kg: "5000", reps: "5" }] }] })).toThrow();
  });
});
