import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Next = (err?: unknown) => void;

/**
 * Real HTTP backend for the demo-app, served as Vite middleware.
 *
 * Previously this lived in `src/api.ts` as a `window.fetch` patch,
 * which meant the agent (Playwright network interception) and any
 * production-mode reporter wrapping fetch never actually saw the
 * traffic — the patched fetch returned a synthesized Response
 * without going through the network. That hid real assertions
 * about API calls.
 *
 * Now `/api/*` is a real Express-style middleware mounted on the
 * Vite dev server. Same origin, real HTTP, Playwright sees it.
 *
 * State (cart) lives in process memory on the dev server — fine for
 * a demo that's only used to drive Saync verification.
 */

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  imageAlt: string;
  inStock: boolean;
}

const PRODUCTS: Product[] = [
  { id: 1, name: 'Linen shirt',   price: 89,  imageUrl: '/img/product-1.svg', imageAlt: 'Cream-colored linen shirt on hanger', inStock: true },
  // PLANTED BUG: this product's image renders with empty alt below.
  { id: 2, name: 'Wool trousers', price: 145, imageUrl: '/img/product-2.svg', imageAlt: '',                                       inStock: true },
  { id: 3, name: 'Leather belt',  price: 65,  imageUrl: '/img/product-3.svg', imageAlt: 'Brown leather belt with brass buckle',   inStock: false },
  { id: 4, name: 'Cotton tee',    price: 38,  imageUrl: '/img/product-4.svg', imageAlt: 'Plain white cotton t-shirt',             inStock: true },
];

// Cart state — server-side, in-memory. Reset on dev-server restart.
let cartCount = 0;

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8') || '{}';
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function apiMiddleware(): Plugin {
  return {
    name: 'demo-app-api',
    configureServer(server) {
      const router = async (req: IncomingMessage, res: ServerResponse, next: Next) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const path = url.pathname;
          const method = (req.method ?? 'GET').toUpperCase();

          if (path === '/api/products' && method === 'GET') {
            return json(res, 200, PRODUCTS);
          }

          if (path === '/api/cart' && method === 'POST') {
            const body = await readJson(req) as { productId?: number };
            const product = PRODUCTS.find((p) => p.id === body.productId);
            if (!product) return json(res, 404, { error: 'Product not found' });
            cartCount += 1;
            return json(res, 200, {
              success: true,
              cartCount,
              message: `Added ${product.name}`,
            });
          }

          if (path === '/api/login' && method === 'POST') {
            await readJson(req).catch(() => null);
            return json(res, 200, { success: true, token: 'demo-token' });
          }

          if (path === '/api/orders' && method === 'POST') {
            await readJson(req).catch(() => null);
            // PLANTED BUG: contract expects 200; this endpoint returns 500.
            // Now over REAL HTTP — Playwright + the prod reporter both see it.
            return json(res, 500, { error: 'Internal server error' });
          }

          next();
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
      };
      server.middlewares.use(router);
    },
  };
}

export default defineConfig({
  plugins: [react(), apiMiddleware()],
  server: { port: 5173 },
});
