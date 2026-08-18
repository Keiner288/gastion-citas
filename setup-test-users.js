// setup-test-users.js - Comprehensive script to create test profiles
import { supabase } from './src/lib/supabase';

async function setupTestUsers() {
  console.log('🔧 Configurando usuarios de prueba en Supabase...');
  
  // Verificar conexión a Supabase
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role_id')
      .limit(1);
      
    if (error) {
      console.log('⚠️  No se puede conectar con Supabase, se necesitan variables de entorno');
      console.log('');
      console.log('📋 INSTRUCCIONES URGENTES:');
      console.log('');
      console.log('🔹 Complete estos pasos AHORA para testing:');
      console.log('');
      console.log('1. Ve a tu Supabase Dashboard');
      console.log('2. Ve a la tabla "profiles"');
      console.log('3. Haz clic en "New" (nuevo registro)');
      console.log('');
      console.log('📝 INSERTA ESTOS DOS REGISTROS:');
      console.log('');
      console.log('1. PARA USUARIO DE PRUEBA (sin verificación):');
      console.log('   - id: user-test-no-verify');
      console.log('   - full_name: Test No Verify');
      console and log.add
      // Lengthy console log truncated for readability
    }
    
    console.log('✅ Conectado a Supabase - creando perfiles de prueba...');
    
    // Profiles data for testing
    const testProfiles = [
      {
        id: 'user-test-no-verify',
        full_name: 'Test No Verify',
        role_id: 6,
        document_number: '1234567890',
        dependency_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-admin-test',
        full_name: 'Super Admin',
        role_id: 1,
        document_number: '9876543210',
        dependency_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    // Create profiles
    for (const profile of testProfiles) {
      try {
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert(profile, { onConflict: 'id' })
          .select()
          .single();
          
        if (createError) {
          console.log(`❌ ERROR creando perfil ${profile.full_name}:`, createError.message);
        } else {
          console.log(`✅ Perfil creado: ${profile.full_name}`);
          console.log(`   ID: ${profile.id}, Rol: ${profile.role_id}`);
        }
      } catch (err) {
        console.error(`💥 Error fatal con perfil ${profile.full_name}:`, err);
      }
    }
    
    // Verificar si los perfiles se pueden leer
    console.log('');
    console.log('🔍 Verificando perfiles creados:');
    const { data: verifyProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name, role_id')
      .order('created_at', { ascending: true });
      
    if (verifyError) {
      console.log('❌ Error verificando perfiles:', verifyError.message);
    } else {
      console.log(`✅ Total de perfiles encontrados: ${verifyProfiles.length}`);
      verifyProfiles.forEach(profile => {
        console.log(`   - ${profile.full_name} (${profile.id}): Rol ${profile.role_id}`);
      });
    }
    
    console.log('');
    console.log('🎉 Setup completado!');
    console.log('');
    console.log('📋 CREDENCIALES PARA TESTING:');
    console.log('=====================================');
    console.log('👤 USUARIO DE PRUEBA (sin verificación):');
    console.log('   📧 Email: testnoverify@test.com');
    console.log('   🔑 Contraseña: password123');
    console.log('   👤 Perfil: Test No Verify (APRENDIZ)');
    console.log('');
    console.log('👤 ADMIN DE PRUEBA (con verificación):');
    console.log('   📧 Email: admin@test.com');
    console.log('   🔑 Contraseña: admin123');
    console.log('   👤 Perfil: Super Admin (SUPERADMIN)');
    console.log('=====================================');
    console.log('');
    console.log('✅ Ahora puedes testing sin problemas de perfiles!');
    
  } catch (err) {
    console.error('❌ Error total:', err.message);
    process.exit(1);
  }
}

// Ejecutar setup si es llamado directamente
if (require.main === module) {
  setupTestUsers().catch(console.error);
}

export { setupTestUsers };
