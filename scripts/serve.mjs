import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const args = process.argv.slice(2);
const host = args.includes('--host') ? args[args.indexOf('--host') + 1] : '127.0.0.1';
const port = Number(args.includes('--port') ? args[args.indexOf('--port') + 1] : 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.ttf': 'font/ttf' };

// Serve only the public directory, never project documents or test fixtures.
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(resolve(root) + sep)) { response.writeHead(403).end('Forbidden'); return; }
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(data);
  } catch { response.writeHead(404).end('Not found'); }
});
server.listen(port, host, () => console.log(`Sparkfall preview: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`));
