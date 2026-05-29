-- Alexandria — spreads table + panel page-side columns + backfill.
-- Migration 01 of the paged-format extension (spreads + page pairing only).
-- Safe to re-run: IF NOT EXISTS guards; backfill skips stories already processed.

-- ============================================================
-- 1. spreads: explicit, ordered turn unit
-- ============================================================
create table if not exists spreads (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid not null references stories(id) on delete cascade,
  position    integer not null,
  spread_type text not null default 'standard'
    check (spread_type in ('standard', 'full_bleed')),
  full_bleed_asset_id       uuid references assets(id) on delete set null,
  full_bleed_left_asset_id  uuid references assets(id) on delete set null,
  full_bleed_right_asset_id uuid references assets(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (story_id, position)
);

create index if not exists spreads_story_pos on spreads (story_id, position);

-- ============================================================
-- 2. panels: add spread link + page side (webtoon rows stay null)
-- ============================================================
alter table panels
  add column if not exists spread_id uuid references spreads(id) on delete cascade,
  add column if not exists page_side text
    check (page_side in ('left', 'right'));

create index if not exists panels_spread on panels (spread_id, page_side);

-- ============================================================
-- 3. RLS for spreads (mirrors panels policy: EXISTS through stories)
-- ============================================================
alter table spreads enable row level security;

drop policy if exists "Creators can manage their own spreads" on spreads;
create policy "Creators can manage their own spreads" on spreads
  for all
  using (
    exists (
      select 1 from public.stories s
      where s.id = spreads.story_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.stories s
      where s.id = spreads.story_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Public can read spreads of published stories" on spreads;
create policy "Public can read spreads of published stories" on spreads
  for select
  using (
    exists (
      select 1 from public.stories s
      where s.id = spreads.story_id
        and s.is_published = true
    )
  );

-- ============================================================
-- 4. Backfill: pair book-mode panels into spreads
--    Pairs panels by ascending position: (0,1)→spread 0, (2,3)→spread 1, …
--    Lone trailing panel (odd count) → left side of its spread, right is blank.
--    Idempotent: skips any book story that already has a panel with spread_id set.
-- ============================================================
do $$
declare
  story_rec     record;
  pair_rec      record;
  new_spread_id uuid;
begin
  for story_rec in
    select id from stories
    where reading_mode = 'book'
      and not exists (
        select 1 from panels p
        where p.story_id = stories.id
          and p.spread_id is not null
      )
  loop
    for pair_rec in
      with numbered as (
        select id,
               (row_number() over (order by position) - 1) as rn
        from panels
        where story_id = story_rec.id
      )
      select
        rn / 2                                        as spread_pos,
        max(case when rn % 2 = 0 then id end)         as left_id,
        max(case when rn % 2 = 1 then id end)         as right_id
      from numbered
      group by rn / 2
      order by spread_pos
    loop
      insert into spreads (story_id, position, spread_type)
      values (story_rec.id, pair_rec.spread_pos, 'standard')
      returning id into new_spread_id;

      update panels set spread_id = new_spread_id, page_side = 'left'
      where id = pair_rec.left_id;

      if pair_rec.right_id is not null then
        update panels set spread_id = new_spread_id, page_side = 'right'
        where id = pair_rec.right_id;
      end if;
    end loop;
  end loop;
end $$;
