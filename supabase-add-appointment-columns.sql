-- Migracion: Agregar columnas faltantes a la tabla appointments
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- Psicologia
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal';

-- Enfermeria
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS attention_type TEXT DEFAULT 'control';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS temperature TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS blood_pressure TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS heart_rate TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS weight TEXT;

-- Trabajo Social
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS intervention_type TEXT DEFAULT 'individual';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT 'self';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS referral_details TEXT;
