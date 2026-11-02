// JEPI build: React + TypeScript (app/) together with the old code (src/js, src/css, src/html).
//   npm run dev    -> local preview with live reload
//   npm run build  -> writes index.html + assets/ at the repository root (the root IS the website)
import fs from 'node:fs';
import path from 'node:path';
import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { legacy, ROOT } from './tools/legacy.mjs';

// files that live at the root and are served as they are
const STATIC = ['manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

// the old script goes in after Vite has handled the React part; "defer" keeps it after React
function jepiLegacyTag(get) {
  return {
    name: 'jepi-legacy-tag',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const src = ctx.server ? '/legacy.js' : `./assets/legacy-${get().hash}.js`;
        return [{ tag: 'script', attrs: { defer: true, src }, injectTo: 'body' }];
      },
    },
  };
}

function jepiLegacy() {
  let L, isBuild = false;
  const plugin = {
    get: () => L,
    name: 'jepi-legacy',
    configResolved(c) { isBuild = c.command === 'build' },
    buildStart() {
      L = legacy();
      L.notes.forEach(n => this.warn(n));
      if (isBuild) fs.rmSync(path.join(ROOT, 'assets'), { recursive: true, force: true });   // old hashed files
    },
    // page = src/html/head.html + all css + src/html/body.html, then React, then the old script
    transformIndexHtml: {
      order: 'pre',
      handler() {
        if (!isBuild) L = legacy();
        return L.head + '<style>' + L.css + '</style>\n</head>\n<body>' + L.body
          + '<script type="module" src="./main.tsx"></script>\n</body>\n</html>\n';
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: `assets/legacy-${L.hash}.js`, source: L.js });
    },
    configureServer(server) {
      server.watcher.add(path.join(ROOT, 'src'));
      server.watcher.on('change', f => { if (f.startsWith(path.join(ROOT, 'src'))) server.ws.send({ type: 'full-reload' }) });
      server.middlewares.use((req, res, next) => {
        const u = (req.url || '').split('?')[0].replace(/^\//, '');
        if (u === 'legacy.js') {
          try { const l = legacy(); res.setHeader('content-type', 'application/javascript'); res.end(l.js) }
          catch (e) { res.setHeader('content-type', 'application/javascript'); res.end(`alert(${JSON.stringify(String(e.message))})`) }
          return;
        }
        if (STATIC.includes(u)) { res.end(fs.readFileSync(path.join(ROOT, u))); return }
        next();
      });
    },
  };
  return plugin;
}

// Vite warns that the output folder holds the sources. That's on purpose (the root is the website),
// and only index.html + assets/ are written, so the warning is hidden.
const logger = createLogger();
const warn = logger.warn;
logger.warn = (msg, o) => { if (!/build\.outDir must not be/.test(msg)) warn(msg, o) };

const legacyPlugin = jepiLegacy();

export default defineConfig({
  root: path.join(ROOT, 'app'),
  base: './',
  publicDir: false,
  customLogger: logger,
  plugins: [legacyPlugin, jepiLegacyTag(legacyPlugin.get), react()],
  build: {
    outDir: ROOT, emptyOutDir: false, assetsDir: 'assets', sourcemap: false,
    rollupOptions: { output: { entryFileNames: 'assets/app-[hash].js', chunkFileNames: 'assets/[name]-[hash].js' } },
  },
});
