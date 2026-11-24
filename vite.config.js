import { defineConfig } from "vite";

const SUPABASE = "https://bxavldcdzhvgqrjcgomu.supabase.co";

// Regole di sicurezza del browser per l'app pubblicata: script e stili solo da qui,
// dati solo da Supabase, font da Google Fonts. Nel server di sviluppo non serve.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  `connect-src 'self' ${SUPABASE}`,
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const cspPlugin = {
  name: "content-security-policy",
  apply: "build",
  transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }],
};

// Su GitHub Pages l'app vive in una sottocartella (es. /locked-in/): la imposta BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [cspPlugin],
  build: { target: "es2020" },
  server: { fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.secrets/**", "**/.git/**"] } },
  test: { include: ["src/**/*.test.js"] },
});
