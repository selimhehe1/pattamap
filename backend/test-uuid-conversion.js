// Test script to understand UUID to number conversion
// This helps debug why establishment ID "619323646" isn't being found

// Copy of the uuidToNumber function from admin.ts
const uuidToNumber = (uuid) => {
  if (!uuid) return 0;
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Test with a few sample UUIDs to understand the pattern
const testUUIDs = [
  '550e8400-e29b-41d4-a716-446655440000',
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  '123e4567-e89b-12d3-a456-426614174000'
];

console.log('🧪 Testing UUID to Number conversion:');
console.log('=====================================');

testUUIDs.forEach(uuid => {
  const number = uuidToNumber(uuid);
  console.log(`UUID: ${uuid}`);
  console.log(`Number: ${number}`);
  console.log('---');
});

console.log('\n🎯 Looking for target number: 619323646');
console.log('If one of these numbers matches 619323646, we found the UUID!');

// Also test what happens with the target number
const targetNumber = 619323646;
console.log(`\n🔍 Target number: ${targetNumber}`);
console.log('Now we need to find which UUID generates this number...');