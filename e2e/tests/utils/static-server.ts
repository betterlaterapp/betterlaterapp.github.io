import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { AddressInfo } from 'node:net';

/**
 * A plain static file server for the README claim tests, standing in for
 * GitHub Pages: it can only hand out files from the repo, and it records every
 * request it receives so tests can check what (if anything) reached it.
 *
 * It's served at http://betterlater.localhost:<port> rather than 127.0.0.1,
 * because the app turns its service worker (offline support, update control)
 * off on localhost/127.0.0.1 for development. *.localhost still resolves to
 * this machine and is treated as a secure origin, so the service worker runs
 * exactly as it does on betterlaterapp.github.io.
 */

export interface RecordedRequest {
  method: string;
  url: string;
  body: string;
}

export interface StaticServer {
  origin: string;
  requests: RecordedRequest[];
  /** false = every connection is dropped, like the device being offline */
  setOnline(online: boolean): void;
  /** Rewrite a served file, e.g. to simulate a new release being published */
  setFileOverride(urlPath: string, transform: ((content: string) => string) | null): void;
  close(): Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

export async function startStaticServer(rootDir: string): Promise<StaticServer> {
  const requests: RecordedRequest[] = [];
  const overrides = new Map<string, (content: string) => string>();
  let online = true;

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      requests.push({ method: req.method || '', url: req.url || '', body });

      if (!online) {
        req.socket.destroy();
        return;
      }

      let urlPath = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      const filePath = path.join(rootDir, urlPath);

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405);
        res.end();
        return;
      }
      if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end();
        return;
      }

      let content: Buffer = fs.readFileSync(filePath);
      const override = overrides.get(urlPath);
      if (override) content = Buffer.from(override(content.toString()));

      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    });
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  return {
    origin: `http://betterlater.localhost:${port}`,
    requests,
    setOnline(value: boolean) {
      online = value;
      if (!value) server.closeAllConnections();
    },
    setFileOverride(urlPath, transform) {
      if (transform) overrides.set(urlPath, transform);
      else overrides.delete(urlPath);
    },
    close() {
      server.closeAllConnections();
      return new Promise(resolve => server.close(() => resolve()));
    },
  };
}
