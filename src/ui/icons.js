// Icone SVG: un unico sprite statico inserito nella pagina e riferito con <use>.
const NS = "http://www.w3.org/2000/svg";

const SPRITE = `
<symbol id="i-dumbbell" viewBox="0 0 24 24"><path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/></symbol>
<symbol id="i-run" viewBox="0 0 24 24"><circle cx="15.5" cy="4.5" r="1.8"/><path d="M12.5 21l1.2-5.2-3-2.3 1.3-5.2M7.5 11l3.3-2.7 3.2 1 2 3h3M10.7 13.5l-2 4.3-3.4.9"/></symbol>
<symbol id="i-leaf" viewBox="0 0 24 24"><path d="M5 19c0-8.3 5.7-14 14-14 0 8.3-5.7 14-14 14zM5 19l7.5-7.5"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M4.5 5.5a2.5 2.5 0 0 1 2.5-2.5h12v15H7a2.5 2.5 0 0 0-2.5 2.5zM4.5 20.5A2.5 2.5 0 0 0 7 23h12v-5"/></symbol>
<symbol id="i-rocket" viewBox="0 0 24 24"><path d="M12.5 15.5l-4-4C10.2 6.6 14 3.5 20.5 3.5c0 6.5-3.1 10.3-8 12zM8.5 11.5H5l2.2-4h4.3M12.5 15.5V19l4-2.2v-4.3M6.5 17.5c-1.2 1.2-1.8 3.6-1.8 3.6s2.4-.6 3.6-1.8"/></symbol>
<symbol id="i-checkbox" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 12.5l3 3 5-6"/></symbol>
<symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></symbol>
<symbol id="i-scale" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 10a3.5 3.5 0 0 1 7 0M12 10l1.5-2"/></symbol>
<symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 23c4.4 0 7.5-3 7.5-7.3 0-4.5-3.3-6.6-4.6-10.2-2 1.8-2.4 3.8-2.2 5.6-1.4-.9-2.6-3-2.4-5.6C6.8 7.4 4.5 11 4.5 15.7 4.5 20 7.6 23 12 23z"/></symbol>
<symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 21.5h4"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9.5h-5.5v-6h-5v6H4z"/></symbol>
<symbol id="i-cal" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
<symbol id="i-stats" viewBox="0 0 24 24"><path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></symbol>
<symbol id="i-chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></symbol>
<symbol id="i-logout" viewBox="0 0 24 24"><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h10"/></symbol>
<symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>
`;

export function mountSprite() {
  if (document.getElementById("icon-sprite")) return;
  const svg = document.createElementNS(NS, "svg");
  svg.id = "icon-sprite";
  svg.setAttribute("aria-hidden", "true");
  // Via CSSOM (non attributo style), compatibile con la Content-Security-Policy.
  Object.assign(svg.style, { position: "absolute", width: "0", height: "0" });
  svg.innerHTML = SPRITE; // markup statico, nessun dato utente
  document.body.prepend(svg);
}

export function icon(name, className = "i") {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(NS, "use");
  use.setAttribute("href", `#i-${name}`);
  svg.appendChild(use);
  return svg;
}
