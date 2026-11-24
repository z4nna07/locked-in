// Allenamenti in palestra: volume, ultima prestazione, record, storico per esercizio.
// Un allenamento e' una registrazione con details.exercises = [{ name, sets: [{ kg, reps }] }].

const key = (name) => String(name ?? "").trim().toLowerCase();

export function sameExercise(a, b) {
  return key(a) === key(b);
}

const exercisesOf = (details) => details?.exercises ?? [];

export function workoutVolume(details) {
  return exercisesOf(details).reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + Number(set.kg || 0) * Number(set.reps || 0), 0),
    0,
  );
}

export function setCount(details) {
  return exercisesOf(details).reduce((n, ex) => n + ex.sets.length, 0);
}

const chronological = (entries) =>
  [...entries].sort((a, b) => (a.day === b.day ? String(a.created_at).localeCompare(String(b.created_at)) : a.day < b.day ? -1 : 1));

/** Nomi degli esercizi usati, dal piu' recente; vale la scrittura della prima volta. */
export function exerciseNames(entries) {
  const list = chronological(entries);
  const spelling = new Map();
  list.forEach((en) => exercisesOf(en.details).forEach((ex) => {
    if (!spelling.has(key(ex.name))) spelling.set(key(ex.name), ex.name.trim());
  }));
  const order = [];
  [...list].reverse().forEach((en) => exercisesOf(en.details).forEach((ex) => {
    if (!order.includes(key(ex.name))) order.push(key(ex.name));
  }));
  return order.map((k) => spelling.get(k));
}

/** Serie dell'ultima volta in cui hai fatto l'esercizio (prima di beforeDay, se indicato). */
export function lastPerformance(entries, name, beforeDay) {
  const list = chronological(entries).filter((en) => !beforeDay || en.day < beforeDay).reverse();
  for (const en of list) {
    const found = exercisesOf(en.details).find((ex) => sameExercise(ex.name, name));
    if (found && found.sets.length) return found.sets.map((s) => ({ kg: Number(s.kg), reps: Number(s.reps) }));
  }
  return null;
}

/** Massimale stimato (Epley), arrotondato a 0,5 kg. */
export function estimate1RM(kg, reps) {
  const value = reps <= 1 ? kg : kg * (1 + reps / 30);
  return Math.round(value * 2) / 2;
}

const better = (a, b) => !b || a.kg > b.kg || (a.kg === b.kg && a.reps > b.reps);

export function bestSet(entries, name) {
  let best = null;
  chronological(entries).forEach((en) =>
    exercisesOf(en.details)
      .filter((ex) => sameExercise(ex.name, name))
      .forEach((ex) =>
        ex.sets.forEach((s) => {
          const set = { kg: Number(s.kg), reps: Number(s.reps), day: en.day };
          if (set.reps > 0 && better(set, best)) best = set;
        }),
      ),
  );
  return best;
}

/** Per ogni allenamento con l'esercizio: carico massimo, massimale stimato e volume. */
export function exerciseHistory(entries, name) {
  return chronological(entries).flatMap((en) => {
    const sets = exercisesOf(en.details).filter((ex) => sameExercise(ex.name, name)).flatMap((ex) => ex.sets);
    const valid = sets.filter((s) => Number(s.reps) > 0);
    if (!valid.length) return [];
    return [{
      day: en.day,
      maxKg: Math.max(...valid.map((s) => Number(s.kg))),
      best1RM: Math.max(...valid.map((s) => estimate1RM(Number(s.kg), Number(s.reps)))),
      volume: valid.reduce((v, s) => v + Number(s.kg) * Number(s.reps), 0),
    }];
  });
}

/** Esercizi in cui il carico massimo supera il record precedente (solo esercizi gia' fatti). */
export function newRecords(previous, details) {
  return exercisesOf(details).flatMap((ex) => {
    const before = bestSet(previous, ex.name);
    const top = Math.max(0, ...ex.sets.filter((s) => Number(s.reps) > 0).map((s) => Number(s.kg)));
    return before && top > before.kg ? [{ name: ex.name, kg: top }] : [];
  });
}
