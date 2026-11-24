// Accesso al database Supabase. Ogni funzione lancia un Error con un messaggio leggibile.
import { supabase } from "./supabase.js";

function check(result, what) {
  if (result.error) {
    console.error(what, result.error);
    throw new Error(`${what}. Controlla la connessione e riprova.`);
  }
  return result.data;
}

/** Tutte le categorie, anche quelle disattivate (servono per riattivarle con il loro storico). */
export async function fetchCategories() {
  const res = await supabase.from("categories").select("*").order("position");
  return check(res, "Non riesco a caricare le categorie");
}

const PAGE = 1000; // limite di righe per richiesta di Supabase

/**
 * Tutte le registrazioni, a blocchi. Continua finche' arriva un blocco vuoto
 * (funziona anche se il server ha un limite di righe piu' basso) e scarta i doppioni.
 */
export async function fetchEntries() {
  const byId = new Map();
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("entries")
      .select("id, category_id, day, amount, details, created_at")
      .order("day")
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    const rows = check(res, "Non riesco a caricare le registrazioni");
    if (rows.length === 0) return [...byId.values()];
    rows.forEach((row) => byId.set(row.id, row));
    from = from - PAGE + rows.length;
  }
}

export async function insertCategories(rows) {
  const res = await supabase.from("categories").insert(rows).select();
  return check(res, "Non riesco a salvare le categorie");
}

export async function updateCategory(id, patch) {
  const res = await supabase.from("categories").update(patch).eq("id", id).select().single();
  return check(res, "Non riesco ad aggiornare la categoria");
}

export async function insertEntry(row) {
  const res = await supabase.from("entries").insert(row).select("id, category_id, day, amount, details, created_at").single();
  return check(res, "Non riesco a salvare");
}

export async function updateEntry(id, patch) {
  const res = await supabase.from("entries").update(patch).eq("id", id).select("id, category_id, day, amount, details, created_at").single();
  return check(res, "Non riesco ad aggiornare");
}

export async function deleteEntry(id) {
  const res = await supabase.from("entries").delete().eq("id", id);
  check(res, "Non riesco a eliminare");
}

// Schede della palestra
export async function fetchTemplates() {
  const res = await supabase.from("templates").select("*").order("position").order("created_at");
  return check(res, "Non riesco a caricare le schede");
}

export async function insertTemplate(row) {
  const res = await supabase.from("templates").insert(row).select().single();
  return check(res, "Non riesco a salvare la scheda");
}

export async function updateTemplate(id, patch) {
  const res = await supabase.from("templates").update(patch).eq("id", id).select().single();
  return check(res, "Non riesco a salvare la scheda");
}

export async function deleteTemplate(id) {
  const res = await supabase.from("templates").delete().eq("id", id);
  check(res, "Non riesco a eliminare la scheda");
}

// Promemoria
export async function fetchReminders() {
  const res = await supabase.from("reminders").select("id, kind, category_id, time, days, enabled").order("created_at");
  return check(res, "Non riesco a caricare i promemoria");
}

export async function insertReminder(row) {
  const res = await supabase.from("reminders").insert(row).select("id, kind, category_id, time, days, enabled").single();
  return check(res, "Non riesco a salvare il promemoria");
}

export async function updateReminder(id, patch) {
  const res = await supabase.from("reminders").update(patch).eq("id", id).select("id, kind, category_id, time, days, enabled").single();
  return check(res, "Non riesco a salvare il promemoria");
}

// Peso corporeo (uno al giorno)
export async function fetchWeights() {
  const res = await supabase.from("weights").select("id, day, kg").order("day");
  return check(res, "Non riesco a caricare il peso");
}

export async function upsertWeight(day, kg) {
  const res = await supabase.from("weights").upsert({ day, kg }, { onConflict: "user_id,day" }).select("id, day, kg").single();
  return check(res, "Non riesco a salvare il peso");
}

export async function deleteWeight(id) {
  const res = await supabase.from("weights").delete().eq("id", id);
  check(res, "Non riesco a eliminare il peso");
}
