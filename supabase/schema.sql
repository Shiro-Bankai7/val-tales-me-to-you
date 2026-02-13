create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references users(id) on delete set null,
  template_id text not null,
  vibe text not null,
  pages_json jsonb not null default '[]'::jsonb,
  character_refs text[] not null default '{}',
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists published_tales (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  slug text not null unique,
  is_premium boolean not null default false,
  narration_url text,
  published_at timestamptz not null default now()
);

create table if not exists purchases (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references users(id) on delete set null,
  type text not null check (type in ('export', 'premium')),
  provider_ref text not null unique,
  amount numeric(12,2) not null,
  currency text not null default 'NGN',
  created_at timestamptz not null default now()
);

create table if not exists reactions (
  id uuid primary key default uuid_generate_v4(),
  published_tale_id uuid not null references published_tales(id) on delete cascade,
  reaction text not null,
  reply_text text,
  created_at timestamptz not null default now()
);

alter table reactions add column if not exists reply_text text;

create index if not exists idx_published_tales_slug on published_tales (slug);
create index if not exists idx_projects_updated_at on projects (updated_at desc);
create index if not exists idx_reactions_tale on reactions (published_tale_id);

insert into storage.buckets (id, name, public)
values ('narrations', 'narrations', true)
on conflict (id) do nothing;
