// Icone SVG: un unico sprite statico inserito nella pagina e riferito con <use>.
const NS = "http://www.w3.org/2000/svg";

const SPRITE = `
<symbol id="i-dumbbell" viewBox="0 0 24 24"><path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/></symbol>
<symbol id="i-run" viewBox="0 0 24 24"><circle cx="15.5" cy="4.5" r="1.8"/><path d="M12.5 21l1.2-5.2-3-2.3 1.3-5.2M7.5 11l3.3-2.7 3.2 1 2 3h3M10.7 13.5l-2 4.3-3.4.9"/></symbol>
<symbol id="i-leaf" viewBox="0 0 24 24"><path d="M5 19c0-8.3 5.7-14 14-14 0 8.3-5.7 14-14 14zM5 19l7.5-7.5"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M4.5 5.5a2.5 2.5 0 0 1 2.5-2.5h12v15H7a2.5 2.5 0 0 0-2.5 2.5zM4.5 20.5A2.5 2.5 0 0 0 7 23h12v-5"/></symbol>
<symbol id="i-rocket" viewBox="0 0 24 24"><path d="M12.5 15.5l-4-4C10.2 6.6 14 3.5 20.5 3.5c0 6.5-3.1 10.3-8 12zM8.5 11.5H5l2.2-4h4.3M12.5 15.5V19l4-2.2v-4.3M6.5 17.5c-1.2 1.2-1.8 3.6-1.8 3.6s2.4-.6 3.6-1.8"/></symbol>
<symbol id="i-checkbox" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 12.5l3 3 5-6"/></symbol>
<symbol id="i-tooth" viewBox="0 0 24 24"><path d="M7 3.5c-2 0-3.5 1.7-3.5 4 0 3 1.5 4.5 2 7.5.4 2.6.9 5.5 2.3 5.5 1.6 0 1.4-4.5 4.2-4.5s2.6 4.5 4.2 4.5c1.4 0 1.9-2.9 2.3-5.5.5-3 2-4.5 2-7.5 0-2.3-1.5-4-3.5-4-2 0-3 1-5 1s-3-1-5-1z"/></symbol>
<symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/></symbol>
<symbol id="i-pill" viewBox="0 0 24 24"><path d="M10.2 4.2a5 5 0 0 1 7.1 7.1l-6 6a5 5 0 0 1-7.1-7.1zM7.2 7.2l9.6 9.6"/></symbol>
<symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z"/></symbol>
<symbol id="i-lotus" viewBox="0 0 24 24"><path d="M12 19c-2.5-2-3.5-5-3.5-8 .8-2 2-3.8 3.5-5.5 1.5 1.7 2.7 3.5 3.5 5.5 0 3-1 6-3.5 8zM12 19c-4 0-7.5-1.8-8.5-5 3-.8 5.7.4 8.5 5 2.8-4.6 5.5-5.8 8.5-5-1 3.2-4.5 5-8.5 5z"/></symbol>
<symbol id="i-bike" viewBox="0 0 24 24"><circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l3.5-7h5.5l3 7M8.5 9H11M12 16l-2.5-7"/></symbol>
<symbol id="i-music" viewBox="0 0 24 24"><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/><path d="M9 17.5V5.5l11-2v12"/></symbol>
<symbol id="i-pen" viewBox="0 0 24 24"><path d="M4 20l4.2-1L19 8.2 15.8 5 5 15.8zM13.8 7l3.2 3.2"/></symbol>
<symbol id="i-phone-off" viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2M3.5 3.5l17 17"/></symbol>
<symbol id="i-bed" viewBox="0 0 24 24"><path d="M3 19V6M3 14h18v5M21 14a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="11.5" r="1.6"/></symbol>
<symbol id="i-coffee" viewBox="0 0 24 24"><path d="M4.5 9h12v4.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM16.5 10h1.5a2.5 2.5 0 0 1 0 5h-1.5M8 3.5v2.5M12 3.5v2.5"/></symbol>
<symbol id="i-apple" viewBox="0 0 24 24"><path d="M12 7.5c-1.6-1-4.9-1.3-6.3 1.6-1.5 3.1-.4 7.5 1.8 9.9 1.4 1.5 2.9.9 4.5.4 1.6.5 3.1 1.1 4.5-.4 2.2-2.4 3.3-6.8 1.8-9.9-1.4-2.9-4.7-2.6-6.3-1.6zM12 7.5c0-2 .9-3.4 2.8-4"/></symbol>
<symbol id="i-steps" viewBox="0 0 24 24"><path d="M7.5 13.5c-1.8 0-2.7-2.2-2.7-4.6S5.6 4 7.5 4s2.7 2.5 2.7 4.9-.9 4.6-2.7 4.6zM5.5 16.5h4M16.5 19c-1.8 0-2.7-2.2-2.7-4.6s.8-4.9 2.7-4.9 2.7 2.5 2.7 4.9-.9 4.6-2.7 4.6z"/></symbol>
<symbol id="i-smile" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4 4 0 0 0 7 0M9 9.8h.01M15 9.8h.01"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></symbol>
<symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M11 3.5l1.7 5L18 10l-5.3 1.6L11 17l-1.7-5.4L4 10l5.3-1.5zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.4 5.4 3.4 8.5s-1 6.1-3.4 8.5c-2.4-2.4-3.4-5.4-3.4-8.5s1-6.1 3.4-8.5z"/></symbol>
<symbol id="i-code" viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/></symbol>
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
