/**
 * T4 — Fail if forbidden formal / Title Case patterns remain in es translations.
 * Run: node client/scripts/check-es-t4-style.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const esPath = path.join(__dirname, '../src/locales/es/translation.json');
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

const FORBIDDEN = [
  /\bHaga clic\b/,
  /\bhaga clic\b/,
  /\bSuelte\b/,
  /\bIngrese\b/,
  /\bSeleccione\b/,
  /\bMarque esta\b/,
  /\bDesactívelo\b/,
  /\bLimpie el\b/,
  /\bContacte al\b/,
  /\bEstá seguro de que desea\b/,
  /\bInténtelo\b/,
  /\bincluido usted\b/,
  /\bendpoint\b/i,
  /\bSu cuenta\b/,
  /\bse le ha enviado\b/,
  /\bVerifica Tu\b/,
  /\bMenús Desplegables\b/,
  /\binsignia/i,
  /\bGen Imágenes\b/,
  /\bMostrar Todo\b/,
  /\bDesde Computadora Local\b/,
  /\bAdministrar Archivos\b/,
  /\bGrupo de indicaciones\b/,
  /\bGen Imagen/,
];

/** @type {Array<{ key: string; value: string; pattern: string }>} */
const hits = [];

for (const [key, value] of Object.entries(es)) {
  if (typeof value !== 'string') continue;
  for (const re of FORBIDDEN) {
    if (re.test(value)) {
      hits.push({ key, value, pattern: re.source });
    }
  }
}

if (hits.length > 0) {
  console.error(`T4 check failed: ${hits.length} violation(s)`);
  for (const h of hits.slice(0, 40)) {
    console.error(`- ${h.key}: ${h.value.slice(0, 120)}… (${h.pattern})`);
  }
  if (hits.length > 40) console.error(`… and ${hits.length - 40} more`);
  process.exit(1);
}

console.log('T4 check passed.');