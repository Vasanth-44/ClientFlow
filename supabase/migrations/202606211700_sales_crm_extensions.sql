-- Migration: Sales CRM & Calling Agent Extensions
-- Timestamp: 2026-06-21 17:00:00

-- 1. Create Lead Stage History Table
create table if not exists public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  stage text not null,
  entered_at timestamptz default now() not null,
  left_at timestamptz,
  duration_seconds integer
);

-- 2. Create Proposals Table
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null,
  scope_of_work text,
  deliverables text,
  timeline text,
  pricing numeric default 0,
  terms text,
  status text check (status in ('Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected')) default 'Draft' not null,
  created_at timestamptz default now() not null
);

-- 3. Create Call Campaigns Table
create table if not exists public.call_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  name text not null,
  industry text,
  status text check (status in ('Draft', 'Active', 'Completed')) default 'Draft' not null,
  calls_made integer default 0 not null,
  interested_leads integer default 0 not null,
  meetings_booked integer default 0 not null,
  created_at timestamptz default now() not null
);

-- 4. Create Call Logs Table
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  lead_id uuid references public.leads(id) on delete cascade,
  campaign_id uuid references public.call_campaigns(id) on delete set null,
  duration integer default 0 not null, -- duration in seconds
  outcome text check (outcome in ('Interested', 'Not Interested', 'Call Back Later', 'No Answer', 'Voicemail')) not null,
  transcript text,
  followup_date date,
  created_at timestamptz default now() not null
);

-- 5. Create Audit Logs Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null default auth.uid(),
  action text not null,
  details text,
  ip_address text,
  created_at timestamptz default now() not null
);

-- ENABLE ROW LEVEL SECURITY (RLS) FOR NEW TABLES
alter table public.lead_stage_history enable row level security;
alter table public.proposals enable row level security;
alter table public.call_campaigns enable row level security;
alter table public.call_logs enable row level security;
alter table public.audit_logs enable row level security;

-- CREATE RLS POLICIES FOR NEW TABLES
drop policy if exists "Users can manage own lead histories" on public.lead_stage_history;
create policy "Users can manage own lead histories" on public.lead_stage_history for all using (
  exists (
    select 1 from public.leads where leads.id = lead_stage_history.lead_id and leads.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage own proposals" on public.proposals;
create policy "Users can manage own proposals" on public.proposals for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own call campaigns" on public.call_campaigns;
create policy "Users can manage own call campaigns" on public.call_campaigns for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own call logs" on public.call_logs;
create policy "Users can manage own call logs" on public.call_logs for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own audit logs" on public.audit_logs;
create policy "Users can manage own audit logs" on public.audit_logs for all using (auth.uid() = user_id);
