create or replace function public.claim_player_profile(
  p_player_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id
  into v_profile_id
  from public.player_profiles
  where player_id = trim(p_player_id);

  if v_profile_id is null then
    return null;
  end if;

  update public.player_profiles
  set user_id = auth.uid(),
      updated_at = now()
  where id = v_profile_id;

  return v_profile_id;
end;
$$;

grant execute on function public.claim_player_profile(text) to authenticated;
