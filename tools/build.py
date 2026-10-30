#!/usr/bin/env python3
"""Build JEPI into one index.html.

The app is a single <script> scope: every file in src/js/ is pasted in name order,
so a file may use anything defined in a file with a smaller number.
Run:  python3 tools/build.py          -> rewrites ./index.html (the repository root is the website)
"""
import glob, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
OUT = ROOT

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def parts(folder, ext):
    files = sorted(glob.glob(os.path.join(SRC, folder, '*.' + ext)))
    if not files:
        sys.exit(f'no files in src/{folder}')
    return files

def check_names(js_files):
    """All files share one scope. The same const/let name in two files stops the app at load time,
    so the build refuses it. Two functions with the same name silently keep only the later one,
    so the build lists them as warnings."""
    seen = {}
    for f in js_files:
        src = read(f)
        found = {}
        for kind, name in re.findall(r'^(const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)', src, re.M):
            found[name] = 'fn' if 'function' in kind else 'var'
        for m in re.finditer(r'^(?:const|let|var)\s+(.+)$', src, re.M):   # const a=1, b=2;
            depth = 0; cur = ''; items = []
            for ch in m.group(1):
                if ch in '([{': depth += 1
                elif ch in ')]}': depth -= 1
                if ch == ',' and depth == 0: items.append(cur); cur = ''
                elif ch == ';' and depth == 0: break
                else: cur += ch
            items.append(cur)
            for it in items:
                n = re.match(r'\s*([A-Za-z_$][\w$]*)\s*=', it)
                if n: found[n.group(1)] = 'var'
        for n, k in found.items():
            if n in seen and seen[n][0] != f:
                where = f'{os.path.basename(seen[n][0])} and {os.path.basename(f)}'
                if k == 'var' or seen[n][1] == 'var':
                    sys.exit(f'build stopped: "{n}" is defined in both {where}')
                print(f'  note: function "{n}" is in both {where}; the later one wins')
            seen[n] = (f, k)

def main():
    css = '\n'.join(read(f)[:-1] for f in parts('css', 'css'))
    js_files = parts('js', 'js')
    check_names(js_files)
    js = '\n' + ''.join(read(f) for f in js_files)
    html = (read(os.path.join(SRC, 'html', 'head.html')) + '<style>' + css + '</style>\n</head>\n<body>'
            + read(os.path.join(SRC, 'html', 'body.html')) + '<script>' + js + read(os.path.join(SRC, 'html', 'tail.html')))
    for bad in ('<<<<<<<', '>>>>>>>'):
        if bad in html:
            sys.exit('merge marker left in sources')
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    if shutil.which('node'):   # syntax check of the one big script
        tmp = os.path.join(OUT, '.check.js')
        with open(tmp, 'w', encoding='utf-8') as f:
            f.write(js)
        import subprocess
        r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
        os.remove(tmp)
        if r.returncode:
            sys.exit('build stopped: syntax error\n' + r.stderr[-1500:])
    print(f'built index.html  {len(html):,} bytes  ({len(js_files)} js files)')

if __name__ == '__main__':
    main()
