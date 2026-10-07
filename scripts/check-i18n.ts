// Kiểm tra mọi khóa t('...') đều có đủ bản VI và EN, và hai bản có cùng bộ khóa.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { STRINGS } from '../src/i18n/strings';
import { EN_STATIONS, EN_UNITS } from '../src/i18n/dataEn';
import { STATIONS } from '../src/data/campaign';
import { UNIT_LIST } from '../src/data/units';

const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts')) files.push(p);
  }
};
walk('src');

let bad = 0;
const used = new Set<string>();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/'((?:home|army|hud|result|lane|fx|err|auth|boot|settings|stat|common|app)\.[\w]+)'/g)) used.add(m[1]);
}
for (const k of used) {
  for (const l of ['vi', 'en'] as const) {
    if (!(k in STRINGS[l])) {
      console.log(`THIẾU [${l}] ${k}`);
      bad++;
    }
  }
}
for (const k of Object.keys(STRINGS.vi)) if (!(k in STRINGS.en)) (console.log(`EN thiếu ${k}`), bad++);
for (const k of Object.keys(STRINGS.en)) if (!(k in STRINGS.vi)) (console.log(`VI thiếu ${k}`), bad++);
for (const u of UNIT_LIST) if (!EN_UNITS[u.id]) (console.log(`EN thiếu unit ${u.id}`), bad++);
for (const s of STATIONS) if (!EN_STATIONS[s.id]) (console.log(`EN thiếu station ${s.id}`), bad++);
const unusedKeys = Object.keys(STRINGS.vi).filter((k) => !used.has(k));
if (unusedKeys.length) console.log('Khóa chưa dùng:', unusedKeys.join(', '));
console.log(bad ? `${bad} lỗi` : `OK — ${used.size} khóa được dùng, VI/EN đầy đủ`);
process.exit(bad ? 1 : 0);
