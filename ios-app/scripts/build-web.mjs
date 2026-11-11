// Copies the site into ios-app/www so Capacitor can bundle it into the iOS app.
// The app opens straight into the chat (app/index.html).
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const www = join(here, "..", "www");

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const item of ["app", "assets", "base.css", "config.js", "brain.js", "chat.js", "bg.js", "manifest.webmanifest"]) {
  cpSync(join(root, item), join(www, item), { recursive: true });
}
writeFileSync(join(www, "index.html"),
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<title>IAN</title><style>html{background:#030b17}</style><script>location.replace("app/index.html")</script>');
console.log("web files copied to ios-app/www");
