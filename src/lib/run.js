// Corsa: lettura del tempo, passo al km, formattazione.

const pad = (n) => String(n).padStart(2, "0");

/** "28:30" -> 1710 secondi, "1:02:05" -> 3725, "45" -> 45 minuti. null se non valido. */
export function parseDuration(text) {
  const parts = String(text).trim().split(":");
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  let seconds;
  if (nums.length === 1) seconds = nums[0] * 60;
  else if (nums.length === 2) {
    if (nums[1] > 59) return null;
    seconds = nums[0] * 60 + nums[1];
  } else if (nums.length === 3) {
    if (nums[1] > 59 || nums[2] > 59) return null;
    seconds = nums[0] * 3600 + nums[1] * 60 + nums[2];
  } else return null;
  return seconds > 0 ? seconds : null;
}

export function formatClock(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatPace(km, seconds) {
  if (!km || km <= 0 || !seconds) return "";
  const perKm = Math.round(seconds / km);
  return `${Math.floor(perKm / 60)}'${pad(perKm % 60)}"/km`;
}

export function formatKm(km) {
  return String(Math.round(km * 100) / 100).replace(".", ",");
}

export function parseDecimal(text) {
  const n = Number(String(text).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
