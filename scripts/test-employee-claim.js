/**
 * 🧪 Test automatisé du Employee Claim System (v10.0)
 *
 * Ce script teste le fix CSRF pour l'inscription employee + claim profile
 *
 * Scénario testé:
 * 1. S'inscrire avec account_type='employee'
 * 2. Récupérer le CSRF token directement de la réponse register
 * 3. Utiliser ce token pour claim un profil employee
 * 4. Vérifier qu'il n'y a plus d'erreur "CSRF token mismatch"
 */

const axios = require('axios');

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Configuration du test
const TEST_USER = {
  pseudonym: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123',
  account_type: 'employee'
};

const TEST_EMPLOYEE_ID = process.argv[2]; // ID de l'employée à claim (passé en argument)
const TEST_CLAIM_MESSAGE = 'Automated test claim - validating CSRF fix';

// Configuration axios pour gérer les cookies comme un navigateur
const client = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Fonction utilitaire pour logger avec couleurs
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
  debug: (msg) => console.log(`🔍 ${msg}`)
};

/**
 * Test 1: Inscription avec account_type='employee'
 * Vérifie que le backend retourne bien le CSRF token dans la réponse
 */
async function testRegistration() {
  log.info('Test 1: Registration with account_type="employee"');

  try {
    const response = await client.post('/api/auth/register', TEST_USER);

    if (response.status === 201) {
      log.success('Registration successful');
      log.debug(`User created: ${response.data.user.pseudonym} (ID: ${response.data.user.id})`);

      // Vérifier que le CSRF token est présent dans la réponse
      if (response.data.csrfToken) {
        log.success('CSRF token received in register response');
        log.debug(`Token preview: ${response.data.csrfToken.substring(0, 8)}...`);
        return {
          success: true,
          csrfToken: response.data.csrfToken,
          user: response.data.user
        };
      } else {
        log.error('No CSRF token in register response');
        return { success: false, error: 'Missing CSRF token' };
      }
    }
  } catch (error) {
    log.error(`Registration failed: ${error.response?.data?.error || error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Claim employee profile avec le CSRF token de l'inscription
 * Vérifie qu'il n'y a plus d'erreur "CSRF token mismatch"
 */
async function testClaimProfile(csrfToken, employeeId) {
  log.info(`Test 2: Claim employee profile (ID: ${employeeId})`);

  if (!employeeId) {
    log.warn('No employee ID provided - skipping claim test');
    log.warn('Usage: node scripts/test-employee-claim.js <employee_id>');
    return { success: false, skipped: true };
  }

  try {
    const response = await client.post(
      `/api/employees/claim/${employeeId}`,
      {
        message: TEST_CLAIM_MESSAGE,
        verification_proof: []
      },
      {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      }
    );

    if (response.status === 201 || response.status === 200) {
      log.success('Claim request submitted successfully');
      log.debug(`Claim ID: ${response.data.claim_id || 'N/A'}`);
      return { success: true, claimData: response.data };
    }
  } catch (error) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.error || error.message;

    if (statusCode === 403 && errorMessage.includes('CSRF token mismatch')) {
      log.error('CSRF TOKEN MISMATCH ERROR - FIX DID NOT WORK');
      return { success: false, error: 'CSRF token mismatch', critical: true };
    } else if (statusCode === 409) {
      log.warn('Profile already claimed (expected if testing multiple times)');
      return { success: true, warning: 'Already claimed' };
    } else {
      log.error(`Claim failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Test 3: Vérifier que le profil utilisateur est bien créé
 */
async function testGetProfile() {
  log.info('Test 3: Get user profile');

  try {
    const response = await client.get('/api/auth/profile');

    if (response.status === 200) {
      log.success('Profile retrieved successfully');
      log.debug(`User: ${response.data.user.pseudonym} (${response.data.user.account_type})`);
      return { success: true, profile: response.data.user };
    }
  } catch (error) {
    log.error(`Get profile failed: ${error.response?.data?.error || error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Exécution de tous les tests
 */
async function runTests() {
  console.log('\n🧪 ===== EMPLOYEE CLAIM SYSTEM TEST =====\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test User: ${TEST_USER.pseudonym}`);
  console.log(`Test Email: ${TEST_USER.email}`);
  if (TEST_EMPLOYEE_ID) {
    console.log(`Employee to Claim: ${TEST_EMPLOYEE_ID}`);
  }
  console.log('\n========================================\n');

  const results = {
    registration: null,
    claim: null,
    profile: null
  };

  // Test 1: Registration
  results.registration = await testRegistration();
  if (!results.registration.success) {
    log.error('Registration test failed - aborting');
    process.exit(1);
  }

  console.log('\n');

  // Test 2: Claim
  results.claim = await testClaimProfile(
    results.registration.csrfToken,
    TEST_EMPLOYEE_ID
  );

  console.log('\n');

  // Test 3: Get Profile
  results.profile = await testGetProfile();

  console.log('\n========================================\n');

  // Résumé des résultats
  console.log('📊 TEST RESULTS SUMMARY:\n');

  console.log(`1. Registration: ${results.registration.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - CSRF token received: ${results.registration.csrfToken ? '✅ YES' : '❌ NO'}`);

  if (!results.claim.skipped) {
    console.log(`2. Claim Profile: ${results.claim.success ? '✅ PASS' : '❌ FAIL'}`);
    if (results.claim.critical) {
      console.log('   ⚠️  CRITICAL: CSRF token mismatch detected');
    } else if (results.claim.warning) {
      console.log(`   ⚠️  ${results.claim.warning}`);
    }
  } else {
    console.log('2. Claim Profile: ⏭️  SKIPPED (no employee ID provided)');
  }

  console.log(`3. Get Profile: ${results.profile.success ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n========================================\n');

  // Verdict final
  const allPassed = results.registration.success &&
                    (results.claim.skipped || results.claim.success) &&
                    results.profile.success;

  if (allPassed) {
    log.success('ALL TESTS PASSED ✨');
    if (results.claim.skipped) {
      log.warn('Claim test was skipped - provide employee ID to test fully');
      log.warn('Usage: node scripts/test-employee-claim.js <employee_id>');
    }
    process.exit(0);
  } else {
    log.error('SOME TESTS FAILED');
    process.exit(1);
  }
}

// Exécution
runTests().catch(error => {
  log.error(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
