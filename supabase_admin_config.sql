create table admin_config (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text not null,
  updated_at timestamp default now()
);

alter table admin_config enable row level security;

create policy "No public read on admin_config" on admin_config for select using (false);
create policy "No public insert on admin_config" on admin_config for insert with check (false);
create policy "No public update on admin_config" on admin_config for update using (false);

insert into admin_config (key, value) values
  ('dashboard_password_hash', '$2a$10$rOzCzBkPQPIJtJNKgzXWOeGkQwqXmZlG5yCuqHMn3UQyWvIJhJf4i');
