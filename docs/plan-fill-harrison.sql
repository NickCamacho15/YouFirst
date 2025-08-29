do $$
declare
  v_uid uuid := 'a9a2c27a-36e6-468a-96ab-6f94015779c3'::uuid;
  v_plan uuid;
  v_week uuid;
  r record;
  v_block uuid;
begin
  -- Ensure plan exists and is aligned to current week (Sunday start)
  select id into v_plan from public.training_plans where user_id=v_uid order by created_at desc limit 1;
  if v_plan is null then
    insert into public.training_plans (user_id, name, description, start_date, is_active)
    values (v_uid, 'Foundation Plan', 'Auto-filled this week', (current_date - extract(dow from current_date)::int), true)
    returning id into v_plan;
  else
    update public.training_plans
      set start_date = (current_date - extract(dow from current_date)::int), is_active = true
      where id = v_plan;
  end if;

  -- Ensure Week 1 exists
  select id into v_week from public.plan_weeks where plan_id=v_plan and position=0 limit 1;
  if v_week is null then
    insert into public.plan_weeks (plan_id, user_id, name, position)
    values (v_plan, v_uid, 'Week 1', 0)
    returning id into v_week;
  end if;

  -- Ensure days for positions 0..6
  for r in select * from (values (0,'Sun'),(1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri'),(6,'Sat')) as t(position,name) loop
    if not exists (select 1 from public.plan_days where plan_id=v_plan and week_id=v_week and position=r.position) then
      insert into public.plan_days (plan_id, week_id, user_id, name, position)
      values (v_plan, v_week, v_uid, r.name, r.position);
    end if;
  end loop;

  -- For each day, ensure a Main block and 3 exercises exist
  for r in select id, position from public.plan_days where plan_id=v_plan and week_id=v_week loop
    select id into v_block from public.plan_blocks where plan_id=v_plan and day_id=r.id order by position asc limit 1;
    if v_block is null then
      insert into public.plan_blocks (plan_id, day_id, user_id, name, letter, position)
      values (v_plan, r.id, v_uid, 'Main', 'A', 0)
      returning id into v_block;
    end if;

    if not exists (select 1 from public.plan_exercises where plan_id=v_plan and block_id=v_block) then
      insert into public.plan_exercises (plan_id, block_id, user_id, name, type, sets, reps, weight, rest, position)
      values
        (v_plan, v_block, v_uid, 'Compound Lift', 'Lifting', '5', '5', '185', '120', 0),
        (v_plan, v_block, v_uid, 'Accessory 1', 'Lifting', '3', '10', '60', '90', 1),
        (v_plan, v_block, v_uid, 'Accessory 2', 'Lifting', '3', '12', '40', '60', 2);
    end if;
  end loop;
end $$;
