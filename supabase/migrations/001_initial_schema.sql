-- Enable pgvector for future RAG functionality
create extension if not exists vector;

-- Campaigns
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  description text,
  setting text,
  character_name text,
  character_class text,
  character_level integer not null default 1,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sessions (play sessions within a campaign)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  title text,
  summary text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- NPCs
create table npcs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  name text not null,
  description text,
  race text,
  occupation text,
  disposition text not null default 'neutral' check (disposition in ('friendly', 'neutral', 'hostile')),
  is_alive boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- Quests
create table quests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'completed', 'failed', 'abandoned')),
  priority text not null default 'side' check (priority in ('main', 'side', 'personal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notes
create table notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  session_id uuid references sessions(id) on delete set null,
  title text not null,
  content text not null default '',
  category text not null default 'other' check (category in ('lore', 'event', 'location', 'item', 'other')),
  created_at timestamptz not null default now()
);

-- Inventory
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  name text not null,
  description text,
  quantity integer not null default 1,
  category text not null default 'other' check (category in ('weapon', 'armor', 'potion', 'scroll', 'gear', 'treasure', 'other')),
  is_equipped boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table campaigns enable row level security;
alter table sessions enable row level security;
alter table npcs enable row level security;
alter table quests enable row level security;
alter table notes enable row level security;
alter table inventory_items enable row level security;

-- Policies: users can only access their own campaigns
create policy "Users can CRUD own campaigns"
  on campaigns for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policies for campaign-owned tables (access if user owns the parent campaign)
create policy "Users can CRUD sessions via campaign"
  on sessions for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

create policy "Users can CRUD npcs via campaign"
  on npcs for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

create policy "Users can CRUD quests via campaign"
  on quests for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

create policy "Users can CRUD notes via campaign"
  on notes for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

create policy "Users can CRUD inventory via campaign"
  on inventory_items for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function update_updated_at();

create trigger quests_updated_at
  before update on quests
  for each row execute function update_updated_at();
