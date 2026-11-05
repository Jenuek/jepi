#!/usr/bin/env node
// Old vs new: opens the same screens in the deployed version (origin/main) and in this working copy,
// and compares what the browser built (tags, sorted attributes, parsed styles, text, disabled, typed values).
// The invisible wrappers (.old-part around old HTML, .jepi-root around each React screen, #…Mount where a React frame is mounted) are skipped.
//   node tools/compare.js tools/compare/<screen>.js
// A scenario exports { name, async run(t) } where t has the usual check helpers plus
//   t.grab(key, selector)  — record that part of the page under key ("=#id" = the element itself too, with its own attributes)
// Build first (npm run build). Needs git and a fetched origin/main.
const { execSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..'), scen = path.resolve(process.argv[2] || '');
if (!fs.existsSync(scen)) { console.log('usage: node tools/compare.js tools/compare/<screen>.js'); process.exit(2) }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jepi-cmp-')), old = path.join(tmp, 'old');
execSync(`git worktree add -q --detach "${old}" origin/main`, { cwd: ROOT });
const SER = `(sel=>{let flat;const self=sel[0]==='=';if(self)sel=sel.slice(1);const ser=n=>n.nodeType===3?(n.textContent.trim()?JSON.stringify(n.textContent.replace(/\\s+/g,' ').trim()):''):n.nodeType!==1?'':'<'+n.tagName+[...n.attributes].filter(a=>a.name!=='style'&&a.name!=='value').map(a=>a.name+'='+a.value).sort().map(x=>' '+x).join('')+(n.style&&n.style.cssText?' style='+n.style.cssText:'')+(n.disabled?' DISABLED':'')+(n.value!=null&&n.tagName!=='BUTTON'&&n.type!=='file'?' VALUE='+JSON.stringify(n.value):'')+'>'+[...n.childNodes].flatMap(flat).map(ser).join('')+'</'+n.tagName+'>';
  flat=n=>n.nodeType===1&&(n.classList.contains('old-part')||n.classList.contains('jepi-root')||/Mount$/.test(n.id))?[...n.childNodes].flatMap(flat):[n];
  const el=document.querySelector(sel);return el?(self?ser(el):[...el.childNodes].flatMap(flat).map(ser).join('')):'(missing)'})`;
const wrap = path.join(tmp, 'scenario.js');
fs.writeFileSync(wrap, `const fs=require('fs'),s=require(${JSON.stringify(scen)});
module.exports=[{name:s.name,async run(t){const out={};t.grab=async(k,sel)=>{const p=t.page;await p.waitForTimeout(250);out[k]=await p.evaluate(${SER},sel)};
  await s.run(t);fs.writeFileSync(process.env.OUT,JSON.stringify(out))}}];`);
const run = (dir, port, out) => { try { execSync(`node "${path.join(ROOT, 'tools/check.js')}"`, { env: Object.assign({}, process.env, { JEPI_DIST: dir, JEPI_PORT: port, JEPI_CHECKS: wrap, OUT: out }), stdio: 'pipe' }) } catch (e) { console.log(String(e.stdout || '').slice(-1500)) } };
try {
  const a = path.join(tmp, 'old.json'), b = path.join(tmp, 'new.json');
  run(old, 8796, a); run(ROOT, 8796, b);   // same address: the page shows it
  const A = JSON.parse(fs.readFileSync(a)), B = JSON.parse(fs.readFileSync(b)); let diff = 0;
  for (const k of Object.keys(A)) {
    const x = A[k], y = B[k] || '';
    if (x === y) { console.log('SAME  ' + k); continue }
    diff++; let i = 0; while (x[i] === y[i]) i++;
    console.log('DIFF  ' + k + '\n  old: …' + x.slice(Math.max(0, i - 120), i + 160) + '\n  new: …' + y.slice(Math.max(0, i - 120), i + 160));
  }
  console.log(diff ? `\n${diff} difference(s)` : '\nall the same');
} finally { execSync(`git worktree remove --force "${old}"`, { cwd: ROOT }); fs.rmSync(tmp, { recursive: true, force: true }) }
