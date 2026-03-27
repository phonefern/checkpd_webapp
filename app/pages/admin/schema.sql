create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  email text not null unique,
  role text not null check (role in ('super_admin', 'admin', 'doctor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_admin_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;

create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_admin_users_updated_at();

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_current_user_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = public.current_auth_email()
      and role = 'super_admin'
      and is_active = true
  );
$$;

update public.admin_users
set role = case
  when role = 'super' then 'super_admin'
  when role = 'internal_staff' then 'admin'
  else role
end
where role in ('super', 'internal_staff');

-- Review any remaining `external_staff` rows manually before applying the new role check.
-- Example:
-- update public.admin_users set role = 'doctor' where role = 'external_staff';

alter table public.admin_users
drop constraint if exists admin_users_role_check;

alter table public.admin_users
add constraint admin_users_role_check
check (role in ('super_admin', 'admin', 'doctor'));

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_self_or_super" on public.admin_users;
create policy "admin_users_select_self_or_super"
on public.admin_users
for select
to authenticated
using (
  lower(email) = public.current_auth_email()
  or public.is_current_user_super_admin()
);

drop policy if exists "admin_users_super_insert" on public.admin_users;
create policy "admin_users_super_insert"
on public.admin_users
for insert
to authenticated
with check (
  public.is_current_user_super_admin()
);

drop policy if exists "admin_users_super_update" on public.admin_users;
create policy "admin_users_super_update"
on public.admin_users
for update
to authenticated
using (
  public.is_current_user_super_admin()
)
with check (
  public.is_current_user_super_admin()
);

drop policy if exists "admin_users_super_delete" on public.admin_users;
create policy "admin_users_super_delete"
on public.admin_users
for delete
to authenticated
using (
  public.is_current_user_super_admin()
);
