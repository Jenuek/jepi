// JEPI — the "old" code while we move to React.
// Every file in src/js/ is pasted into ONE script, in file-name order (same rules as before):
//   - a file may use anything a smaller-numbered file defines
//   - the same const/let name in two files would stop the app, so the build refuses it
// The Vite plugin (vite.config.mjs) puts this script next to the React code.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

export const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const SRC = path.join(ROOT, 'src');
const read = p => fs.readFileSync(p, 'utf8');

function parts(folder, ext) {
  const dir = path.join(SRC, folder);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.' + ext)).sort().map(f => path.join(dir, f));
  if (!files.length) throw new Error(`no files in src/${folder}`);
  return files;
}

// Same rules as the old tools/build.py
function checkNames(files) {
  const seen = new Map(), notes = [];
  for (const f of files) {
    const src = read(f), found = new Map();
    for (const m of src.matchAll(/^(const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)/gm))
      found.set(m[2], m[1].includes('function') ? 'fn' : 'var');
    for (const m of src.matchAll(/^(?:const|let|var)\s+(.+)$/gm)) {   // const a=1, b=2;
      let depth = 0, cur = ''; const items = [];
      for (const ch of m[1]) {
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) { items.push(cur); cur = '' }
        else if (ch === ';' && depth === 0) break;
        else cur += ch;
      }
      items.push(cur);
      for (const it of items) { const n = /^\s*([A-Za-z_$][\w$]*)\s*=/.exec(it); if (n) found.set(n[1], 'var') }
    }
    for (const [n, k] of found) {
      const prev = seen.get(n);
      if (prev && prev[0] !== f) {
        const where = `${path.basename(prev[0])} and ${path.basename(f)}`;
        // a function with the same name in two files silently replaces the first one (that broke 이름 바꾸기 once): stop
        throw new Error(`build stopped: "${n}" is defined in both ${where}`);
      }
      seen.set(n, [f, k]);
    }
  }
  return notes;
}

// a name used but defined nowhere (a removed alias, a typo), or used at start-up before a later file defines it, only
// breaks when that code runs: stop the build instead.
// TypeScript reads the joined files as one script (with the browser's own names) and reports names it cannot find.
function checkUndefined(jsFiles, js) {
  const name = '/legacy/legacy.js', opts = { allowJs: true, checkJs: true, noEmit: true, target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: [] };
  const host = ts.createCompilerHost(opts), gs = host.getSourceFile.bind(host), fe = host.fileExists.bind(host), rf = host.readFile.bind(host);
  host.getSourceFile = (f, l, ...r) => f === name ? ts.createSourceFile(f, js, l, true, ts.ScriptKind.JS) : gs(f, l, ...r);
  host.fileExists = f => f === name || fe(f); host.readFile = f => f === name ? js : rf(f);
  const prog = ts.createProgram([name], opts, host), sf = prog.getSourceFile(name);
  const bad = prog.getSemanticDiagnostics(sf).filter(d => d.code === 2304 || d.code === 2552 || d.code === 2448 || d.code === 2449 || d.code === 2450);
  if (!bad.length) return;
  // which file each line came from
  const starts = []; let at = 1; for (const f of jsFiles) { starts.push([at, f]); at += read(f).split('\n').length - 1 }
  const where = d => { const l = sf.getLineAndCharacterOfPosition(d.start).line; let f = starts[0]; for (const s of starts) if (s[0] <= l) f = s; return `${path.basename(f[1])}:${l - f[0] + 1}` };
  throw new Error('build stopped: src/js uses a name that is defined nowhere, or before the file that defines it has run\n' + bad.slice(0, 10).map(d => `  ${where(d)}  ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`).join('\n'));
}

export function legacy() {
  const jsFiles = parts('js', 'js');
  const notes = checkNames(jsFiles);
  const js = '\n' + jsFiles.map(read).join('');
  try { new vm.Script(js, { filename: 'legacy.js' }) }
  catch (e) { throw new Error('build stopped: syntax error in src/js\n' + (e.stack || e.message).split('\n').slice(0, 6).join('\n')) }
  checkUndefined(jsFiles, js);
  const css = parts('css', 'css').map(f => read(f).replace(/\n$/, '')).join('\n');
  const head = read(path.join(SRC, 'html', 'head.html'));
  const body = read(path.join(SRC, 'html', 'body.html'));
  const all = head + body + css + js;
  for (const bad of ['<<<<<<<', '>>>>>>>']) if (all.includes(bad)) throw new Error('merge marker left in sources');
  const hash = crypto.createHash('sha256').update(js).digest('hex').slice(0, 10);
  return { js, css, head, body, hash, notes, count: jsFiles.length };
}
