-- ============================================================
-- FIX: RLS infinite recursion en tabla profiles
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

-- 1. Funcion para LEER perfil con rol y dependencia (bypassa RLS)
CREATE OR REPLACE FUNCTION get_profile(p_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'document_number', p.document_number,
    'role_id', p.role_id,
    'dependency_id', p.dependency_id,
    'is_active', p.is_active,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'roles', json_build_object('name', r.name, 'permissions', r.permissions),
    'dependencies', json_build_object('name', d.name)
  ) INTO result
  FROM profiles p
  LEFT JOIN roles r ON r.id = p.role_id
  LEFT JOIN dependencies d ON d.id = p.dependency_id
  WHERE p.id = p_user_id;
  RETURN result;
END;
$$;

-- 2. Funcion para CREAR/ACTUALIZAR perfil (bypassa RLS)
CREATE OR REPLACE FUNCTION upsert_profile(
  p_id UUID,
  p_full_name TEXT,
  p_document_number TEXT,
  p_role_id BIGINT,
  p_dependency_id BIGINT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  INSERT INTO profiles (id, full_name, document_number, role_id, dependency_id)
  VALUES (p_id, p_full_name, p_document_number, p_role_id, p_dependency_id)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    document_number = EXCLUDED.document_number,
    role_id = EXCLUDED.role_id,
    dependency_id = EXCLUDED.dependency_id,
    updated_at = now()
  RETURNING json_build_object(
    'id', id, 'full_name', full_name, 'document_number', document_number,
    'role_id', role_id, 'dependency_id', dependency_id, 'is_active', is_active,
    'created_at', created_at, 'updated_at', updated_at
  ) INTO result;
  RETURN result;
END;
$$;

-- 3. Funcion para ACTUALIZAR rol de un perfil (bypassa RLS)
CREATE OR REPLACE FUNCTION update_profile_role(
  p_id UUID,
  p_role_id BIGINT,
  p_dependency_id BIGINT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  UPDATE profiles
  SET role_id = p_role_id,
      dependency_id = p_dependency_id,
      updated_at = now()
  WHERE id = p_id
  RETURNING json_build_object(
    'id', id, 'full_name', full_name, 'document_number', document_number,
    'role_id', role_id, 'dependency_id', dependency_id, 'is_active', is_active,
    'created_at', created_at, 'updated_at', updated_at
  ) INTO result;
  RETURN result;
END;
$$;

-- 4. Funcion para ACTUALIZAR usuario completo (bypassa RLS) - admin
CREATE OR REPLACE FUNCTION admin_update_user(
  p_id UUID,
  p_role_id BIGINT,
  p_dependency_id BIGINT,
  p_is_active BOOLEAN
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  UPDATE profiles
  SET role_id = p_role_id,
      dependency_id = p_dependency_id,
      is_active = p_is_active,
      updated_at = now()
  WHERE id = p_id
  RETURNING json_build_object(
    'id', id, 'full_name', full_name, 'document_number', document_number,
    'role_id', role_id, 'dependency_id', dependency_id, 'is_active', is_active,
    'created_at', created_at, 'updated_at', updated_at
  ) INTO result;
  RETURN result;
END;
$$;

-- Permisos para usuarios autenticados
GRANT EXECUTE ON FUNCTION get_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_profile(UUID, TEXT, TEXT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_role(UUID, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user(UUID, BIGINT, BIGINT, BOOLEAN) TO authenticated;
