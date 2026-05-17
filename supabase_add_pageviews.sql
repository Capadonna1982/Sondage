create table page_views (
  id uuid default gen_random_uuid() primary key,
  event text not null,
  created_at timestamp default now()
);

alter table page_views enable row level security;
create policy "Public insert views" on page_views for insert with check (true);
create policy "Public read views" on page_views for select using (true);
