-- World Locations (hierarchical: region → city → building/dungeon)
create table world_locations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('region', 'city', 'dungeon', 'wilderness', 'building')),
  parent_id uuid references world_locations(id) on delete set null,
  description text,
  discovered boolean not null default false,
  visit_count integer not null default 0,
  coordinates_x real not null default 0,
  coordinates_y real not null default 0,
  image_url text,
  connected_locations uuid[] not null default '{}',
  npcs uuid[] not null default '{}',
  active_quests uuid[] not null default '{}',
  terrain text check (terrain in ('plains', 'forest', 'mountain', 'desert', 'swamp', 'coastal', 'underground', 'urban', 'arctic')),
  danger_level integer not null default 1 check (danger_level between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Factions
create table factions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  name text not null,
  description text,
  alignment text,
  headquarters_location_id uuid references world_locations(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Faction reputation (player standing per faction)
create table faction_reputation (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  faction_id uuid references factions(id) on delete cascade not null,
  score integer not null default 50 check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, faction_id)
);

-- NPC interaction logs (conversation/encounter history)
create table npc_interaction_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  npc_id uuid references npcs(id) on delete cascade not null,
  session_id uuid references sessions(id) on delete set null,
  location_id uuid references world_locations(id) on delete set null,
  interaction_type text not null default 'conversation' check (interaction_type in ('conversation', 'combat', 'trade', 'quest', 'other')),
  summary text not null,
  sentiment text check (sentiment in ('positive', 'negative', 'neutral')),
  disposition_before text,
  disposition_after text,
  created_at timestamptz not null default now()
);

-- Travel events (journey log)
create table travel_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  session_id uuid references sessions(id) on delete set null,
  from_location_id uuid references world_locations(id) on delete set null,
  to_location_id uuid references world_locations(id) on delete set null,
  encounter_type text check (encounter_type in ('combat', 'social', 'discovery', 'hazard', 'peaceful')),
  description text,
  created_at timestamptz not null default now()
);

-- Add current location tracking to campaigns
alter table campaigns
  add column if not exists current_location_id uuid references world_locations(id) on delete set null;

-- Add structured location reference to NPCs
alter table npcs
  add column if not exists location_id uuid references world_locations(id) on delete set null;

-- Row Level Security
alter table world_locations enable row level security;
alter table factions enable row level security;
alter table faction_reputation enable row level security;
alter table npc_interaction_logs enable row level security;
alter table travel_events enable row level security;

create policy "Users can CRUD world_locations via campaign"
  on world_locations for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

create policy "Users can CRUD factions via campaign"
  on factions for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

create policy "Users can CRUD faction_reputation via campaign"
  on faction_reputation for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

create policy "Users can CRUD npc_interaction_logs via campaign"
  on npc_interaction_logs for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

create policy "Users can CRUD travel_events via campaign"
  on travel_events for all
  using (campaign_id in (select id from campaigns where user_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where user_id = auth.uid()));

-- Auto-update triggers
create trigger world_locations_updated_at
  before update on world_locations
  for each row execute function update_updated_at();

create trigger faction_reputation_updated_at
  before update on faction_reputation
  for each row execute function update_updated_at();

-- Enable realtime for new tables
alter publication supabase_realtime add table world_locations;
alter publication supabase_realtime add table factions;
alter publication supabase_realtime add table faction_reputation;
alter publication supabase_realtime add table npc_interaction_logs;
alter publication supabase_realtime add table travel_events;
