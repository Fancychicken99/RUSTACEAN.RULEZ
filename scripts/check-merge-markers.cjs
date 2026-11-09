// Fail before expensive native builds if conflict markers were committed.
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const files = execFileSync('git', ['ls-files', '-z'], {encoding: 'utf8'}).split('\0')
  .filter(name => /\.(rs|js|cjs|css|html|toml|md|ya?ml|json)$/.test(name));
const failures = [];
for (const name of files) {
  const lines = fs.readFileSync(name, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/^(<<<<<<<(?: |$)|=======$|>>>>>>>(?: |$))/.test(line)) failures.push(`${name}:${index + 1}`);
  });
}
if (failures.length) {
  console.error('Unresolved merge markers:\n' + failures.join('\n'));
  process.exitCode = 1;
} else console.log('PASS: tracked source and documentation contain no unresolved merge markers.');
