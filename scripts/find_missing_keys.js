const fs = require('fs');
const path = require('path');

// Load translation files
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const th = JSON.parse(fs.readFileSync('src/locales/th.json', 'utf8'));
const ru = JSON.parse(fs.readFileSync('src/locales/ru.json', 'utf8'));
const cn = JSON.parse(fs.readFileSync('src/locales/cn.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('src/locales/fr.json', 'utf8'));
const hi = JSON.parse(fs.readFileSync('src/locales/hi.json', 'utf8'));

// Helper to get all keys with their paths
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

// Helper to get value by path
function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Get all English keys
const allEnKeys = getAllKeys(en);
console.log(`\n📊 Total keys in EN: ${allEnKeys.length}\n`);

// Languages to check
const languages = {
  'TH': th,
  'RU': ru,
  'CN': cn,
  'FR': fr,
  'HI': hi
};

// Find missing keys for each language
for (const [langCode, langObj] of Object.entries(languages)) {
  const missingKeys = [];

  for (const key of allEnKeys) {
    const value = getValueByPath(langObj, key);
    if (value === undefined) {
      missingKeys.push(key);
    }
  }

  console.log(`\n🔍 Missing keys in ${langCode}: ${missingKeys.length}\n`);

  if (missingKeys.length > 0) {
    // Group by namespace
    const keysByNamespace = {};
    for (const key of missingKeys) {
      const namespace = key.split('.')[0];
      if (!keysByNamespace[namespace]) {
        keysByNamespace[namespace] = [];
      }
      keysByNamespace[namespace].push(key);
    }

    // Display grouped by namespace
    for (const [namespace, keys] of Object.entries(keysByNamespace).sort()) {
      console.log(`  ${namespace}: ${keys.length} keys`);
      keys.forEach(key => {
        const enValue = getValueByPath(en, key);
        console.log(`    - ${key}: "${enValue}"`);
      });
      console.log('');
    }
  }
}
