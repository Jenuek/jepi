// JEPI — the page around the React app: src/html/head.html + every src/css/NN-*.css (in file-name order) + src/html/body.html.
// The Vite plugin (vite.config.mjs) puts the React entry (app/main.tsx) after it.
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const SRC = path.join(ROOT, 'src');
const read = p => fs.readFileSync(p, 'utf8');

function parts(folder, ext) {
  const dir = path.join(SRC, folder);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.' + ext)).sort().map(f => path.join(dir, f));
  if (!files.length) throw new Error(`no files in src/${folder}`);
  return files;
}

export function page() {
  const css = parts('css', 'css').map(f => read(f).replace(/\n$/, '')).join('\n');
  const head = read(path.join(SRC, 'html', 'head.html'));
  const body = read(path.join(SRC, 'html', 'body.html'));
  for (const bad of ['<<<<<<<', '>>>>>>>']) if ((head + body + css).includes(bad)) throw new Error('merge marker left in sources');
  return { css, head, body };
}
