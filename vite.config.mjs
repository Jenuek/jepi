// JEPI build: React + TypeScript (app/) with the page around it (src/css, src/html).
//   npm run dev    -> local preview with live reload
//   npm run build  -> writes index.html + assets/ at the repository root (the root IS the website)
import fs from 'node:fs';
import path from 'node:path';
import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { page, ROOT } from './tools/page.mjs';

// files that live at the root and are served as they are
const STATIC = ['manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

// the page: src/html/head.html + all css + src/html/body.html, then the React entry (app/main.tsx)
function jepiPage() {
  let isBuild = false;
  return {
    name: 'jepi-page',
    configResolved(c) { isBuild = c.command === 'build' },
    buildStart() { if (isBuild) fs.rmSync(path.join(ROOT, 'assets'), { recursive: true, force: true }) },   // old hashed files
    transformIndexHtml: {
      order: 'pre',
      handler() {
        const P = page();
        return P.head + '<style>' + P.css + '</style>\n</head>\n<body>' + P.body
          + '<script type="module" src="./main.tsx"></script>\n</body>\n</html>\n';
      },
    },
    configureServer(server) {
      server.watcher.add(path.join(ROOT, 'src'));
      server.watcher.on('change', f => { if (f.startsWith(path.join(ROOT, 'src'))) server.ws.send({ type: 'full-reload' }) });
      server.middlewares.use((req, res, next) => {
        const u = (req.url || '').split('?')[0].replace(/^\//, '');
        if (STATIC.includes(u)) { res.end(fs.readFileSync(path.join(ROOT, u))); return }
        next();
      });
    },
  };
}

// Vite warns that the output folder holds the sources. That's on purpose (the root is the website),
// and only index.html + assets/ are written, so the warning is hidden.
const logger = createLogger();
const warn = logger.warn;
logger.warn = (msg, o) => { if (!/build\.outDir must not be/.test(msg)) warn(msg, o) };

export default defineConfig({
  root: path.join(ROOT, 'app'),
  base: './',
  publicDir: false,
  customLogger: logger,
  plugins: [jepiPage(), react()],
  build: {
    outDir: ROOT, emptyOutDir: false, assetsDir: 'assets', sourcemap: false,
    // the whole app is one file of ~650 kB (React + every screen + the data layer)
    chunkSizeWarningLimit: 800,
    rollupOptions: { output: { entryFileNames: 'assets/app-[hash].js', chunkFileNames: 'assets/[name]-[hash].js' } },
  },
});
