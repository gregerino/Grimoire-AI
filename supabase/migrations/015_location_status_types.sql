-- Expand location types and add exploration status
-- Supports the locations list sprint (week 37-38)

-- Drop old check constraint and add expanded one
alter table world_locations drop constraint if exists world_locations_type_check;
alter table world_locations add constraint world_locations_type_check
  check (type in ('region', 'city', 'dungeon', 'wilderness', 'building', 'forest', 'ruin', 'sea', 'fort', 'temple', 'village'));

-- Add exploration status column
alter table world_locations
  add column if not exists status text not null default 'undiscovered'
    check (status in ('undiscovered', 'known', 'visited', 'completed'));

-- Add notes array
alter table world_locations
  add column if not exists notes text[] not null default '{}';

-- Migrate existing data: derive status from discovered + visit_count
update world_locations
  set status = case
    when discovered and visit_count > 0 then 'visited'
    when discovered then 'known'
    else 'undiscovered'
  end;
