const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'seed_soibuakhao_establishments.sql');

console.log('Reading file...');
const content = fs.readFileSync(filePath, 'utf8');

console.log('Removing opening_hours lines...');
// Supprimer toutes les lignes qui contiennent des horaires du type '12:00-02:00',
const cleanedContent = content
  .split('\n')
  .filter(line => !line.match(/^\s*'[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}',\s*$/))
  .join('\n');

console.log('Writing cleaned file...');
fs.writeFileSync(filePath, cleanedContent, 'utf8');

console.log('✅ File cleaned successfully!');
console.log('Opening hours lines have been removed from seed_soibuakhao_establishments.sql');
