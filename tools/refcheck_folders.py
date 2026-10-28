#!/usr/bin/env python3
"""Regenerate the FOLDERS list in js/refcheck.js from the repo's real folders (local, read-only git, no network).
Usage: python3 tools/refcheck_folders.py [REF]   (default REF: HEAD)
Takes every top-level folder of REF (dot-folders too, like .cursor; deeper paths are caught by their top folder),
adds the fixed names below, and rewrites the line between the FOLDERS-BEGIN and FOLDERS-END markers.
A typed word/word whose first part is one of these is refused as a file path."""
import re, subprocess, sys, os
REF = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
ROOT = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip()
FIXED = ['js', 'gas', 'src', 'app', 'nirvana', 'tools', 'test', 'tests', 'release', 'brain', 'workspace', 'home',
         'css', 'img', 'pwa', 'docs', 'brief', 'elon', 'grok-howto', '.cursor', 'etc', 'usr', 'bin', 'var', 'tmp',
         'node_modules', 'users']
# plain words a note can start a word/word with; never add these even if a folder has that name
NEVER = {'front', 'back', 'and', 'or', 'yes', 'no', 'roof', 'gutter', 'van', 'ute', 'pre-test', 'post-test', 'done', 'inside', 'outside'}
dirs = subprocess.check_output(['git', 'ls-tree', '-r', '-d', '--name-only', REF], text=True, cwd=ROOT).split('\n')
names = set(FIXED)
for d in dirs:
    parts = d.split('/')
    if len(parts) == 1 and parts[0]: names.add(parts[0])
names = sorted(n for n in names if n and n.lower() not in NEVER and re.fullmatch(r'[\w.~-]+', n))
p = os.path.join(ROOT, 'js', 'refcheck.js'); s = open(p).read()
line = 'var FOLDERS=' + '[' + ','.join('"' + n + '"' for n in names) + '];'
s2, n = re.subn(r'(/\* FOLDERS-BEGIN[^\n]*\*/\n).*?(\n/\* FOLDERS-END \*/)', lambda m: m.group(1) + line + m.group(2), s, flags=re.S)
if n != 1: sys.exit('markers not found in js/refcheck.js')
open(p, 'w').write(s2); print(len(names), 'folders from', REF, ':', ' '.join(names))
