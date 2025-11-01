#!/bin/bash

# This script fixes all remaining failing tests
# Run from backend directory: bash FIX_ALL_TESTS.sh

echo "🔧 Starting comprehensive test fixes..."

# Add createDefaultChain imports
echo "📦 Adding imports..."
for file in \
  "src/routes/__tests__/establishments.integration.test.ts" \
  "src/routes/__tests__/employees.integration.test.ts" \
  "src/__tests__/vip/vipPurchase.test.ts" \
  "src/__tests__/vip/vipVerification.test.ts"; do
  
  if ! grep -q "createDefaultChain" "$file"; then
    sed -i "/import { supabase } from '..\/..\/config\/supabase';/a import { createDefaultChain } from '../../test-helpers/createDefaultChain';" "$file"
    echo "  ✅ Added import to $file"
  fi
done

# Fix establishments.integration.test.ts - Replace manual mock chains
echo "🔧 Fixing establishments.integration.test.ts..."
sed -i 's/(supabase\.from as jest\.Mock)\.mockReturnValue(mockQuery);/(supabase.from as jest.Mock).mockReturnValue(createDefaultChain({ data: mockEstablishments, error: null }));/' src/routes/__tests__/establishments.integration.test.ts

# Fix employees.integration.test.ts
echo "🔧 Fixing employees.integration.test.ts..."
sed -i 's/(supabase\.from as jest\.Mock)\.mockReturnValue(mockQuery);/(supabase.from as jest.Mock).mockReturnValue(createDefaultChain({ data: mockEmployees, error: null }));/' src/routes/__tests__/employees.integration.test.ts

echo "✅ All fixes applied!"
echo "🧪 Run 'npm test' to verify"
