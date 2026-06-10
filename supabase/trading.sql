-- AutoVote · 交易（卖出/平仓）
-- 在 Supabase SQL Editor 整段执行。依赖 schema.sql / generated_markets.sql。

-- 给下注记录加平仓字段
alter table public.bets add column if not exists closed boolean not null default false;
alter table public.bets add column if not exists exit_price numeric;
alter table public.bets add column if not exists proceeds integer;
alter table public.bets add column if not exists closed_at timestamptz;

-- 卖出/平仓：按当前价兑现份额 → 加分 → 关闭（或部分减仓）
-- p_price：Polymarket 盘口由前端传当前概率；生成盘口忽略此值、用池子价并推动池子
-- p_fraction：1 = 全部平仓；0~1 = 部分减仓
create or replace function public.sell_bet(
  p_bet_id uuid, p_price numeric, p_fraction numeric default 1
) returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bet public.bets;
  v_profile public.profiles;
  v_mkt public.generated_markets;
  v_price numeric;
  v_sell_shares numeric;
  v_proceeds integer;
  v_full boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_fraction <= 0 or p_fraction > 1 then p_fraction := 1; end if;

  select * into v_bet from public.bets where id = p_bet_id and user_id = v_uid for update;
  if v_bet.id is null then raise exception 'bet not found'; end if;
  if v_bet.closed then raise exception 'already closed'; end if;

  v_sell_shares := v_bet.shares * p_fraction;
  v_full := p_fraction >= 0.999;

  if v_bet.gen_market_id is not null then
    -- 生成盘口：用池子当前价，并按成交额反向推动池子
    select * into v_mkt from public.generated_markets where id = v_bet.gen_market_id for update;
    if v_mkt.id is null then raise exception 'market not found'; end if;
    if v_mkt.status <> 'open' then raise exception 'market closed'; end if;
    v_price := case when v_bet.outcome_label = 'Yes'
      then v_mkt.pool_yes / (v_mkt.pool_yes + v_mkt.pool_no)
      else v_mkt.pool_no  / (v_mkt.pool_yes + v_mkt.pool_no) end;
    v_proceeds := floor(v_sell_shares * v_price);
    if v_bet.outcome_label = 'Yes' then
      update public.generated_markets set pool_yes = greatest(pool_yes - v_proceeds, 1) where id = v_mkt.id;
    else
      update public.generated_markets set pool_no = greatest(pool_no - v_proceeds, 1) where id = v_mkt.id;
    end if;
  else
    -- Polymarket 盘口：用前端传入的当前概率
    if p_price is null or p_price <= 0 or p_price > 1 then raise exception 'invalid price'; end if;
    v_price := p_price;
    v_proceeds := floor(v_sell_shares * v_price);
  end if;

  if v_full then
    update public.bets
      set closed = true, exit_price = v_price, proceeds = coalesce(proceeds, 0) + v_proceeds, closed_at = now()
      where id = p_bet_id;
  else
    -- 部分减仓：按比例减少份额与本金
    update public.bets
      set shares = shares - v_sell_shares,
          stake = greatest(round(stake * (1 - p_fraction))::int, 0)
      where id = p_bet_id;
  end if;

  update public.profiles set points = points + v_proceeds where id = v_uid returning * into v_profile;
  return v_profile;
end; $$;

grant execute on function public.sell_bet to authenticated;
