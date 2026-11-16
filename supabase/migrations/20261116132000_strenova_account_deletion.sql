-- Strenova: self-service account deletion (GDPR right to erasure).
-- Every public table references auth.users ON DELETE CASCADE (or SET NULL for
-- audit "changed_by" columns), so deleting the auth user removes the account's
-- profile, workouts, schedule, drafts, messages, relationships and subscription.
-- The owner account cannot delete itself here, so the Owner Panel can't be lost.

create or replace function public.delete_my_account(p_confirm text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if upper(trim(coalesce(p_confirm, ''))) not in ('ВИДАЛИТИ', 'DELETE') then
    raise exception 'Confirmation text does not match' using errcode = '22023';
  end if;
  if exists (select 1 from public.owner_permissions op where op.user_id = v_uid) then
    raise exception 'The owner account cannot be deleted from the app' using errcode = '42501';
  end if;
  delete from auth.users u where u.id = v_uid;
  return found;
end;
$$;
revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
