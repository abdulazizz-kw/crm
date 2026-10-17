-- Database plan for when the CRM moves from browser storage to Supabase (Postgres).
-- Not used yet: the app currently saves to localStorage via assets/crm/data.js.
-- Every table carries workspace_id, and row-level security limits each signed-in
-- user to the workspaces they belong to, so many businesses can share one database.

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'KWD',
  tax_rate numeric not null default 0,
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  user_id uuid references auth.users on delete set null,
  name text not null,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'rep')),
  title text,
  color text,
  target numeric not null default 0,
  unique (workspace_id, email)
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null,
  industry text,
  website text,
  city text,
  status text not null default 'lead' check (status in ('lead', 'active', 'churned')),
  owner_id uuid references members on delete set null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  company_id uuid not null references companies on delete cascade,
  name text not null,
  title text,
  email text,
  phone text
);

create table stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null,
  "order" int not null,
  probability numeric not null check (probability between 0 and 1),
  kind text not null check (kind in ('open', 'won', 'lost'))
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  title text not null,
  company_id uuid not null references companies on delete cascade,
  contact_id uuid references contacts on delete set null,
  owner_id uuid references members on delete set null,
  stage_id uuid not null references stages,
  value numeric not null default 0,
  expected_close date,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  kind text not null check (kind in ('call', 'email', 'meeting', 'note', 'stage')),
  body text not null,
  company_id uuid references companies on delete cascade,
  deal_id uuid references deals on delete cascade,
  member_id uuid references members on delete set null,
  at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  title text not null,
  kind text not null check (kind in ('call', 'meeting', 'demo', 'follow-up')),
  start timestamptz not null,
  duration_min int not null default 30,
  member_id uuid references members on delete set null,
  company_id uuid references companies on delete set null,
  done boolean not null default false
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  number text not null,
  company_id uuid references companies on delete set null,
  deal_id uuid references deals on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  issued_at date not null,
  due_at date not null,
  tax_rate numeric not null default 0,
  notes text,
  items jsonb not null default '[]',
  unique (workspace_id, number)
);

-- Row-level security: a user sees a row only if they are a member of its workspace.
create function is_member(ws uuid) returns boolean
language sql security definer stable as $$
  select exists (select 1 from members where workspace_id = ws and user_id = auth.uid());
$$;

do $$
declare t text;
begin
  foreach t in array array['members','companies','contacts','stages','deals','activities','events','invoices'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "workspace members" on %I using (is_member(workspace_id)) with check (is_member(workspace_id))', t);
  end loop;
end $$;

alter table workspaces enable row level security;
create policy "workspace members" on workspaces using (is_member(id));
