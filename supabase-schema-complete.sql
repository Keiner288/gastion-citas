-- ============================================================
-- GESTION CITAS - DATABASE SCHEMA COMPLETO
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

-- LIMPIAR OBJETOS EXISTENTES (orden inverso de dependencias)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_profile(UUID);
DROP FUNCTION IF EXISTS upsert_profile(UUID, TEXT, TEXT, BIGINT, BIGINT);
DROP FUNCTION IF EXISTS update_profile_role(UUID, BIGINT, BIGINT);
DROP FUNCTION IF EXISTS delete_user_account();
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS dependencies;
DROP TABLE IF EXISTS roles;

-- ============================================================
-- 1. TABLA ROLES
-- ============================================================
CREATE TABLE roles (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb
);

-- ============================================================
-- 2. TABLA DEPENDENCIES
-- ============================================================
CREATE TABLE dependencies (
  id    BIGSERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#39a900'
);

-- ============================================================
-- 3. TABLA PROFILES
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL DEFAULT '',
  document_number TEXT NOT NULL DEFAULT '',
  role_id         BIGINT REFERENCES roles(id) ON DELETE SET NULL,
  dependency_id   BIGINT REFERENCES dependencies(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. TABLA APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  dependency_id   BIGINT NOT NULL REFERENCES dependencies(id),
  scheduled_date  DATE NOT NULL,
  scheduled_time  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  reason          TEXT NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. TABLA AUDIT_LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  oid_data    JSONB,
  new_data    JSONB,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. TABLA SYSTEM_CONFIG
-- ============================================================
CREATE TABLE system_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. INDICES
-- ============================================================
CREATE INDEX idx_profiles_role_id ON profiles(role_id);
CREATE INDEX idx_profiles_dependency_id ON profiles(dependency_id);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX idx_appointments_dependency_id ON appointments(dependency_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);

-- ============================================================
-- 8. TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. RLS - Habilitar pero con policies seguras (NO recursivas)
-- ============================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- ROLES: todos pueden leer, solo service_role escribe
CREATE POLICY "roles_select_all" ON roles FOR SELECT USING (true);
CREATE POLICY "roles_insert_service" ON roles FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "roles_update_service" ON roles FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "roles_delete_service" ON roles FOR DELETE USING (auth.role() = 'service_role');

-- DEPENDENCIES: todos pueden leer, solo service_role escribe
CREATE POLICY "dependencies_select_all" ON dependencies FOR SELECT USING (true);
CREATE POLICY "dependencies_insert_service" ON dependencies FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "dependencies_update_service" ON dependencies FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "dependencies_delete_service" ON dependencies FOR DELETE USING (auth.role() = 'service_role');

-- PROFILES: service_role tiene acceso total, authenticated puede leer todos y actualizar el propio
CREATE POLICY "profiles_select_auth" ON profiles FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "profiles_insert_service" ON profiles FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');
CREATE POLICY "profiles_delete_service" ON profiles FOR DELETE USING (auth.role() = 'service_role');

-- APPOINTMENTS: service_role total, authenticated CRUD propio
CREATE POLICY "appointments_select_auth" ON appointments FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "appointments_insert_auth" ON appointments FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
CREATE POLICY "appointments_update_auth" ON appointments FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = professional_id OR auth.role() = 'service_role');
CREATE POLICY "appointments_delete_service" ON appointments FOR DELETE USING (auth.role() = 'service_role');

-- AUDIT_LOGS: authenticated puede insertar y leer, solo service_role actualiza/borra
CREATE POLICY "audit_logs_select_auth" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "audit_logs_insert_auth" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "audit_logs_update_service" ON audit_logs FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "audit_logs_delete_service" ON audit_logs FOR DELETE USING (auth.role() = 'service_role');

-- SYSTEM_CONFIG: authenticated puede leer, service_role escribe
CREATE POLICY "system_config_select_auth" ON system_config FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "system_config_insert_service" ON system_config FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "system_config_update_service" ON system_config FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "system_config_delete_service" ON system_config FOR DELETE USING (auth.role() = 'service_role');

-- ============================================================
-- 10. FUNCIONES RPC (bypass RLS via SECURITY DEFINER)
-- ============================================================

-- GET PROFILE con roles y dependencies
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
    'roles', CASE WHEN r.id IS NOT NULL THEN json_build_object('name', r.name, 'permissions', r.permissions) ELSE NULL END,
    'dependencies', CASE WHEN d.id IS NOT NULL THEN json_build_object('name', d.name, 'color', d.color) ELSE NULL END
  ) INTO result
  FROM profiles p
  LEFT JOIN roles r ON r.id = p.role_id
  LEFT JOIN dependencies d ON d.id = p.dependency_id
  WHERE p.id = p_user_id;
  RETURN result;
END;
$$;

-- UPSERT PROFILE
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

-- UPDATE PROFILE ROLE
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

-- UPDATE USER BY ADMIN (bypass RLS via SECURITY DEFINER)
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
      is_active = p_is_active
  WHERE id = p_id
  RETURNING json_build_object(
    'id', id, 'full_name', full_name, 'document_number', document_number,
    'role_id', role_id, 'dependency_id', dependency_id, 'is_active', is_active,
    'created_at', created_at, 'updated_at', updated_at
  ) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user(UUID, BIGINT, BIGINT, BOOLEAN) TO authenticated;

-- DELETE USER ACCOUNT (borra propio perfil + auth user)
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  DELETE FROM profiles WHERE id = current_user_id;
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- ============================================================
-- 11. TRIGGER: crear profile automaticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, document_number, role_id, dependency_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'document_number', ''),
    COALESCE((NEW.raw_user_meta_data->>'role_id')::bigint, 6),
    (NEW.raw_user_meta_data->>'dependency_id')::bigint
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 12. GRANT PERMISOS
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON appointments TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT ON system_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_profile(UUID, TEXT, TEXT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_role(UUID, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- ============================================================
-- 13. SEED DATA: ROLES
-- ============================================================
INSERT INTO roles (id, name, description, permissions) VALUES
  (1, 'SUPERADMIN',       'Super Administrador del sistema',
    '["dashboard.view","users.view","users.create","users.edit","users.delete","appointments.view","appointments.view_all","appointments.edit","appointments.cancel","appointments.reassign","appointments.complete","appointments.history","reports.view","reports.export","audit.view","config.edit","dependencies.manage","roles.manage"]'::jsonb),
  (2, 'COORDINACION',     'Coordinador de Bienestar',
    '["dashboard.view","users.view","appointments.view_all","appointments.edit","appointments.cancel","appointments.reassign","appointments.complete","appointments.history","reports.view","reports.export"]'::jsonb),
  (3, 'PSICOLOGIA',       'Profesional de Psicologia',
    '["dashboard.view","appointments.view","appointments.edit","appointments.complete","appointments.history"]'::jsonb),
  (4, 'ENFERMERIA',       'Profesional de Enfermeria',
    '["dashboard.view","appointments.view","appointments.edit","appointments.complete","appointments.history"]'::jsonb),
  (5, 'TRABAJO_SOCIAL',   'Profesional de Trabajo Social',
    '["dashboard.view","appointments.view","appointments.edit","appointments.complete","appointments.history"]'::jsonb),
  (6, 'APRENDIZ',         'Aprendiz / Estudiante',
    '["dashboard.view","appointments.view","appointments.cancel"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. SEED DATA: DEPENDENCIES
-- ============================================================
INSERT INTO dependencies (id, name, color) VALUES
  (1, 'Psicologia',      '#8b5cf6'),
  (2, 'Enfermeria',      '#ef4444'),
  (3, 'Trabajo Social',  '#f97316')
ON CONFLICT (id) DO NOTHING;

-- Resetear secuencias para que los proximos IDs sean correctos
SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));
SELECT setval('dependencies_id_seq', (SELECT COALESCE(MAX(id), 1) FROM dependencies));

-- ============================================================
-- 15. SEED DATA: SYSTEM_CONFIG
-- ============================================================
INSERT INTO system_config (key, value) VALUES
  ('appointment_limits', '{"max_pending_per_user": 5, "max_advance_days": 30, "min_advance_hours": 24}'::jsonb),
  ('working_hours', '{"start": "08:00", "end": "17:00"}'::jsonb),
  ('notification_settings', '{"reminder_hours_before": 24}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 16. DESHABILITAR CONFIRMATION DE EMAIL (para testing)
-- ============================================================
-- Esto permite login sin verificar email
-- Nota: esto es solo para desarrollo. En produccion se debe habilitar.
UPDATE auth.config SET email_confirmed = true WHERE id = 1;

-- LISTO. La base de datos esta configurada.
