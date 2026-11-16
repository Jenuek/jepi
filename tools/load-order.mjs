// The app's files (app/flow, app/view, app/ui) import each other. While a file loads, another one it imports may not have
// loaded yet, so a value read from it at that moment can be missing (it broke 📌 코스 저장 once). Reading inside a function is
// fine. This stops the build when top-level code (outside any function) reads something imported from one of those files.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const dirs = ['flow', 'view', 'ui'].map(d => path.join(ROOT, 'app', d));
const bad = [];
for (const dir of dirs) for (const f of fs.readdirSync(dir).filter(x => /\.tsx?$/.test(x))) {
  if (f === 'boot.ts') continue;   // runs as a function, after everything has loaded
  const file = path.join(dir, f), src = fs.readFileSync(file, 'utf8'), sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const local = new Set();
  for (const st of sf.statements) if (ts.isImportDeclaration(st)) {
    const m = st.moduleSpecifier.text; if (!/^\.\/|^\.\.\/(flow|view|ui)\//.test(m)) continue;
    const c = st.importClause; if (!c || c.isTypeOnly) continue; if (c.name) local.add(c.name.text);
    const nb = c.namedBindings; if (nb) { if (ts.isNamespaceImport(nb)) local.add(nb.name.text); else nb.elements.forEach(e => { if (!e.isTypeOnly) local.add(e.name.text) }) }
  }
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) || ts.isFunctionDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) continue;
    (function v(n) {
      if (ts.isFunctionLike(n) || ts.isTypeNode(n)) return;
      if (ts.isIdentifier(n) && local.has(n.text) && !ts.isImportSpecifier(n.parent)) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf)); bad.push(`  app/${path.basename(dir)}/${f}:${line + 1}  ${n.text}  — ${src.split('\n')[line].trim().slice(0, 90)}`);
      }
      ts.forEachChild(n, v);
    })(st);
  }
}
if (bad.length) { console.error('build stopped: a file reads another app file while loading (read it inside a function instead)\n' + bad.join('\n')); process.exit(1) }
