-- Mail Financial Sync - Supabase Schema
-- Ejecutar este script en el SQL Editor de Supabase

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  google_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda por usuario
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Tabla de eventos financieros
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('income', 'expense')),
  category TEXT NOT NULL CHECK (category IN ('card', 'credit', 'service', 'transfer', 'income')),
  date DATE NOT NULL,
  source TEXT NOT NULL,
  description TEXT NOT NULL,
  email_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email_id)
);

-- Índices para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, date);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service can insert users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;

-- Políticas RLS para users (solo dueño autenticado)
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete own profile"
  ON users FOR DELETE
  USING (auth.uid() = auth_user_id);

-- Políticas RLS para events
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

-- Vista para resumen mensual (opcional, puede calcularse en frontend)
CREATE OR REPLACE VIEW monthly_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', date)::DATE as month,
  SUM(CASE WHEN direction = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN direction = 'expense' THEN amount ELSE 0 END) as total_expense,
  COUNT(*) as event_count
FROM events
GROUP BY user_id, DATE_TRUNC('month', date);

-- Comentarios de documentación
COMMENT ON TABLE users IS 'Usuarios autenticados por Supabase Auth (vinculados con Google ID)';
COMMENT ON TABLE events IS 'Eventos financieros detectados desde correo';
COMMENT ON COLUMN events.direction IS 'income = ingreso, expense = egreso';
COMMENT ON COLUMN events.category IS 'card = pago tarjeta, credit = crédito, service = servicio, transfer = transferencia, income = ingreso';
COMMENT ON COLUMN events.email_id IS 'ID del mensaje de Gmail para evitar duplicados';
COMMENT ON COLUMN users.auth_user_id IS 'ID de auth.users para aplicar RLS por usuario autenticado';
