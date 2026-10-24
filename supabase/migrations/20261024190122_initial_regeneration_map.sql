-- All writes and private reads go through the server API. Browser database roles
-- have no table or function access. RLS is enabled as defense in depth.
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 2 and 100), website text not null default '', created_at timestamptz not null default now()
);
create table public.locations (
 id uuid primary key default gen_random_uuid(), name text not null, address text not null, city text not null,
 latitude double precision not null check(latitude between 37.3 and 38.3), longitude double precision not null check(longitude between -122.7 and -121.4)
);
create table public.events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), location_id uuid not null references public.locations(id),
 title text not null check(char_length(title) between 5 and 110), description text not null check(char_length(description) between 30 and 3000),
 category text not null check(category in ('Gardens & growing','Food & sharing','Nature & restoration','Learning & making','Community care')),
 starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at), timezone text not null default 'America/Los_Angeles',
 accessibility text not null default '', bring text not null default '',
 status text not null default 'pending' check(status in ('pending','published','hidden','cancelled')), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), reviewed_at timestamptz
);
create index events_discovery on public.events(status,starts_at);
create index events_organization on public.events(organization_id);
create index events_location on public.events(location_id);
create table public.event_contacts (event_id uuid primary key references public.events(id) on delete cascade, name text not null, email text not null);
create table public.registrations (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), name text not null, email text not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'), status text not null default 'registered' check(status in ('registered','cancelled')),
 created_at timestamptz not null default now(), cancelled_at timestamptz
);
create unique index registrations_unique_active on public.registrations(event_id,lower(email)) where status='registered';
create index registrations_event on public.registrations(event_id);
create table public.guild_admins(user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.guild_setup(token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'), expires_at timestamptz not null, used_at timestamptz);
create table public.request_limits (key text primary key, hits integer not null, expires_at timestamptz not null);
create index request_limits_expiry on public.request_limits(expires_at);
create view public.event_details with (security_invoker=true) as
 select e.*, o.name as organization, o.website, l.name as location_name,l.address,l.city,l.latitude,l.longitude
 from public.events e join public.organizations o on o.id=e.organization_id join public.locations l on l.id=e.location_id;

create function public.submit_event(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare oid uuid; lid uuid; eid uuid;
begin
 insert into public.organizations(name,website) values(payload->>'organization',coalesce(payload->>'website','')) returning id into oid;
 insert into public.locations(name,address,city,latitude,longitude) values(payload->>'location_name',payload->>'address',payload->>'city',(payload->>'latitude')::float8,(payload->>'longitude')::float8) returning id into lid;
 insert into public.events(organization_id,location_id,title,description,category,starts_at,ends_at,accessibility,bring)
 values(oid,lid,payload->>'title',payload->>'description',payload->>'category',(payload->>'starts_at')::timestamptz,(payload->>'ends_at')::timestamptz,coalesce(payload->>'accessibility',''),coalesce(payload->>'bring','')) returning id into eid;
 insert into public.event_contacts(event_id,name,email) values(eid,payload->>'contact_name',lower(payload->>'contact_email'));
 return eid;
end $$;

create function public.register_for_event(p_event uuid,p_name text,p_email text,p_token_hash text) returns uuid language plpgsql security invoker set search_path='' as $$
declare event_row public.events; rid uuid;
begin
 select * into event_row from public.events where id=p_event for update;
 if not found or event_row.status<>'published' or event_row.is_demo or event_row.starts_at<=now() then raise exception 'EVENT_UNAVAILABLE'; end if;
 insert into public.registrations(event_id,name,email,token_hash) values(p_event,p_name,lower(p_email),p_token_hash)
 on conflict (event_id,lower(email)) where status='registered' do nothing returning id into rid;
 if rid is null then raise exception 'ALREADY_REGISTERED'; end if;
 return rid;
end $$;

create function public.consume_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare count_now integer;
begin
 delete from public.request_limits where expires_at<now();
 insert into public.request_limits(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set hits=public.request_limits.hits+1 returning hits into count_now;
 return count_now<=p_limit;
end $$;

create function public.claim_guild_setup(p_hash text,p_user uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.guild_setup set used_at=now() where token_hash=p_hash and used_at is null and expires_at>now();
 if not found then return false; end if;
 insert into public.guild_admins(user_id) values(p_user);
 return true;
end $$;

alter table public.organizations enable row level security;
alter table public.locations enable row level security;
alter table public.events enable row level security;
alter table public.event_contacts enable row level security;
alter table public.registrations enable row level security;
alter table public.guild_admins enable row level security;
alter table public.guild_setup enable row level security;
alter table public.request_limits enable row level security;
revoke all on public.organizations,public.locations,public.events,public.event_contacts,public.registrations,public.guild_admins,public.guild_setup,public.request_limits,public.event_details from anon,authenticated;
grant all on public.organizations,public.locations,public.events,public.event_contacts,public.registrations,public.guild_admins,public.guild_setup,public.request_limits to service_role;
grant select on public.event_details to service_role;
revoke all on function public.submit_event(jsonb), public.register_for_event(uuid,text,text,text),public.consume_rate_limit(text,integer,integer),public.claim_guild_setup(text,uuid) from public,anon,authenticated;
grant execute on function public.submit_event(jsonb), public.register_for_event(uuid,text,text,text),public.consume_rate_limit(text,integer,integer),public.claim_guild_setup(text,uuid) to service_role;
