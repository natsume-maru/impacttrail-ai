import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/assets/style.css': ['assets/style.css', 'text/css; charset=utf-8'],
  '/assets/app.mjs': ['assets/app.mjs', 'text/javascript; charset=utf-8'],
  '/assets/model.mjs': ['assets/model.mjs', 'text/javascript; charset=utf-8'],
};
const port = Number(process.env.PORT || 8765);
createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const asset = Object.hasOwn(files, pathname) ? files[pathname] : null;
  if (!asset) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const [path, mime] = asset;
    const data = await readFile(new URL(path, import.meta.url));
    response.writeHead(200, { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(500).end('Unable to read asset');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`ImpactTrail AI is ready at http://127.0.0.1:${port}`);
});
