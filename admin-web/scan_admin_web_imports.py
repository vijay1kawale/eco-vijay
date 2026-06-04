import os
import re
from pathlib import Path

root = os.path.abspath('.')
source_files = []
for dirpath, dirs, files in os.walk(root):
    if any(part in ('node_modules', '.next') for part in Path(dirpath).parts):
        continue
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            source_files.append(os.path.join(dirpath, f))
source_files.sort()
import_re = re.compile(r'import\s+(?:.*?\s+from\s+)?["\']([^"\']+)["\']')
missing_paths = []
todo = []
catch_empty = []
any_usage = []

for path in source_files:
    text = open(path, encoding='utf-8').read()
    for m in import_re.finditer(text):
        target = m.group(1)
        if target.startswith('.') or target.startswith('@'):
            if target.startswith('@'):
                candidate = target.replace('@/','')
                cand_path = os.path.join(root, candidate)
            else:
                cand_path = os.path.join(os.path.dirname(path), target)
            tests = []
            ext = os.path.splitext(cand_path)[1]
            if ext in ('.ts', '.tsx', '.js', '.jsx', '.d.ts'):
                tests.append(cand_path)
            else:
                tests.extend([cand_path + extension for extension in ['.ts', '.tsx', '.js', '.jsx', '.d.ts']])
                tests.extend([os.path.join(cand_path, 'index' + extension) for extension in ['.ts', '.tsx', '.js', '.jsx', '.d.ts']])
            if not any(os.path.exists(t) for t in tests):
                missing_paths.append((path, target, tests[:5]))
    for i, line in enumerate(text.splitlines(), 1):
        if 'TODO' in line or 'FIXME' in line or 'unimplemented' in line.lower():
            todo.append((path, i, line.strip()))
        if re.search(r'catch\s*\([^)]*\)\s*\{\s*\}', line):
            catch_empty.append((path, i, line.strip()))
        if re.search(r'\bany\b', line):
            any_usage.append((path, i, line.strip()))

print('SOURCE FILES', len(source_files))
print('MISSING RELATIVE IMPORTS', len(missing_paths))
for item in missing_paths[:50]:
    print('MISS', item[0].replace(root + os.sep, ''), '->', item[1])
print('TODO/FIXME count', len(todo))
for item in todo[:50]:
    print('TODO', item[0].replace(root + os.sep, ''), item[1], item[2])
print('EMPTY CATCH count', len(catch_empty))
for item in catch_empty[:50]:
    print('CATCH', item[0].replace(root + os.sep, ''), item[1], item[2])
print('ANY count', len(any_usage))
for item in any_usage[:50]:
    print('ANY', item[0].replace(root + os.sep, ''), item[1], item[2])
