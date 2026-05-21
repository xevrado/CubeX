# CubeX Emergency Leaderboard Lockdown

Apply this immediately in Supabase SQL Editor, then deploy the app build in this repo.

## 1. Lock public writes

```sql
alter table public.scores enable row level security;

drop policy if exists "scores public read" on public.scores;
drop policy if exists "scores public insert" on public.scores;
drop policy if exists "scores public update" on public.scores;
drop policy if exists "scores public delete" on public.scores;
drop policy if exists "scores authenticated insert" on public.scores;
drop policy if exists "scores authenticated update" on public.scores;
drop policy if exists "scores authenticated delete" on public.scores;

revoke insert, update, delete on table public.scores from anon;
revoke insert, update, delete on table public.scores from authenticated;
grant select on table public.scores to anon;
grant select on table public.scores to authenticated;

create policy "scores public read"
on public.scores
for select
to anon, authenticated
using (true);
```

With RLS enabled and no write policies, public clients can read the leaderboard but cannot add, edit, or delete scores.

## 2. Remove the fake score

Adjust the name if needed:

```sql
update public.scores
set score = 0, best_score = 0
where lower(name) = lower('Emin');
```

Or remove the row completely:

```sql
delete from public.scores
where lower(name) = lower('Emin');
```

## 3. Important notes

- The Supabase `anon` key is allowed to be public, but only if RLS policies protect the tables.
- Never put the Supabase `service_role` key in GitHub, frontend JavaScript, APK assets, or any public file.
- Admin actions and verified score submission need a server-side endpoint or Supabase Edge Function. The browser cannot be trusted to prove a score is real.
