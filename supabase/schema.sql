-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (synchronized with auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text unique,
  avatar text,
  created_at timestamptz default now()
);

-- 2. Clients Table
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  name text not null,
  business_name text,
  email text,
  phone text,
  website text,
  address text,
  notes text,
  created_at timestamptz default now()
);

-- 3. Projects Table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  name text not null,
  description text,
  budget numeric default 0,
  deadline date,
  status text check (status in ('Lead', 'Proposal Sent', 'In Progress', 'Testing', 'Completed', 'Cancelled')) default 'Lead',
  priority text check (priority in ('Low', 'Medium', 'High', 'Urgent')) default 'Medium',
  created_at timestamptz default now()
);

-- 4. Tasks Table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  name text not null,
  deadline date,
  priority text check (priority in ('Low', 'Medium', 'High', 'Urgent')) default 'Medium',
  status text check (status in ('Todo', 'In Progress', 'Completed')) default 'Todo',
  created_at timestamptz default now()
);

-- 5. Payments Table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  total_amount numeric default 0,
  advance_paid numeric default 0,
  received numeric default 0,
  pending numeric default 0,
  created_at timestamptz default now()
);

-- 6. Invoices Table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  invoice_number text not null,
  amount numeric default 0,
  tax numeric default 0,
  due_date date,
  status text check (status in ('Paid', 'Unpaid', 'Overdue')) default 'Unpaid',
  created_at timestamptz default now()
);

-- 7. Documents Table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  file_name text not null,
  file_url text not null,
  file_type text,
  created_at timestamptz default now()
);

-- 8. Notifications Table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  message text not null,
  type text default 'info',
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ENABLE ROW LEVEL SECURITY (RLS)
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

-- CREATE RLS POLICIES (Users can only access their own records)
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

drop policy if exists "Users can manage own clients" on public.clients;
create policy "Users can manage own clients" on public.clients for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own projects" on public.projects;
create policy "Users can manage own projects" on public.projects for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own tasks" on public.tasks;
create policy "Users can manage own tasks" on public.tasks for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own payments" on public.payments;
create policy "Users can manage own payments" on public.payments for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own invoices" on public.invoices;
create policy "Users can manage own invoices" on public.invoices for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own documents" on public.documents;
create policy "Users can manage own documents" on public.documents for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own notifications" on public.notifications;
create policy "Users can manage own notifications" on public.notifications for all using (auth.uid() = user_id);

-- AUTOMATIC USER REGISTRATION TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. Leads Table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  full_name text not null,
  business_name text,
  email text,
  phone text,
  website text,
  business_category text,
  lead_source text,
  status text check (status in ('New Lead', 'Contacted', 'Interested', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost')) default 'New Lead',
  notes text,
  created_at timestamptz default now()
);

-- 10. Activities Table
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  lead_id uuid references public.leads(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  message text not null,
  type text default 'info',
  created_at timestamptz default now()
);

-- 11. AI Generations Table
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade default auth.uid(),
  type text check (type in ('proposal', 'email', 'meeting_notes')) not null,
  input_params jsonb not null,
  generated_content text not null,
  created_at timestamptz default now()
);

-- ENABLE ROW LEVEL SECURITY (RLS) FOR NEW TABLES
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.ai_generations enable row level security;

-- CREATE RLS POLICIES FOR NEW TABLES
drop policy if exists "Users can manage own leads" on public.leads;
create policy "Users can manage own leads" on public.leads for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own activities" on public.activities;
create policy "Users can manage own activities" on public.activities for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own ai_generations" on public.ai_generations;
create policy "Users can manage own ai_generations" on public.ai_generations for all using (auth.uid() = user_id);

-- 12. Teams Table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz default now()
);

-- 13. Team Members Table
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  name text,
  email text not null,
  role text check (role in ('Owner', 'Admin', 'Member')) default 'Member',
  status text check (status in ('Active', 'Pending')) default 'Pending',
  created_at timestamptz default now()
);

-- ENABLE ROW LEVEL SECURITY
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- CREATE RLS POLICIES
drop policy if exists "Users can manage own teams" on public.teams;
create policy "Users can manage own teams" on public.teams for all using (auth.uid() = owner_id);

drop policy if exists "Users can view team members" on public.team_members;
create policy "Users can view team members" on public.team_members for all using (
  exists (
    select 1 from public.teams where id = team_members.team_id and owner_id = auth.uid()
  )
);
