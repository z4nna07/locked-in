// Creazione di elementi DOM. I testi passano sempre da textContent (niente HTML da dati utente).

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  Object.entries(props || {}).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === "class") el.className = value;
    else if (key === "style" && typeof value === "object") Object.assign(el.style, value);
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "value") el.value = value;
    else el.setAttribute(key, value === true ? "" : String(value));
  });
  append(el, children);
  return el;
}

function append(el, children) {
  children.flat(Infinity).forEach((child) => {
    if (child == null || child === false) return;
    el.append(child instanceof Node ? child : String(child));
  });
}

export function clear(el) {
  el.replaceChildren();
  return el;
}
