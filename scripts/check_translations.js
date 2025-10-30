const fs = require('fs');

// Charger les fichiers JSON
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const th = JSON.parse(fs.readFileSync('src/locales/th.json', 'utf8'));
const ru = JSON.parse(fs.readFileSync('src/locales/ru.json', 'utf8'));
const cn = JSON.parse(fs.readFileSync('src/locales/cn.json', 'utf8'));

// Fonction pour obtenir une valeur par chemin
function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Fonction pour obtenir toutes les clés
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const allKeys = getAllKeys(en);

console.log('=== VÉRIFICATION QUALITÉ DES TRADUCTIONS ===\n');

// Vérifier si les traductions sont identiques
let identicalTh = 0;
let identicalRu = 0;
let identicalCn = 0;

allKeys.forEach(key => {
  const enValue = getValueByPath(en, key);
  const thValue = getValueByPath(th, key);
  const ruValue = getValueByPath(ru, key);
  const cnValue = getValueByPath(cn, key);
  
  const isProperName = enValue === 'PATTAMAP' || enValue === 'PattaMap';
  
  if (!isProperName && enValue === thValue) identicalTh++;
  if (!isProperName && enValue === ruValue) identicalRu++;
  if (!isProperName && enValue === cnValue) identicalCn++;
});

console.log('Traductions identiques à l\'anglais:');
console.log(`- Thaï: ${identicalTh}/${allKeys.length} (${(identicalTh/allKeys.length*100).toFixed(1)}%)`);
console.log(`- Russe: ${identicalRu}/${allKeys.length} (${(identicalRu/allKeys.length*100).toFixed(1)}%)`);
console.log(`- Chinois: ${identicalCn}/${allKeys.length} (${(identicalCn/allKeys.length*100).toFixed(1)}%)`);

// Exemples
console.log('\n=== EXEMPLES DE TRADUCTIONS ===\n');

const sampleKeys = [
  'header.subtitle',
  'map.selectZone',
  'search.title',
  'auth.welcomeBack',
  'profile.verified'
];

sampleKeys.forEach(key => {
  const enValue = getValueByPath(en, key);
  const thValue = getValueByPath(th, key);
  const ruValue = getValueByPath(ru, key);
  const cnValue = getValueByPath(cn, key);
  
  console.log(`Key: ${key}`);
  console.log(`   EN: ${enValue}`);
  console.log(`   TH: ${thValue}`);
  console.log(`   RU: ${ruValue}`);
  console.log(`   CN: ${cnValue}`);
  console.log();
});

// Unicode
console.log('=== CARACTÈRES UNICODE ===\n');

function hasUnicode(str) {
  return /[^\x00-\x7F]/.test(str);
}

let thUnicode = 0, ruUnicode = 0, cnUnicode = 0;

allKeys.forEach(key => {
  if (hasUnicode(getValueByPath(th, key))) thUnicode++;
  if (hasUnicode(getValueByPath(ru, key))) ruUnicode++;
  if (hasUnicode(getValueByPath(cn, key))) cnUnicode++;
});

console.log('Clés avec caractères Unicode natifs:');
console.log(`- Thaï: ${thUnicode}/${allKeys.length} (${(thUnicode/allKeys.length*100).toFixed(1)}%)`);
console.log(`- Russe: ${ruUnicode}/${allKeys.length} (${(ruUnicode/allKeys.length*100).toFixed(1)}%)`);
console.log(`- Chinois: ${cnUnicode}/${allKeys.length} (${(cnUnicode/allKeys.length*100).toFixed(1)}%)`);

console.log('\n=== CONCLUSION ===\n');

if (identicalTh < 10 && identicalRu < 10 && identicalCn < 10) {
  console.log('✅ EXCELLENT! Les traductions sont authentiques.');
  console.log('✅ Chaque langue utilise ses caractères natifs.');
} else {
  console.log('⚠️ Attention: Nombre élevé de traductions identiques.');
}
