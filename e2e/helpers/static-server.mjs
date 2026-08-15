// e2e testlerinin www/'yi servis etmesi için minimal, bağımlılıksız statik
// sunucu — scratchpad script'lerindeki "python3 -m http.server" yerine,
// commit'lenebilir/bağımsız bir Node karşılığı. Ekstra bir devDependency
// GEREKTİRMEZ (sadece node:http/node:fs).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WWW_ROOT = path.resolve(__dirname, "..", "..", "www");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

// port:0 -> OS boş bir port seçer, testler birbirini ÇAKIŞTIRMAZ (paralel
// koşuya hazır).
export function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent(req.url.split("?")[0]);
        const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
        let filePath = path.join(WWW_ROOT, safePath === "/" ? "/index.html" : safePath);
        if (!filePath.startsWith(WWW_ROOT)) { res.writeHead(403); res.end(); return; }
        fs.readFile(filePath, (err, data) => {
          if (err) { res.writeHead(404); res.end("Not found"); return; }
          const ext = path.extname(filePath);
          res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500); res.end(String(e));
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) });
    });
  });
}
