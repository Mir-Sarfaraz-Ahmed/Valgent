-- ==============================================================================
-- VALGENT - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- AI-Powered Deterministic Project Validation Platform
-- ==============================================================================
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ==============================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- TABLE: profiles
-- Mirrors auth.users metadata with user profile details
-- ==============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar(255) not null,
  full_name varchar(255) default '',
  avatar_url text,
  provider varchar(32) default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: Automatically sync user on auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, provider)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- TABLE: projects (MAIN TABLE)
-- Stores registered repositories, validation status, and metadata
-- ==============================================================================
create table if not exists public.projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name varchar(255) not null,
  description text default '',
  repository_url text not null,
  branch varchar(100) not null default 'main',
  commit_sha varchar(64) not null default 'latest',
  status varchar(32) not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'needs_review', 'failed')),
  
  -- Cached verification metrics for fast dashboard rendering
  total_claims integer not null default 0,
  verified_claims integer not null default 0,
  partially_verified_claims integer not null default 0,
  not_verified_claims integer not null default 0,
  
  -- Latest audited report snapshot
  latest_report jsonb,
  
  last_analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_created_at on public.projects(created_at desc);

-- Row Level Security (RLS) for projects
alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- ==============================================================================
-- TABLE: analysis_reports
-- Historical verification runs and deep AST audit artifacts
-- ==============================================================================
create table if not exists public.analysis_reports (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  schema_version varchar(16) not null default '1.0',
  commit_sha varchar(64) not null,
  branch varchar(100) default 'main',
  status varchar(32) not null default 'COMPLETED'
    check (status in ('COMPLETED', 'DEGRADED', 'FAILED', 'INSUFFICIENT_EVIDENCE')),
  duration_ms integer not null default 0,
  
  -- Aggregated claim counts
  summary jsonb not null default '{
    "total_claims": 0,
    "verified_count": 0,
    "partially_verified_count": 0,
    "not_verified_count": 0,
    "insufficient_evidence_count": 0
  }'::jsonb,

  -- Architecture & Context Metrics
  architecture jsonb default '{
    "components": [],
    "entry_points": [],
    "api_routes": [],
    "databases": []
  }'::jsonb,
  
  context_metrics jsonb default '{
    "total_files": 0,
    "eligible_files": 0,
    "estimated_tokens": 0
  }'::jsonb,

  -- Interactive evidence graph payload
  graph jsonb default '{"nodes": [], "edges": []}'::jsonb,
  
  -- Diagnostics, errors, warnings
  diagnostics jsonb default '{"warnings": [], "errors": []}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_reports_project_id on public.analysis_reports(project_id);
create index if not exists idx_analysis_reports_owner_id on public.analysis_reports(owner_id);
create index if not exists idx_analysis_reports_created_at on public.analysis_reports(created_at desc);

alter table public.analysis_reports enable row level security;

create policy "Users can view own analysis reports"
  on public.analysis_reports for select
  using (auth.uid() = owner_id);

create policy "Users can insert own analysis reports"
  on public.analysis_reports for insert
  with check (auth.uid() = owner_id);

create policy "Users can delete own analysis reports"
  on public.analysis_reports for delete
  using (auth.uid() = owner_id);

-- ==============================================================================
-- TABLE: claims
-- Granular feature claims verified against AST & dynamic execution
-- ==============================================================================
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  analysis_report_id text references public.analysis_reports(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  claim_id varchar(64) not null,
  text text not null,
  status varchar(32) not null
    check (status in ('VERIFIED', 'PARTIALLY_VERIFIED', 'NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE')),
  reason text default '',
  evidence_ids text[] default '{}',
  limitations text[] default '{}',
  contradictions text[] default '{}',
  recommended_actions text[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_claims_project_id on public.claims(project_id);
create index if not exists idx_claims_report_id on public.claims(analysis_report_id);
create index if not exists idx_claims_status on public.claims(status);

alter table public.claims enable row level security;

create policy "Users can view own claims"
  on public.claims for select
  using (auth.uid() = owner_id);

create policy "Users can insert own claims"
  on public.claims for insert
  with check (auth.uid() = owner_id);

-- ==============================================================================
-- TABLE: evidence_items
-- Concrete code snippets and AST proof linked to claims
-- ==============================================================================
create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  analysis_report_id text references public.analysis_reports(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  evidence_id varchar(64) not null,
  source varchar(100) not null,
  path text not null,
  line_start integer,
  line_end integer,
  snippet text,
  classification varchar(64) default 'IMPLEMENTATION',
  description text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_items_project_id on public.evidence_items(project_id);
create index if not exists idx_evidence_items_report_id on public.evidence_items(analysis_report_id);

alter table public.evidence_items enable row level security;

create policy "Users can view own evidence"
  on public.evidence_items for select
  using (auth.uid() = owner_id);

create policy "Users can insert own evidence"
  on public.evidence_items for insert
  with check (auth.uid() = owner_id);

-- ==============================================================================
-- TABLE: roadmap_tasks
-- Remediation and implementation action items generated from claims
-- ==============================================================================
create table if not exists public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id varchar(64),
  claim_id varchar(64),
  title text not null,
  problem text default '',
  priority varchar(16) not null default 'MEDIUM'
    check (priority in ('HIGH', 'MEDIUM', 'LOW')),
  status varchar(20) not null default 'PENDING'
    check (status in ('PENDING', 'IN_PROGRESS', 'RESOLVED')),
  evidence_refs text[] default '{}',
  recommended_actions text[] default '{}',
  acceptance_criteria text[] default '{}',
  dependencies text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_roadmap_tasks_project_id on public.roadmap_tasks(project_id);
create index if not exists idx_roadmap_tasks_status on public.roadmap_tasks(status);

alter table public.roadmap_tasks enable row level security;

create policy "Users can view own roadmap tasks"
  on public.roadmap_tasks for select
  using (auth.uid() = owner_id);

create policy "Users can manage own roadmap tasks"
  on public.roadmap_tasks for all
  using (auth.uid() = owner_id);

-- ==============================================================================
-- TABLE: requirement_files
-- Uploaded PRDs, architecture specifications, and markdown documents
-- ==============================================================================
create table if not exists public.requirement_files (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name varchar(255) not null,
  size_bytes bigint not null,
  file_type varchar(64) default 'text/markdown',
  file_url text,
  status varchar(20) not null default 'parsed'
    check (status in ('uploading', 'parsed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_requirement_files_project_id on public.requirement_files(project_id);

alter table public.requirement_files enable row level security;

create policy "Users can view own requirement files"
  on public.requirement_files for select
  using (auth.uid() = owner_id);

create policy "Users can manage own requirement files"
  on public.requirement_files for all
  using (auth.uid() = owner_id);

-- ==============================================================================
-- HELPER TRIGGER: Auto-update updated_at timestamp
-- ==============================================================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists set_roadmap_tasks_updated_at on public.roadmap_tasks;
create trigger set_roadmap_tasks_updated_at
  before update on public.roadmap_tasks
  for each row execute procedure public.update_updated_at_column();

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- Enable real-time updates for projects, reports, and roadmap tasks
-- ==============================================================================
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.analysis_reports;
alter publication supabase_realtime add table public.roadmap_tasks;
