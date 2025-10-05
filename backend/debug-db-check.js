const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkDatabase() {
  console.log('🔍 DIAGNOSTIC BASE DE DONNÉES - État Actuel');
  console.log('='.repeat(50));

  try {
    // Vérifier les commentaires récents (dernières 24h)
    console.log('\n📝 COMMENTS - Entrées récentes:');
    const { data: recentComments, error: commentsError } = await supabase
      .from('comments')
      .select('id, content, rating, created_at, user_id, employee_id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('❌ Erreur comments:', commentsError);
    } else {
      console.log(`📊 Total: ${recentComments.length} commentaires récents`);
      recentComments.forEach(comment => {
        console.log(`   - ${comment.id}: "${comment.content}" (rating: ${comment.rating}) - ${comment.created_at}`);
      });
    }

    // Vérifier les modifications d'établissements récentes
    console.log('\n🏢 ESTABLISHMENTS - Modifications récentes:');
    const { data: recentEstablishments, error: estError } = await supabase
      .from('establishments')
      .select('id, name, updated_at, logo_url')
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false });

    if (estError) {
      console.error('❌ Erreur establishments:', estError);
    } else {
      console.log(`📊 Total: ${recentEstablishments.length} établissements modifiés récemment`);
      recentEstablishments.forEach(est => {
        console.log(`   - ${est.name}: logo_url=${est.logo_url ? 'PRÉSENT' : 'VIDE'} - ${est.updated_at}`);
      });
    }

    // Vérifier les employées récentes
    console.log('\n👥 EMPLOYEES - Ajouts/modifications récents:');
    const { data: recentEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, name, created_at, updated_at, status')
      .or(`created_at.gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()},updated_at.gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`)
      .order('updated_at', { ascending: false });

    if (empError) {
      console.error('❌ Erreur employees:', empError);
    } else {
      console.log(`📊 Total: ${recentEmployees.length} employées récentes/modifiées`);
      recentEmployees.forEach(emp => {
        console.log(`   - ${emp.name}: status=${emp.status} - créé: ${emp.created_at}, modifié: ${emp.updated_at}`);
      });
    }

    // Statistiques générales
    console.log('\n📈 STATISTIQUES GÉNÉRALES:');
    const { data: allComments } = await supabase.from('comments').select('id', { count: 'exact' });
    const { data: allEstablishments } = await supabase.from('establishments').select('id', { count: 'exact' });
    const { data: allEmployees } = await supabase.from('employees').select('id', { count: 'exact' });

    console.log(`   - Total commentaires: ${allComments ? allComments.length : 'N/A'}`);
    console.log(`   - Total établissements: ${allEstablishments ? allEstablishments.length : 'N/A'}`);
    console.log(`   - Total employées: ${allEmployees ? allEmployees.length : 'N/A'}`);

    // Dernière activité par table
    console.log('\n⏰ DERNIÈRE ACTIVITÉ PAR TABLE:');

    const { data: lastComment } = await supabase
      .from('comments')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: lastEstUpdate } = await supabase
      .from('establishments')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    const { data: lastEmpUpdate } = await supabase
      .from('employees')
      .select('created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    console.log(`   - Dernier commentaire: ${lastComment?.[0]?.created_at || 'AUCUN'}`);
    console.log(`   - Dernière modification establishment: ${lastEstUpdate?.[0]?.updated_at || 'AUCUN'}`);
    console.log(`   - Dernière modification employee: ${lastEmpUpdate?.[0]?.updated_at || 'AUCUN'}`);

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Diagnostic terminé');
}

checkDatabase();