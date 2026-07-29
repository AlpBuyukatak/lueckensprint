-- Revision-checked cloud writes for LückenSprint. Run after 001_user_progress.sql.
-- The function runs as the authenticated caller; it never bypasses RLS.
create or replace function public.save_user_progress(
  expected_revision bigint,
  next_schema_version integer,
  next_progress_data jsonb,
  next_device_id text
)
returns table(applied boolean, revision bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_revision bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  update public.user_progress
     set schema_version = next_schema_version,
         progress_data = next_progress_data,
         device_id = next_device_id,
         updated_at = now(),
         revision = revision + 1
   where user_id = auth.uid()
     and revision = expected_revision
  returning revision into next_revision;

  if found then
    return query select true, next_revision;
    return;
  end if;

  if expected_revision = 0 then
    insert into public.user_progress (user_id, schema_version, progress_data, device_id, revision)
    values (auth.uid(), next_schema_version, next_progress_data, next_device_id, 1)
    on conflict (user_id) do nothing
    returning revision into next_revision;

    if found then
      return query select true, next_revision;
      return;
    end if;
  end if;

  select p.revision into next_revision from public.user_progress p where p.user_id = auth.uid();
  return query select false, coalesce(next_revision, 0);
end;
$$;

grant execute on function public.save_user_progress(bigint, integer, jsonb, text) to authenticated;
