-- Run this SQL in the Supabase SQL editor to create the required tables and function.

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text,
  password_hash text not null,
  role text not null default 'agent',
  created_at timestamptz default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text,
  pibo text,
  gst text,
  pan text,
  address text,
  city text,
  pincode text,
  state text,
  latitude double precision,
  longitude double precision,
  company_type text,
  industry text,
  company_status text,
  website text,
  logo_url text,
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  lead_status text default 'New',
  value numeric,
  notes text,
  updated_at timestamptz default now()
);

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  service_type text not null,
  price numeric not null,
  notes text,
  sent_via text[],
  sent_at timestamptz default now(),
  status text default 'sent'
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_in_lat double precision,
  check_in_lng double precision,
  check_out timestamptz,
  check_out_lat double precision,
  check_out_lng double precision,
  total_hours numeric,
  status text default 'absent',
  visit_logs jsonb,
  location_lat double precision,
  location_lng double precision
);

alter table attendance
  add column if not exists check_in_lat double precision;
alter table attendance
  add column if not exists check_in_lng double precision;
alter table attendance
  add column if not exists check_out_lat double precision;
alter table attendance
  add column if not exists check_out_lng double precision;
alter table attendance
  add column if not exists total_hours numeric;
alter table attendance
  add column if not exists status text default 'absent';
alter table attendance
  add column if not exists visit_logs jsonb;
alter table attendance
  add column if not exists location_lat double precision;
alter table attendance
  add column if not exists location_lng double precision;

-- ============================================================
-- nearby_companies RPC FUNCTION (Haversine formula)
-- ============================================================

create or replace function nearby_companies(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision default 10
)
returns table (
  id uuid,
  name text,
  mobile text,
  pibo text,
  address text,
  city text,
  state text,
  pincode text,
  latitude double precision,
  longitude double precision,
  company_type text,
  industry text,
  company_status text,
  website text,
  logo_url text,
  distance_km double precision
)
language sql stable
as $$
  select
    c.id,
    c.name,
    c.mobile,
    c.pibo,
    c.address,
    c.city,
    c.state,
    c.pincode,
    c.latitude,
    c.longitude,
    c.company_type,
    c.industry,
    c.company_status,
    c.website,
    c.logo_url,
    (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(c.latitude)) *
        cos(radians(c.longitude) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(c.latitude))
      )
    ) as distance_km
  from companies c
  where
    c.latitude is not null
    and c.longitude is not null
    and (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(c.latitude)) *
        cos(radians(c.longitude) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(c.latitude))
      )
    ) <= radius_km
  order by distance_km asc;
$$;

-- ============================================================
-- ADD MISSING COLUMNS TO USERS
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- ACTIVITY LOGS TABLE
-- FIXED: columns aligned with adminActivityLogs.js (admin_name, resource_type,
--        resource_id, details). Removed mis-typed module/metadata/ip_address columns
--        and fixed the syntax error (comma before semicolon).
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  admin_name text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb,
   created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ADD MISSING COLUMNS TO COMPANIES
-- FIXED: added lead_status and notes — required by PATCH /admin/companies/:id
-- ============================================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'New';

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- ADD MISSING COLUMNS TO LEADS
-- ============================================================

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'New';

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- ADD MISSING COLUMNS TO QUOTATIONS
-- ============================================================

ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- ADD MISSING COLUMNS TO ATTENDANCE
-- ============================================================

ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE attendance
ALTER COLUMN visit_logs SET DEFAULT '[]'::jsonb;

-- ============================================================
-- PREVENT DUPLICATE ATTENDANCE PER USER PER DAY
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_attendance
ON attendance(user_id, date);

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_companies_city
ON companies(city);

CREATE INDEX IF NOT EXISTS idx_leads_status
ON leads(lead_status);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date
ON attendance(user_id, date);

-- ============================================================
-- UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotations_updated_at ON quotations;

CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON quotations
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;

CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- ADD OFFICE LOCATION COLUMNS TO USERS (for geofencing)
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS office_id TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS assigned_office_lat DOUBLE PRECISION;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS assigned_office_lng DOUBLE PRECISION;

-- ============================================================
-- VISITS TABLE (for field user company visits with photos)
-- ============================================================

CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add trigger for visits updated_at
DROP TRIGGER IF EXISTS update_visits_updated_at ON visits;

CREATE TRIGGER update_visits_updated_at
BEFORE UPDATE ON visits
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Index for visits queries
CREATE INDEX IF NOT EXISTS idx_visits_user_date
ON visits(user_id, visited_at DESC);
