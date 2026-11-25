-- Dental Clinic Management System schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS doctors (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(120) NOT NULL,
  specialization    VARCHAR(120) NOT NULL,
  email             VARCHAR(160) NOT NULL UNIQUE,
  phone             VARCHAR(30)  NOT NULL,
  available_days    TEXT[]       NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'],
  start_time        TIME         NOT NULL DEFAULT '09:00',
  end_time          TIME         NOT NULL DEFAULT '17:00',
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT doctors_hours_chk CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS appointments (
  id                SERIAL PRIMARY KEY,
  patient_name      VARCHAR(120) NOT NULL,
  patient_phone     VARCHAR(30)  NOT NULL,
  patient_email     VARCHAR(160),
  -- RESTRICT: a doctor with appointments cannot be deleted (prevents orphaned rows)
  doctor_id         INTEGER      NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_date  DATE         NOT NULL,
  start_time        TIME         NOT NULL,
  duration_minutes  INTEGER      NOT NULL DEFAULT 30,
  reason            VARCHAR(500) NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT appointments_status_chk   CHECK (status IN ('pending','confirmed','completed','cancelled')),
  CONSTRAINT appointments_duration_chk CHECK (duration_minutes BETWEEN 10 AND 240)
);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments (doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_date        ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status      ON appointments (status);
