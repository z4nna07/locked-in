// Allenamento in corso: bozza salvata sul dispositivo a ogni modifica,
// cosi' sopravvive a schermo bloccato, app chiusa o ricarica.
import { lastPerformance } from "./workout.js";

const STORAGE_KEY = "lockedin.session.v1";

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Spazio pieno o archiviazione bloccata: l'allenamento resta in memoria finche' la pagina e' aperta.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // niente da fare
  }
}

/** Righe di serie per un esercizio, precompilate con l'ultima volta (o vuote con le ripetizioni della scheda). */
export function prefillSets(history, name, target, day) {
  const last = lastPerformance(history, name, day);
  const count = Math.max(target?.sets ?? 0, last?.length ?? 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const prev = last?.[i] ?? last?.[last.length - 1];
    return {
      kg: prev ? String(prev.kg) : "",
      reps: prev ? String(prev.reps) : target?.reps ? String(target.reps) : "",
      done: false,
    };
  });
}

export function newSession({ categoryId, day, template, history }) {
  return {
    categoryId,
    day,
    templateId: template?.id ?? null,
    templateName: template?.name ?? "Allenamento libero",
    startedAt: Date.now(),
    note: "",
    exercises: (template?.exercises ?? []).map((ex) => ({
      name: ex.name,
      sets: prefillSets(history, ex.name, ex, day),
    })),
  };
}

/** Converte la bozza nel formato salvato; scarta le serie senza ripetizioni. Lancia Error se non c'e' niente. */
export function finalizeSession(session) {
  const exercises = session.exercises
    .map((ex) => ({
      name: ex.name.trim(),
      sets: ex.sets
        .map((s) => ({ kg: Number(String(s.kg).replace(",", ".")) || 0, reps: Number(s.reps) || 0 }))
        .filter((s) => s.reps > 0),
    }))
    .filter((ex) => ex.name && ex.sets.length > 0);
  if (exercises.length === 0) throw new Error("Compila almeno una serie con le ripetizioni.");
  const invalid = exercises.flatMap((ex) => ex.sets).find((s) => s.kg < 0 || s.kg > 1000 || s.reps > 500 || !Number.isInteger(s.reps));
  if (invalid) throw new Error("Controlla le serie: kg tra 0 e 1000, ripetizioni intere fino a 500.");
  return { exercises, template: session.templateName, template_id: session.templateId, note: session.note.trim() || undefined };
}
