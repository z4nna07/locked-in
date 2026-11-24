// Logica dei promemoria, usata dalla funzione send-reminders (Deno) e verificata con vitest.
// weekValue e' la stessa regola di src/lib/goals.js (un test controlla che diano lo stesso risultato).

export const WINDOW_MINUTES = 60;
const DOW = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function toMinutes(clock) {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

/** Data, minuti e giorno ISO della settimana nel fuso orario dell'utente. */
export function localNow(timeZone, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), isoDow: DOW[parts.weekday] };
}

export function safeTimeZone(tz) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "Europe/Rome";
  }
}

/** Dovuto: giorno giusto, ora raggiunta da meno di un'ora, non ancora inviato oggi. */
export function isDue(reminder, local) {
  const start = toMinutes(reminder.time);
  return (
    reminder.enabled &&
    reminder.days.includes(local.isoDow) &&
    reminder.last_sent_on !== local.date &&
    local.minutes >= start &&
    local.minutes - start < WINDOW_MINUTES
  );
}

export function mondayOf(dateIso, isoDow) {
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (isoDow - 1));
  return d.toISOString().slice(0, 10);
}

const HOURS_KINDS = new Set(["study", "project"]);

export function weekValue(kind, entries, opts = {}) {
  if (kind === "sleep") {
    const target = (Number(opts?.target_hours) || 8) * 60;
    const perDay = new Map();
    entries.forEach((en) => perDay.set(en.day, (perDay.get(en.day) ?? 0) + Number(en.amount)));
    return [...perDay.values()].filter((m) => m >= target).length;
  }
  if (HOURS_KINDS.has(kind)) {
    return Math.round((entries.reduce((s, en) => s + Number(en.amount || 0), 0) / 60) * 100) / 100;
  }
  if (kind === "food") {
    const byDay = new Map();
    entries.forEach((en) => byDay.set(en.day, Number(en.amount)));
    return [...byDay.values()].filter((s) => s >= 3).length;
  }
  return new Set(entries.map((en) => en.day)).size;
}

const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
const unit = (kind) => (HOURS_KINDS.has(kind) ? " h" : "");

function progress(category, weekEntries) {
  const value = weekValue(category.kind, weekEntries, category.options);
  return `${fmt(value)}${unit(category.kind)} di ${fmt(Number(category.weekly_goal))}${unit(category.kind)}`;
}

function categoryBody(category, weekEntries) {
  const week = `Questa settimana: ${progress(category, weekEntries)}.`;
  switch (category.kind) {
    case "gym": return `È ora di allenarti. ${week}`;
    case "run": return `Pronto per la corsa? ${week}`;
    case "food": return "Com'è andata oggi a tavola? Dai il voto alla giornata.";
    case "study": return `Tempo di studiare. ${week}`;
    case "project": return `Dedica un po' di tempo ai tuoi progetti. ${week}`;
    case "sleep": return "Segna a che ora sei andato a letto e quando ti sei svegliato.";
    default: return `Ricordati: ${category.name}. ${week}`;
  }
}

/**
 * Categoria a rischio: obiettivo non raggiunto e, saltando oggi, resterebbe raggiungibile solo
 * facendo l'attivita' tutti i giorni rimasti (o piu' di 3 ore al giorno per studio e progetti).
 */
export function riskFor(category, weekEntries, local) {
  const goal = Number(category.weekly_goal);
  if (!goal) return null;
  if (weekEntries.some((en) => en.day === local.date)) return null;
  const needed = Math.round((goal - weekValue(category.kind, weekEntries, category.options)) * 10) / 10;
  if (needed <= 0) return null;
  const daysAfter = 7 - local.isoDow;
  const atRisk = HOURS_KINDS.has(category.kind) ? needed >= daysAfter * 3 : needed >= daysAfter;
  return atRisk ? { category, needed, daysAfter } : null;
}

function riskLine({ category, needed, daysAfter }) {
  const left = daysAfter === 0 ? "oggi è l'ultimo giorno" : `restano ${daysAfter} giorni`;
  return `${category.name}: mancano ${fmt(needed)}${unit(category.kind)}, ${left}`;
}

/**
 * Dai promemoria dovuti costruisce le notifiche da inviare.
 * Tutti i promemoria dovuti vengono segnati come inviati, anche se non serve mandare niente.
 */
export function buildMessages(due, categories, weekEntries, local) {
  const active = categories.filter((c) => !c.archived);
  const entriesOf = (id) => weekEntries.filter((en) => en.category_id === id);
  const loggedToday = (id) => entriesOf(id).some((en) => en.day === local.date);
  const sends = [];

  due.forEach((r) => {
    if (r.kind === "category") {
      const category = active.find((c) => c.id === r.category_id);
      if (category && !loggedToday(category.id)) {
        sends.push({ title: category.name, body: categoryBody(category, entriesOf(category.id)), tag: `cat-${category.id}`, url: "#home" });
      }
    } else if (r.kind === "daily_log") {
      const missing = active.filter((c) => !loggedToday(c.id)).map((c) => c.name);
      if (missing.length) {
        sends.push({ title: "Segna la giornata", body: `Mancano: ${missing.join(", ")}.`, tag: "daily-log", url: "#home" });
      }
    } else if (r.kind === "streak_risk") {
      const risks = active.map((c) => riskFor(c, entriesOf(c.id), local)).filter(Boolean);
      if (risks.length) {
        sends.push({ title: "Streak a rischio 🔥", body: risks.map(riskLine).join("\n"), tag: "streak-risk", url: "#home" });
      }
    }
  });
  return { sends, markSent: due.map((r) => r.id) };
}
