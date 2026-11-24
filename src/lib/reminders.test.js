import { describe, it, expect } from "vitest";
import { localNow, isDue, mondayOf, riskFor, buildMessages, weekValue as serverWeekValue, safeTimeZone } from "../../supabase/functions/_shared/reminders.js";
import { weekValue } from "./goals.js";

const local = { date: "2026-11-26", minutes: 21 * 60 + 5, isoDow: 4 }; // giovedi 21:05
const rem = (over) => ({ id: "r1", kind: "category", category_id: "g", time: "21:00", days: [1, 2, 3, 4, 5, 6, 7], enabled: true, last_sent_on: null, ...over });
const cat = (id, kind, name, weekly_goal, options = {}) => ({ id, kind, name, weekly_goal, options, archived: false });
const en = (category_id, day, amount = 1) => ({ category_id, day, amount });

describe("orario locale", () => {
  it("converte nel fuso dell'utente (Roma d'inverno = UTC+1)", () => {
    expect(localNow("Europe/Rome", new Date("2026-11-26T20:05:00Z"))).toEqual(local);
  });
  it("un fuso sconosciuto torna a Roma", () => {
    expect(safeTimeZone("Marte/Base")).toBe("Europe/Rome");
    expect(safeTimeZone("Europe/London")).toBe("Europe/London");
  });
  it("lunedi della settimana", () => {
    expect(mondayOf("2026-11-26", 4)).toBe("2026-11-23");
    expect(mondayOf("2026-11-30", 1)).toBe("2026-11-30");
  });
});

describe("isDue", () => {
  it("dovuto all'ora giusta, entro un'ora, una volta al giorno", () => {
    expect(isDue(rem(), local)).toBe(true);
    expect(isDue(rem({ time: "21:30" }), local)).toBe(false);
    expect(isDue(rem({ time: "19:00" }), local)).toBe(false);
    expect(isDue(rem({ last_sent_on: "2026-11-26" }), local)).toBe(false);
    expect(isDue(rem({ days: [1, 3, 5] }), local)).toBe(false);
    expect(isDue(rem({ enabled: false }), local)).toBe(false);
  });
});

describe("streak a rischio", () => {
  it("palestra: 1 di 4 a giovedi sera senza allenamento oggi e' a rischio", () => {
    const gym = cat("g", "gym", "Palestra", 4);
    const risk = riskFor(gym, [en("g", "2026-11-24")], local);
    expect(risk).toMatchObject({ needed: 3, daysAfter: 3 });
    expect(riskFor(gym, [en("g", "2026-11-23"), en("g", "2026-11-24")], local)).toBeNull();
  });
  it("se oggi hai gia' fatto qualcosa non e' a rischio", () => {
    expect(riskFor(cat("g", "gym", "Palestra", 4), [en("g", "2026-11-26")], local)).toBeNull();
  });
  it("studio: servono piu' di 3 ore al giorno nei giorni rimasti", () => {
    const study = cat("s", "study", "Studio", 10);
    expect(riskFor(study, [en("s", "2026-11-23", 60)], local)).toMatchObject({ needed: 9 });
    expect(riskFor(study, [en("s", "2026-11-23", 180)], local)).toBeNull();
  });
  it("con un margine di giorni non avvisa", () => {
    expect(riskFor(cat("g", "gym", "Palestra", 2), [], local)).toBeNull();
  });
});

describe("buildMessages", () => {
  const categories = [cat("g", "gym", "Palestra", 4), cat("f", "food", "Alimentazione", 5)];

  it("promemoria di categoria saltato se l'hai gia' segnata oggi", () => {
    const out = buildMessages([rem()], categories, [en("g", "2026-11-26", 60)], local);
    expect(out.sends).toHaveLength(0);
    expect(out.markSent).toEqual(["r1"]);
  });

  it("promemoria palestra con l'avanzamento della settimana", () => {
    const out = buildMessages([rem()], categories, [en("g", "2026-11-24", 60)], local);
    expect(out.sends[0].body).toContain("1 di 4");
  });

  it("segna la giornata elenca cosa manca", () => {
    const out = buildMessages([rem({ id: "d", kind: "daily_log", category_id: null })], categories, [en("g", "2026-11-26")], local);
    expect(out.sends[0].body).toBe("Mancano: Alimentazione.");
  });

  it("streak a rischio elenca le categorie", () => {
    const out = buildMessages([rem({ id: "x", kind: "streak_risk", category_id: null })], categories, [en("f", "2026-11-23", 3)], local);
    expect(out.sends[0].title).toContain("Streak a rischio");
    expect(out.sends[0].body).toContain("Palestra: mancano 4, restano 3 giorni");
  });
});

describe("stessa regola dell'app", () => {
  const list = [en("x", "2026-11-23", 480), en("x", "2026-11-24", 3), en("x", "2026-11-24", 1), en("x", "2026-11-25", 90)];
  it.each(["gym", "run", "check", "food", "study", "project", "sleep"])("%s", (kind) => {
    expect(serverWeekValue(kind, list, { target_hours: 8 })).toBe(weekValue(kind, list, { target_hours: 8 }));
  });
});
