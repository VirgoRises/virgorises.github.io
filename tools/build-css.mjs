import fs from 'fs';
import path from 'path';

const root = path.resolve('./css');
const parts = [
  '00-vars.css',
  '01-reset.css',
  '02-base.css',
  '10-components/osf.css',
  '10-components/memo.css',
  '10-components/research-office.css',
  '98-utilities.css'
];

const out = path.join(root, 'bundle.css');
const css = parts.map(p => `/* ${p} */\n` + fs.readFileSync(path.join(root, p), 'utf8')).join('\n\n');

/* tiny minify: strip /* … * / and excess whitespace (safe for now) */
const min = css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\n\s*\n+/g, '\n')
  .replace(/\s{2,}/g, ' ');

fs.writeFileSync(out, min, 'utf8');
console.log('wrote', out, (min.length/1024).toFixed(1)+'KB');
