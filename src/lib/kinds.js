// Tipi di categoria disponibili e categorie proposte al primo avvio.

export const KIND_ICON = {
  gym: "dumbbell",
  run: "run",
  food: "leaf",
  study: "book",
  project: "rocket",
  check: "checkbox",
  sleep: "moon",
};

export const PRESETS = [
  { kind: "gym", name: "Palestra", weekly_goal: 4, step: 1, max: 7 },
  { kind: "run", name: "Corsa", weekly_goal: 2, step: 1, max: 7 },
  { kind: "food", name: "Alimentazione", weekly_goal: 5, step: 1, max: 7 },
  { kind: "study", name: "Studio", weekly_goal: 10, step: 1, max: 80 },
  { kind: "project", name: "Progetti", weekly_goal: 5, step: 1, max: 80 },
  { kind: "sleep", name: "Sonno", weekly_goal: 5, step: 1, max: 7, options: { target_hours: 8 } },
];

/** Ore di sonno a notte selezionabili nelle impostazioni. */
export const SLEEP_TARGET = { min: 5, max: 11, step: 0.5 };

export const CUSTOM = { kind: "check", weekly_goal: 3, step: 1, max: 7 };

/** Icone tra cui scegliere (nome nello sprite, descrizione per lettori di schermo). */
export const ICON_CHOICES = [
  ["checkbox", "Spunta"], ["tooth", "Denti"], ["drop", "Acqua"], ["pill", "Integratori"], ["sparkle", "Skincare"],
  ["leaf", "Verdure"], ["apple", "Frutta"], ["coffee", "Caffè"], ["heart", "Salute"], ["lotus", "Meditazione"],
  ["moon", "Sonno"], ["sun", "Mattina"], ["bed", "Riposo"], ["book", "Lettura"], ["pen", "Scrittura"],
  ["globe", "Lingue"], ["code", "Programmazione"], ["music", "Musica"], ["run", "Corsa"], ["steps", "Passi"],
  ["bike", "Bici"], ["dumbbell", "Palestra"], ["rocket", "Progetti"], ["target", "Obiettivo"], ["smile", "Umore"],
  ["star", "Preferita"], ["phone-off", "Niente telefono"], ["flame", "Fuoco"],
];

export function goalLimits(kind) {
  return PRESETS.find((p) => p.kind === kind) ?? CUSTOM;
}

export function iconFor(category) {
  return category.icon && category.icon !== "check" ? category.icon : KIND_ICON[category.kind] ?? "checkbox";
}
