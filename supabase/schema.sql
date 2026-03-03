-- Watchlist items configured by you
create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default true,
  make text not null,
  model text not null,
  search_url text,
  keywords text[] not null default '{}',
  min_year int,
  max_year int,
  transmission text not null default 'any', -- any | manual | automatic
  min_engine_cc int,
  max_engine_cc int,
  max_price_jpy int,
  max_km int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Raw listing snapshots
create table if not exists car_listings (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'auc.japancardirect.com',
  source_listing_id text,
  url text not null,
  make text,
  model text,
  title text,
  year int,
  mileage_km int,
  price_jpy int,
  auction_house text,
  auction_date date,
  watchlist_id uuid references watchlist(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_new boolean not null default true,
  payload jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_car_listings_unique_source
  on car_listings (source, coalesce(source_listing_id, url));

create index if not exists idx_car_listings_new on car_listings (is_new, last_seen_at desc);
create index if not exists idx_car_listings_watchlist on car_listings (watchlist_id);

-- Archive table for verlopen listings
create table if not exists car_listings_archive (
  like car_listings including defaults including constraints
);

alter table car_listings_archive
  add column if not exists archived_at timestamptz not null default now();

create index if not exists idx_car_listings_archive_archived_at on car_listings_archive (archived_at desc);

-- Collector run logs
create table if not exists collector_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  checked_at timestamptz not null default now(),
  fetched_count int not null default 0,
  matched_count int not null default 0,
  inserted_count int not null default 0,
  updated_count int not null default 0,
  error_text text
);
