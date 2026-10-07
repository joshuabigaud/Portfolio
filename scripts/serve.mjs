import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
function option(name, fallback) {
  const position = args.indexOf(name);
  if (position === -1) return fallback;
  if (!args[position + 1] || args[position + 1].startsWith('--')) throw new Error(`Missing value for ${name}.`);
  return args[position + 1];
}
const root = path.resolve(projectRoot, option('--root', 'docs'));
const port = Number(option('--port', process.env.PORT || '4173'));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be an integer between 1 and 65535.');
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.glb': 'model/gltf-binary',
  '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf',
};
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let route = decodeURIComponent(url.pathname);
    // Exercise GitHub Pages project-repository paths with /portfolio-preview/.
    if (route === '/portfolio-preview') {
      res.writeHead(302, { Location: `/portfolio-preview/${url.search}` }); res.end(); return;
    }
    if (route.startsWith('/portfolio-preview/')) route = route.slice('/portfolio-preview'.length);
    const filename = path.resolve(root, '.' + route);
    if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    const info = await stat(filename);
    const target = info.isDirectory() ? path.join(filename, 'index.html') : filename;
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Page not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Portfolio preview (${path.relative(projectRoot, root)}): http://127.0.0.1:${port}`));
