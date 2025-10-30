const fs = require('fs');
const path = require('path');

// Liste des composants à analyser
const components = [
  'src/components/Forms/EstablishmentFormSections/ServicesForm.tsx',
  'src/components/Forms/EstablishmentFormSections/OpeningHoursForm.tsx',
  'src/components/Review/ReviewForm.tsx',
  'src/components/Map/ZoneSelector.tsx',
  'src/components/Admin/ConsumablesAdmin.tsx',
  'src/components/Admin/CommentsAdmin.tsx',
  'src/components/Admin/EstablishmentEditModal.tsx',
  'src/components/Review/ReviewsModal.tsx',
  'src/components/Admin/EditUserModal.tsx',
  'src/components/Admin/UsersAdmin.tsx',
  'src/components/Review/UserRating.tsx',
  'src/components/Review/ReviewsList.tsx',
  'src/components/Forms/EmployeeForm.tsx',
  'src/components/Forms/EstablishmentForm.tsx',
  'src/components/Forms/EstablishmentFormSections/PricingForm.tsx',
  'src/components/Bar/BarInfoSidebar.tsx',
  'src/components/Bar/BarDetailPage.tsx',
  'src/components/Admin/EmployeesAdmin.tsx',
  'src/components/Admin/EstablishmentsAdmin.tsx',
  'src/components/Map/EstablishmentListView.tsx',
  'src/components/Map/PattayaMap.tsx',
  'src/components/Common/LoadingFallback.tsx',
  'src/components/Search/SearchPage.tsx',
  'src/components/Search/SearchFilters.tsx',
  'src/components/Search/SearchResults.tsx',
  'src/components/Auth/LoginForm.tsx',
  'src/components/LanguageSelector.tsx',
  'src/components/Map/MobileMapMenu.tsx',
  'src/components/Map/MapSidebar.tsx',
  'src/components/Layout/Header.tsx',
  'src/components/User/UserDashboard.tsx',
  'src/components/Bar/GirlProfile.tsx',
  'src/components/Employee/EmployeeProfileWizard.tsx',
  'src/components/Forms/EmployeeFormContent.tsx',
  'src/components/Admin/EmployeeClaimsAdmin.tsx',
  'src/components/Admin/AdminPanel.tsx',
  'src/components/Admin/AdminDashboard.tsx',
  'src/components/Auth/RegisterForm.tsx',
  'src/components/Employee/ClaimEmployeeModal.tsx',
  'src/components/Common/ErrorFallback.tsx'
];

console.log('=== ANALYSE i18n DES COMPOSANTS ===\n');

const withI18n = [];
const withoutI18n = [];

components.forEach(comp => {
  try {
    const content = fs.readFileSync(comp, 'utf8');
    const usesI18n = content.includes('useTranslation') || content.includes('import { t }');
    
    if (usesI18n) {
      withI18n.push(comp);
    } else {
      withoutI18n.push(comp);
    }
  } catch (e) {
    console.log(`⚠️  Fichier non trouvé: ${comp}`);
  }
});

console.log(`✅ Composants AVEC i18n: ${withI18n.length}\n`);
withI18n.forEach(c => console.log(`  - ${path.basename(c)}`));

console.log(`\n❌ Composants SANS i18n: ${withoutI18n.length}\n`);
withoutI18n.forEach(c => console.log(`  - ${path.basename(c)}`));

console.log(`\n=== RÉSUMÉ ===`);
console.log(`Total: ${components.length} composants`);
console.log(`Avec i18n: ${withI18n.length} (${(withI18n.length/components.length*100).toFixed(1)}%)`);
console.log(`Sans i18n: ${withoutI18n.length} (${(withoutI18n.length/components.length*100).toFixed(1)}%)`);
