// @vitest-environment jsdom
// Tocchi rapidi: le operazioni sulla stessa categoria e giorno non devono creare doppioni.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = new Map();
let nextId = 1;
const slow = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 15));

vi.mock("./api.js", () => ({
  insertEntry: vi.fn(async (row) => {
    const saved = { id: `e${nextId++}`, details: {}, created_at: "", ...row };
    db.set(saved.id, saved);
    return slow(saved);
  }),
  updateEntry: vi.fn(async (id, patch) => {
    const saved = { ...db.get(id), ...patch };
    db.set(id, saved);
    return slow(saved);
  }),
  deleteEntry: vi.fn(async (id) => {
    db.delete(id);
    return slow();
  }),
}));

const { toggleCheck, setScore, saveNight } = await import("./actions.js");
const { setState, getState } = await import("./store.js");

beforeEach(() => {
  db.clear();
  setState({ entries: [] });
});

const rows = () => getState().entries;

describe("tocchi rapidi", () => {
  it("doppio tocco sulla spunta: segna e poi toglie, senza doppioni", async () => {
    await Promise.all([toggleCheck("k", "2026-11-24"), toggleCheck("k", "2026-11-24")]);
    expect(rows()).toHaveLength(0);
    expect(db.size).toBe(0);
  });

  it("tre tocchi: resta segnato una volta sola", async () => {
    await Promise.all([1, 2, 3].map(() => toggleCheck("k", "2026-11-24")));
    expect(rows()).toHaveLength(1);
    expect(db.size).toBe(1);
  });

  it("voto 3 poi subito 2: resta solo il 2", async () => {
    await Promise.all([setScore("f", "2026-11-24", 3), setScore("f", "2026-11-24", 2)]);
    expect(rows().map((r) => r.amount)).toEqual([2]);
    expect(db.size).toBe(1);
  });

  it("stesso voto toccato due volte lo toglie", async () => {
    await Promise.all([setScore("f", "2026-11-24", 3), setScore("f", "2026-11-24", 3)]);
    expect(rows()).toHaveLength(0);
  });

  it("sonno: salvare due volte la stessa notte la aggiorna invece di duplicarla", async () => {
    await Promise.all([
      saveNight("z", "2026-11-24", 420, { bed: "00:00", wake: "07:00" }),
      saveNight("z", "2026-11-24", 450, { bed: "23:30", wake: "07:00" }),
    ]);
    expect(rows()).toHaveLength(1);
    expect(rows()[0].amount).toBe(450);
  });
});
