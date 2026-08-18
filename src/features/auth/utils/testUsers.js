"""
Test user utilities for auth testing
Solves issues with invalid credentials for test users
"""

import { supabase } from '../lib/supabase';
import { supabaseMock } from '../mocks/supabase.mock';

// Test user credentials for development/testing
export const TEST_USERS = {
  standard: {
    email: "test@test.com",
    password: "password123",
    full_name: "Test User",
    role_id: 6,
    is_verified: true,
    needs_verification: false
  },
  noVerification: {
    email: "testnoverify@test.com",
    password: "password123", 
    full_name: "Test User No Verify",
    role_id: 6,
    is_verified: false,
    needs_verification: true
  },
  admin: {
    email: "admin@test.com",
    password: "admin123",
    full_name: "Admin User",
    role_id: 1,
    is_verified: true,
    needs_verification: false
  }
};

/**
 * Creates a test user in Supabase with optional email verification
 * This solves the "invalid credentials" issue by creating real test users
 */
export async function createTestUser(email, password, userData = {}) {
  try {
    // Check if we're in a testing environment (mocks available)
    const isTestEnvironment = typeof supabaseMock !== 'undefined';
    
    if (isTestEnvironment) {
      // In test environment, use the mock directly
      const mockSignUp = supabaseMock.auth.signUp;
      if (typeof mockSignUp === 'function') {
        // Mock setup - return a mock response
        return {
          success: true,
          data: {
            user: {
              id: 'test-user-id',
              email: email,
              user_metadata: {
                full_name: userData.full_name || '',
                document_number: userData.document_number || '',
                role_id: userData.role_id || 6,
                dependency_id: userData.dependency_id || null,
              }
            }
          },
          error: null
        };
      }
    }
    
    // In real environment, create user with Supabase
    // For testing, we skip email confirmation
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Skip email verification for test users
      user_metadata: {
        full_name: userData.full_name || '',
        document_number: userData.document_number || '',
        role_id: userData.role_id || 6,
        dependency_id: userData.dependency_id || null,
      }
    });
    
    if (error) {
      console.error('Error creating test user:', error);
      return { success: false, error: error.message };
    }
    
    // Create profile for the user
    if (data?.user?.id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: userData.full_name || '',
          document_number: userData.document_number || '',
          role_id: userData.role_id || 6,
          dependency_id: userData.dependency_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (profileError) {
        console.warn('Profile creation warning:', profileError);
      }
    }
    
    return { success: true, data };
    
  } catch (err) {
    console.error('Unexpected error creating test user:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Gets test user credentials for login testing
 * This ensures you can test with valid credentials
 */
export function getTestCredentials(type = 'standard') {
  return TEST_USERS[type] || TEST_USERS.standard;
}

/**
 * Quick setup function for testing environments
 * Creates test users with all necessary data for testing
 */
export async function setupTestUsers() {
  const results = {};
  
  for (const [type, userData] of Object.entries(TEST_USERS)) {
    console.log(`Creating test user: ${type} (${userData.email})`);
    const result = await createTestUser(userData.email, userData.password, {
      full_name: userData.full_name,
      role_id: userData.role_id
    });
    
    if (result.success) {
      results[type] = {
        success: true,
        user: result.data.user,
        credentials: {
          email: userData.email,
          password: userData.password
        }
      };
    } else {
      results[type] = {
        success: false,
        error: result.error
      };
    }
  }
  
  return results;
}

/**
 * Signs out from Supabase auth (useful for testing)
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    return { success: !error, error: error?.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Gets current session info
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Utility to validate test user credentials
 */
export function validateTestCredentials(email, password) {
  const allUsers = Object.values(TEST_USERS);
  const user = allUsers.find(u => u.email === email && u.password === password);
  return {
    isValid: !!user,
    userType: user ? Object.keys(TEST_USERS).find(k => TEST_USERS[k] === user) : null,
    user: user
  };
}
