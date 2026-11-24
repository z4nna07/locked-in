// Esercizi comuni proposti quando crei una scheda (puoi sempre scriverne uno tuo).
export const CATALOG = {
  Petto: ["Panca piana", "Panca inclinata", "Panca piana manubri", "Panca inclinata manubri", "Croci ai cavi", "Croci manubri", "Chest press", "Dip alle parallele", "Piegamenti"],
  Schiena: ["Trazioni", "Lat machine", "Rematore bilanciere", "Rematore manubrio", "Pulley basso", "Pulldown braccia tese", "Stacco da terra", "T-bar row"],
  Spalle: ["Military press", "Lento avanti manubri", "Alzate laterali", "Alzate frontali", "Face pull", "Alzate posteriori", "Arnold press"],
  Braccia: ["Curl bilanciere", "Curl manubri", "Curl a martello", "Curl ai cavi", "French press", "Pushdown ai cavi", "Estensioni sopra la testa", "Panca stretta"],
  Gambe: ["Squat", "Front squat", "Leg press", "Affondi", "Bulgarian split squat", "Stacco rumeno", "Leg curl", "Leg extension", "Hip thrust", "Calf raise"],
  Core: ["Plank", "Crunch", "Crunch ai cavi", "Leg raise", "Russian twist", "Ab wheel"],
};

export const ALL_EXERCISES = Object.values(CATALOG).flat();
