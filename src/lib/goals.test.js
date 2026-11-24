import { describe, it, expect } from "vitest";
import { weekValue, dayLevel, streak, goalUnit } from "./goals.js";
import { fromISO } from "./dates.js";

const e = (day, amount = 1) => ({ day, amount });

describe("weekValue", () => {
  it("palestra, corsa e check contano i giorni distinti", () => {
    const list = [e("2026-11-23"), e("2026-11-23"), e("2026-11-25")];
    expect(weekValue("gym", list)).toBe(2);
    expect(weekValue("run", list)).toBe(2);
    expect(weekValue("check", list)).toBe(2);
  });

  it("alimentazione conta i giorni con voto 3 (vale l'ultimo voto del giorno)", () => {
    const list = [e("2026-11-23", 3), e("2026-11-24", 2), e("2026-11-25", 3), e("2026-11-25", 1)];
    expect(weekValue("food", list)).toBe(1);
  });

  it("studio e progetti sommano le ore (amount in minuti)", () => {
    expect(weekValue("study", [e("2026-11-23", 90), e("2026-11-24", 45)])).toBe(2.25);
    expect(weekValue("project", [])).toBe(0);
  });
});

describe("dayLevel", () => {
  it("restituisce 0 senza registrazioni", () => {
    expect(dayLevel("gym", [])).toBe(0);
    expect(dayLevel("food", [])).toBe(0);
  });
  it("le attivita' fatte valgono 3, il cibo vale il suo voto", () => {
    expect(dayLevel("gym", [e("2026-11-23", 60)])).toBe(3);
    expect(dayLevel("study", [e("2026-11-23", 30)])).toBe(3);
    expect(dayLevel("food", [e("2026-11-23", 2)])).toBe(2);
  });
});

describe("streak", () => {
  const today = fromISO("2026-11-25"); // mercoledi

  it("conta le settimane consecutive con obiettivo raggiunto", () => {
    const list = [
      e("2026-11-09"), e("2026-11-10"), // settimana 9-15: 2
      e("2026-11-16"), e("2026-11-18"), // settimana 16-22: 2
    ];
    expect(streak("gym", 2, list, today)).toBe(2);
  });

  it("la settimana in corso non ancora raggiunta non interrompe la streak", () => {
    const list = [e("2026-11-16"), e("2026-11-17"), e("2026-11-23")];
    expect(streak("gym", 2, list, today)).toBe(1);
  });

  it("la settimana in corso gia' raggiunta si somma", () => {
    const list = [e("2026-11-16"), e("2026-11-17"), e("2026-11-23"), e("2026-11-24")];
    expect(streak("gym", 2, list, today)).toBe(2);
  });

  it("una settimana mancata azzera", () => {
    const list = [e("2026-11-02"), e("2026-11-03"), e("2026-11-16"), e("2026-11-17")];
    expect(streak("gym", 2, list, today)).toBe(1);
  });

  it("obiettivo 0 significa streak disattivata", () => {
    expect(streak("gym", 0, [e("2026-11-23")], today)).toBe(0);
  });

  it("funziona con le ore di studio", () => {
    const list = [e("2026-11-17", 300), e("2026-11-18", 300)];
    expect(streak("study", 10, list, today)).toBe(1);
    expect(streak("study", 11, list, today)).toBe(0);
  });
});

describe("goalUnit", () => {
  it("descrive l'unita' dell'obiettivo", () => {
    expect(goalUnit("gym")).toBe("volte");
    expect(goalUnit("study")).toBe("ore");
    expect(goalUnit("food")).toBe("giorni puliti");
    expect(goalUnit("sleep", { target_hours: 7.5 })).toBe("notti da 7,5 h");
  });
});

describe("sonno", () => {
  const opts = { target_hours: 8 };
  it("conta le notti che raggiungono le ore obiettivo", () => {
    const list = [e("2026-11-23", 480), e("2026-11-24", 420), e("2026-11-25", 500)];
    expect(weekValue("sleep", list, opts)).toBe(2);
    expect(weekValue("sleep", list, { target_hours: 7 })).toBe(3);
  });
  it("il livello del pallino dipende da quanto manca all'obiettivo", () => {
    expect(dayLevel("sleep", [e("2026-11-23", 480)], opts)).toBe(3);
    expect(dayLevel("sleep", [e("2026-11-23", 440)], opts)).toBe(2);
    expect(dayLevel("sleep", [e("2026-11-23", 300)], opts)).toBe(1);
  });
  it("la streak usa le ore obiettivo", () => {
    const list = [e("2026-11-16", 480), e("2026-11-17", 490)];
    expect(streak("sleep", 2, list, fromISO("2026-11-25"), opts)).toBe(1);
    expect(streak("sleep", 2, list, fromISO("2026-11-25"), { target_hours: 9 })).toBe(0);
  });
  it("notte e pisolino dello stesso giorno si sommano", () => {
    expect(weekValue("sleep", [e("2026-11-23", 420), e("2026-11-23", 60)], opts)).toBe(1);
  });
  it("senza ore obiettivo usa 8 ore", () => {
    expect(weekValue("sleep", [e("2026-11-23", 479)])).toBe(0);
  });
});
