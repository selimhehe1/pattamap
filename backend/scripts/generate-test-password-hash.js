/**
 * Generate bcrypt hash for test password
 * Password: SecureTestP@ssw0rd2024!
 */

const bcrypt = require('bcryptjs');

const password = 'SecureTestP@ssw0rd2024!';
const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }

  console.log('\n✅ Password hash generated successfully!\n');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nUse this hash in create-test-users.sql\n');
});
