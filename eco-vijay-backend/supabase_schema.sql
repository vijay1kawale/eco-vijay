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
  check_out timestamptz,
  location_lat double precision,
  location_lng double precision
);

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
