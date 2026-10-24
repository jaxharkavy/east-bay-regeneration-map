create table public.support_requests(id uuid primary key default gen_random_uuid(),email text not null,message text not null check(char_length(message) between 10 and 2000),status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default now());
create index support_requests_status on public.support_requests(status,created_at);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon,authenticated;
grant all on public.support_requests to service_role;
