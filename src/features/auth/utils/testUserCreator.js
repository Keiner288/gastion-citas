import { supabase } from '../../lib/supabase';

export async function createTestUserWithoutVerification(email, password, userData = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.full_name || '',
          document_number: userData.document_number || '',
          role_id: userData.role_id || 6,
          dependency_id: userData.dependency_id || null,
        },
        emailRedirectTo: '',
      },
    });

    if (error) {
      console.error('Error creating test user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error creating test user:', err);
    return { success: false, error: err.message };
  }
}
