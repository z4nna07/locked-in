import { describe, it, expect } from "vitest";
import { parseDuration, formatClock, formatPace, formatKm } from "./run.js";

describe("parseDuration", () => {
  it("legge mm:ss e h:mm:ss", () => {
    expect(parseDuration("28:30")).toBe(1710);
    expect(parseDuration("1:02:05")).toBe(3725);
  });
  it("legge i soli minuti", () => {
    expect(parseDuration("45")).toBe(2700);
  });
  it("rifiuta valori non validi", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("12:75")).toBeNull();
    expect(parseDuration("0:00")).toBeNull();
  });
});

describe("formatPace", () => {
  it("calcola il passo al km", () => {
    expect(formatPace(5, 1500)).toBe("5'00\"/km");
    expect(formatPace(5.2, 1685)).toBe("5'24\"/km");
  });
  it("gestisce distanza nulla", () => {
    expect(formatPace(0, 1500)).toBe("");
  });
});

describe("formatClock e formatKm", () => {
  it("formatta il tempo", () => {
    expect(formatClock(1710)).toBe("28:30");
    expect(formatClock(3725)).toBe("1:02:05");
  });
  it("usa la virgola decimale", () => {
    expect(formatKm(5.2)).toBe("5,2");
    expect(formatKm(10)).toBe("10");
  });
});
