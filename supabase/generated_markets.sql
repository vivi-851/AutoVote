-- AutoVote · AI 生成盘口（根据新闻内容生成可下注的预测市场）
-- 在 Supabase SQL Editor 整段执行。依赖已建好的 profiles / bets（schema.sql）。

-- ── 生成盘口表 ──────────────────────────────────────
create table if not exists public.generated_markets (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  category text,
  news_headline text,
  news_url text,
  news_source text,
  init_prob numeric not null check (init_prob > 0 and init_prob < 1),
  -- 定价池（CPMM）：price_yes = pool_yes / (pool_yes + pool_no)
  liquidity numeric not null default 500,
  pool_yes numeric not null,
  pool_no numeric not null,
  end_date date,
  status text not null default 'open', -- open | resolved
  outcome text,                        -- yes | no（结算后）
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);

alter table public.generated_markets enable row level security;
drop policy if exists gen_select_all on public.generated_markets;
create policy gen_select_all on public.generated_markets for select using (true); -- 公开可读

-- 关联生成盘口的下注（复用 bets 表，新增可空外键）
alter table public.bets add column if not exists gen_market_id uuid references public.generated_markets (id) on delete cascade;
-- Polymarket 盘口的 market_slug 必填，这里放宽给生成盘口用
alter table public.bets alter column market_slug drop not null;

-- ── 创建生成盘口（由生成管线调用）────────────────────
create or replace function public.create_generated_market(
  p_question text, p_category text, p_news_headline text, p_news_url text,
  p_news_source text, p_init_prob numeric, p_end_date date, p_liquidity numeric default 500
) returns public.generated_markets language plpgsql security definer set search_path = public as $$
declare v_row public.generated_markets;
begin
  if p_init_prob <= 0 or p_init_prob >= 1 then p_init_prob := 0.5; end if;
  insert into public.generated_markets
    (question, category, news_headline, news_url, news_source, init_prob,
     liquidity, pool_yes, pool_no, end_date)
  values
    (p_question, p_category, p_news_headline, p_news_url, p_news_source, p_init_prob,
     p_liquidity, p_liquidity * p_init_prob, p_liquidity * (1 - p_init_prob), p_end_date)
  returning * into v_row;
  return v_row;
end; $$;

-- ── 在生成盘口上下注（AMM：扣分→按当前价记份额→推动价格）──
create or replace function public.place_gen_bet(
  p_gen_id uuid, p_side text, p_stake integer
) returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_mkt public.generated_markets;
  v_label text;
  v_price numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_stake <= 0 then raise exception 'invalid stake'; end if;
  if p_side not in ('yes','no') then raise exception 'invalid side'; end if;

  select * into v_mkt from public.generated_markets where id = p_gen_id for update;
  if v_mkt.id is null then raise exception 'market not found'; end if;
  if v_mkt.status <> 'open' then raise exception 'market closed'; end if;

  -- 成交前价格作为入场价
  v_price := case when p_side = 'yes'
    then v_mkt.pool_yes / (v_mkt.pool_yes + v_mkt.pool_no)
    else v_mkt.pool_no  / (v_mkt.pool_yes + v_mkt.pool_no) end;
  v_label := case when p_side = 'yes' then 'Yes' else 'No' end;

  select * into v_profile from public.profiles where id = v_uid for update;
  if v_profile.points < p_stake then raise exception 'insufficient points'; end if;

  update public.profiles set points = points - p_stake where id = v_uid returning * into v_profile;

  insert into public.bets
    (user_id, gen_market_id, market_slug, market_title, outcome_label,
     outcome_market_id, entry_price, stake, shares)
  values
    (v_uid, p_gen_id, 'gen', v_mkt.question, v_label,
     p_gen_id::text, v_price, p_stake, p_stake::numeric / v_price);

  -- 推动池子（下注方资金注入对应池 → 价格向人群偏移）
  if p_side = 'yes' then
    update public.generated_markets set pool_yes = pool_yes + p_stake where id = p_gen_id;
  else
    update public.generated_markets set pool_no = pool_no + p_stake where id = p_gen_id;
  end if;

  return v_profile;
end; $$;

-- ── 结算生成盘口（由 LLM 判定后调用，给赢家派分）──────
create or replace function public.resolve_generated_market(
  p_id uuid, p_outcome text, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_label text;
begin
  if p_outcome not in ('yes','no') then raise exception 'invalid outcome'; end if;
  v_label := case when p_outcome = 'yes' then 'Yes' else 'No' end;

  update public.generated_markets
    set status = 'resolved', outcome = p_outcome, resolved_at = now(), resolution_note = p_note
    where id = p_id and status = 'open';

  -- 赢家：每份额结算 1 分
  update public.profiles pr
    set points = pr.points + sub.payout
  from (
    select user_id, floor(sum(shares))::int as payout
    from public.bets
    where gen_market_id = p_id and outcome_label = v_label
    group by user_id
  ) sub
  where pr.id = sub.user_id;
end; $$;

grant execute on function public.place_gen_bet to authenticated;
grant execute on function public.create_generated_market to anon, authenticated;
grant execute on function public.resolve_generated_market to anon, authenticated;
