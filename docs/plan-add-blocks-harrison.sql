do $$
declare
  v_uid uuid := 'a9a2c27a-36e6-468a-96ab-6f94015779c3'::uuid;
  v_plan uuid;
  v_week uuid;
  r record;
  v_block_b uuid;
  v_block_c uuid;
begin
  -- Fetch latest plan and week 1
  select id into v_plan from public.training_plans where user_id=v_uid order by created_at desc limit 1;
  if v_plan is null then
    raise notice 'No training plan found for user %', v_uid;
    return;
  end if;
  select id into v_week from public.plan_weeks where plan_id=v_plan and position=0 limit 1;
  if v_week is null then
    raise notice 'No week found for plan %', v_plan;
    return;
  end if;

  -- For each day, ensure Blocks B and C exist and have exercises
  for r in select id, position from public.plan_days where plan_id=v_plan and week_id=v_week loop
    -- Block B: Accessories
    select id into v_block_b from public.plan_blocks where plan_id=v_plan and day_id=r.id and letter='B' limit 1;
    if v_block_b is null then
      insert into public.plan_blocks (plan_id, day_id, user_id, name, letter, position)
      values (v_plan, r.id, v_uid, 'Accessories', 'B', 1)
      returning id into v_block_b;
    end if;
    if not exists (select 1 from public.plan_exercises where plan_id=v_plan and block_id=v_block_b) then
      insert into public.plan_exercises (plan_id, block_id, user_id, name, type, sets, reps, weight, rest, position)
      values
        (v_plan, v_block_b, v_uid, 'Dumbbell Row', 'Lifting', '3', '10', '60', '90', 0),
        (v_plan, v_block_b, v_uid, 'Lateral Raise', 'Lifting', '3', '12', '20', '60', 1),
        (v_plan, v_block_b, v_uid, 'Tricep Pushdown', 'Lifting', '3', '12', '40', '60', 2);
    end if;

    -- Block C: Conditioning
    select id into v_block_c from public.plan_blocks where plan_id=v_plan and day_id=r.id and letter='C' limit 1;
    if v_block_c is null then
      insert into public.plan_blocks (plan_id, day_id, user_id, name, letter, position)
      values (v_plan, r.id, v_uid, 'Conditioning', 'C', 2)
      returning id into v_block_c;
    end if;
    if not exists (select 1 from public.plan_exercises where plan_id=v_plan and block_id=v_block_c) then
      insert into public.plan_exercises (plan_id, block_id, user_id, name, type, sets, reps, weight, rest, time, position)
      values
        (v_plan, v_block_c, v_uid, 'Bike Erg', 'Cardio', null, null, null, null, '10', 0),
        (v_plan, v_block_c, v_uid, 'Row Erg', 'Cardio', null, null, null, null, '8', 1);
    end if;
  end loop;
end $$;
